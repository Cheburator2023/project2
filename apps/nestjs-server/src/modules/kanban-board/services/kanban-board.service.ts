import { Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import * as ExcelJS from "exceljs";
import { DataSource, Repository } from "typeorm";
import type { KanbanBoardTaskRecord } from "@smart-anketa/api-contract";
import {
	formatKanbanTaskKey,
	normalizeKanbanBoardTaskContent,
} from "@smart-anketa/api-contract";
import { KanbanBoardTaskEntity } from "../entities/kanban-board-task.entity";
import { KanbanBoardEntity } from "../entities/kanban-board.entity";
import { KanbanBoardHistoryService } from "./kanban-board-history.service";
import { KanbanBoardTaskImageService } from "./kanban-board-task-image.service";
import { KanbanBoardTaskCommentService } from "./kanban-board-task-comment.service";
import { KanbanBoardTaskLockService } from "./kanban-board-task-lock.service";
import type { KanbanBoardTaskLockHolder } from "./kanban-board-task-lock.service";
import {
	throwKanbanBoardTaskVersionConflicts,
} from "../utils/kanban-board-task-edit.util";
import type { KanbanBoardTaskConflictItemDto } from "@smart-anketa/api-contract";
import {
	isSnapshotWorkbook,
} from "../utils/kanban-board-planning-import.util";
import {
	assertSnapshotImportable,
	exportXlsx,
	importXlsx,
} from "../utils/kanban-board-snapshot.util";

export {
	SnapshotIntegrityError,
	SnapshotSchemaError,
} from "../utils/kanban-board-snapshot.util";

export class PlanningImportNotSupportedError extends Error {
	constructor() {
		super(
			"Импорт таблицы планирования доступен на странице «Все задачи». На доске поддерживается только снапшот XLSX.",
		);
		this.name = "PlanningImportNotSupportedError";
	}
}

@Injectable()
export class KanbanBoardService {
	private static readonly DEFAULT_BOARD_ID = "01J000000000000000000014";

	constructor(
		@InjectRepository(KanbanBoardTaskEntity)
		private readonly taskRepository: Repository<KanbanBoardTaskEntity>,
		@InjectRepository(KanbanBoardEntity)
		private readonly boardRepository: Repository<KanbanBoardEntity>,
		private readonly dataSource: DataSource,
		private readonly configService: ConfigService,
		private readonly historyService: KanbanBoardHistoryService,
		private readonly taskImageService: KanbanBoardTaskImageService,
		private readonly taskCommentService: KanbanBoardTaskCommentService,
		private readonly taskLockService: KanbanBoardTaskLockService,
	) {}

	getStandId(): string {
		return (
			this.configService.get<string>("KANBAN_BOARD_STAND_ID") ??
			this.configService.get<string>("TASK_TRACKER_STAND_ID") ??
			this.configService.get<string>("HOSTNAME") ??
			"local-dev"
		);
	}

	async findAll(): Promise<KanbanBoardTaskRecord[]> {
		const rows = await this.taskRepository.find({
			order: { parentId: "ASC", position: "ASC" },
		});
		return rows.map((row) => this.toRecord(row));
	}

	async findByBoard(boardId: string): Promise<KanbanBoardTaskRecord[]> {
		const rows = await this.taskRepository.find({
			where: { boardId },
			order: { parentId: "ASC", position: "ASC" },
		});
		await this.taskImageService.syncTasksContentImages(rows);
		const commentCounts = await this.taskCommentService.countByTaskIds(
			rows.map((row) => row.id),
		);
		return rows.map((row) => ({
			...this.toRecord(row),
			commentCount: commentCounts.get(row.id) ?? 0,
		}));
	}

	async findByStand(standId: string): Promise<KanbanBoardTaskRecord[]> {
		const rows = await this.taskRepository.find({
			where: { origin: standId },
			order: { parentId: "ASC", position: "ASC" },
		});
		return rows.map((row) => this.toRecord(row));
	}

	async saveBoardTasks(
		boardId: string,
		tasks: KanbanBoardTaskRecord[],
		createdBy?: string | null,
		options?: {
			expectedUpdatedAtByTaskId?: Record<string, string>;
			forceOverwrite?: boolean;
			lockHolderLabel?: string;
		},
	): Promise<KanbanBoardTaskRecord[]> {
		const standId = this.getStandId();
		const now = new Date().toISOString();
		const lockHolder: KanbanBoardTaskLockHolder | undefined =
			options?.lockHolderLabel?.trim()
				? {
						label: options.lockHolderLabel.trim(),
						userId: createdBy ?? null,
					}
				: undefined;
		const board = await this.boardRepository.findOne({
			where: { id: boardId },
			relations: { project: true },
		});
		const existing = await this.taskRepository.find({
			where: { boardId, origin: standId },
			relations: { board: { project: true }, project: true },
		});
		const existingById = new Map(existing.map((row) => [row.id, row]));

		const normalized = tasks.map((task) => {
			const prev = existingById.get(task.id);
			return {
				...task,
				boardId,
				origin: standId,
				createdAt: prev?.createdAt ?? task.createdAt ?? now,
				createdBy: prev
					? (prev.createdBy ?? null)
					: (task.createdBy?.trim() || null),
				updatedAt: now,
			};
		});
		const prepared = await this.ensureTaskIdentities(boardId, normalized);

		if (!options?.forceOverwrite && options?.expectedUpdatedAtByTaskId) {
			const conflicts: KanbanBoardTaskConflictItemDto[] = [];
			for (const task of prepared) {
				const prev = existingById.get(task.id);
				if (!prev) continue;
				const expected = options.expectedUpdatedAtByTaskId[task.id];
				if (!expected || expected === prev.updatedAt) continue;
				conflicts.push({
					taskId: task.id,
					taskKey: board?.project?.code
						? formatKanbanTaskKey(board.project.code, prev.taskNumber ?? 0)
						: task.id,
					taskTitle: prev.content.title,
					expectedUpdatedAt: expected,
					actualUpdatedAt: prev.updatedAt,
				});
			}
			if (conflicts.length) {
				throwKanbanBoardTaskVersionConflicts(conflicts);
			}
		}

		for (const task of prepared) {
			const prev = existingById.get(task.id);
			if (!prev) continue;
			await this.taskLockService.assertEditable(
				task.id,
				lockHolder,
				options?.forceOverwrite,
			);
		}

		const columnTitles = await this.historyService.loadColumnTitleMap([boardId]);
		const columnTitle = this.historyService.columnTitleResolver(
			columnTitles,
			boardId,
		);

		await this.dataSource.transaction(async (manager) => {
			const repo = manager.getRepository(KanbanBoardTaskEntity);
			const incoming = new Set(prepared.map((task) => task.id));
			const stale = existing.filter((row) => !incoming.has(row.id));
			if (stale.length) {
				await repo.remove(stale);
			}

			for (const task of prepared) {
				const prev = existingById.get(task.id);
				if (prev?.content) {
					task.content = normalizeKanbanBoardTaskContent({
						...prev.content,
						...task.content,
						...(task.content.images !== undefined
							? { images: task.content.images }
							: { images: prev.content.images }),
					});
				}
				await repo.save(this.fromRecord(task));
			}
		});

		for (const task of prepared) {
			const prev = existingById.get(task.id);
			const after = this.historyService.snapshotFromTask({
				parentId: task.parentId,
				position: task.position,
				boardId: task.boardId,
				content: task.content,
			});
			if (!prev) {
				const taskKey = board?.project?.code
					? formatKanbanTaskKey(board.project.code, task.taskNumber ?? 0)
					: task.id;
				await this.historyService.logTaskChanges({
					boardId,
					taskId: task.id,
					taskKey,
					taskTitle: task.content.title,
					changes: [
						{
							field: "created",
							label: "Создание",
							from: null,
							to: task.content.title,
						},
					],
					createdBy,
				});
				continue;
			}
			const before = this.historyService.snapshotFromTask(prev);
			await this.historyService.logTaskDiff({
				boardId,
				taskId: task.id,
				taskKey: this.historyService.formatTaskKey(prev),
				taskTitle: after.content.title,
				before,
				after,
				columnTitle,
				createdBy,
			});
		}

		for (const removed of existing.filter(
			(row) => !prepared.some((task) => task.id === row.id),
		)) {
			await this.historyService.logTaskChanges({
				boardId,
				taskId: removed.id,
				taskKey: this.historyService.formatTaskKey(removed),
				taskTitle: removed.content.title,
				changes: [
					{
						field: "deleted",
						label: "Удаление",
						from: removed.content.title,
						to: null,
					},
				],
				createdBy,
			});
		}

		return this.findByBoard(boardId);
	}

	async saveLocalTasks(
		tasks: KanbanBoardTaskRecord[],
	): Promise<KanbanBoardTaskRecord[]> {
		if (!tasks.length) return [];
		return this.saveBoardTasks(tasks[0].boardId, tasks);
	}

	async deleteTask(taskId: string): Promise<void> {
		const task = await this.taskRepository.findOne({ where: { id: taskId } });
		if (!task) throw new NotFoundException("Задача не найдена");
		await this.taskRepository.remove(task);
	}

	async deleteLocalTask(taskId: string): Promise<void> {
		const standId = this.getStandId();
		const task = await this.taskRepository.findOne({ where: { id: taskId } });
		if (!task || task.origin !== standId) {
			throw new Error("Задача не найдена или принадлежит другому стенду");
		}
		await this.taskRepository.remove(task);
	}

	async exportBoardSnapshot(boardId: string): Promise<Buffer> {
		const standId = this.getStandId();
		const rows = (await this.findByBoard(boardId)).filter(
			(task) => task.origin === standId,
		);
		return exportXlsx(rows, standId);
	}

	async exportSnapshot(): Promise<Buffer> {
		const standId = this.getStandId();
		const rows = await this.findByStand(standId);
		return exportXlsx(rows, standId);
	}

	async importBoardSnapshot(
		boardId: string,
		buf: Buffer,
	): Promise<{
		meta: Awaited<ReturnType<typeof importXlsx>>["meta"];
		tasks: KanbanBoardTaskRecord[];
		importFormat: "snapshot";
		warnings: string[];
	}> {
		const workbook = new ExcelJS.Workbook();
		await workbook.xlsx.load(buf);
		if (!isSnapshotWorkbook(workbook)) {
			throw new PlanningImportNotSupportedError();
		}

		const { meta, payload } = await importXlsx(buf);
		assertSnapshotImportable(meta, payload);
		const normalized = payload.map((task) => ({ ...task, boardId }));

		await this.replaceBoardTasksFromImport(boardId, meta.sourceStand, normalized);

		return {
			meta,
			tasks: await this.findByBoard(boardId),
			importFormat: "snapshot",
			warnings: [],
		};
	}

	async importSnapshot(buf: Buffer): Promise<{
		meta: Awaited<ReturnType<typeof importXlsx>>["meta"];
		tasks: KanbanBoardTaskRecord[];
		importFormat: "snapshot";
		warnings: string[];
	}> {
		const workbook = new ExcelJS.Workbook();
		await workbook.xlsx.load(buf);
		if (!isSnapshotWorkbook(workbook)) {
			throw new PlanningImportNotSupportedError();
		}

		const { meta, payload } = await importXlsx(buf);
		assertSnapshotImportable(meta, payload);

		const normalized = payload.map((task) => ({
			...task,
			boardId: task.boardId || KanbanBoardService.DEFAULT_BOARD_ID,
		}));

		await this.replaceStandTasksFromImport(meta.sourceStand, normalized);

		return {
			meta,
			tasks: await this.findAll(),
			importFormat: "snapshot",
			warnings: [],
		};
	}

	async replaceBoardTasksForImport(
		boardId: string,
		sourceStand: string,
		normalized: KanbanBoardTaskRecord[],
	): Promise<void> {
		await this.replaceBoardTasksFromImport(boardId, sourceStand, normalized);
	}

	private async replaceBoardTasksFromImport(
		boardId: string,
		sourceStand: string,
		normalized: KanbanBoardTaskRecord[],
	): Promise<void> {
		const prepared = await this.ensureTaskIdentities(boardId, normalized);
		await this.dataSource.transaction(async (manager) => {
			const repo = manager.getRepository(KanbanBoardTaskEntity);
			const incoming = new Set(prepared.map((task) => task.id));
			const existing = await repo.find({
				where: { boardId, origin: sourceStand },
			});
			const stale = existing.filter((row) => !incoming.has(row.id));
			if (stale.length) {
				await repo.remove(stale);
			}

			for (const task of prepared) {
				await repo.save(this.fromRecord(task));
			}
		});
	}

	private async replaceStandTasksFromImport(
		sourceStand: string,
		normalized: KanbanBoardTaskRecord[],
	): Promise<void> {
		await this.dataSource.transaction(async (manager) => {
			const repo = manager.getRepository(KanbanBoardTaskEntity);
			const incoming = new Set(normalized.map((task) => task.id));
			const existing = await repo.find({ where: { origin: sourceStand } });
			const stale = existing.filter((row) => !incoming.has(row.id));
			if (stale.length) {
				await repo.remove(stale);
			}

			for (const task of normalized) {
				await repo.save(this.fromRecord(task));
			}
		});
	}

	private toRecord(entity: KanbanBoardTaskEntity): KanbanBoardTaskRecord {
		return {
			id: entity.id,
			boardId: entity.boardId,
			projectId: entity.projectId,
			taskNumber: entity.taskNumber,
			parentId: entity.parentId,
			position: entity.position,
			content: entity.content,
			origin: entity.origin,
			createdAt: entity.createdAt ?? entity.updatedAt,
			createdBy: entity.createdBy ?? null,
			updatedAt: entity.updatedAt,
		};
	}

	private fromRecord(record: KanbanBoardTaskRecord): KanbanBoardTaskEntity {
		const entity = new KanbanBoardTaskEntity();
		entity.id = record.id;
		entity.boardId = record.boardId;
		entity.projectId = record.projectId ?? "";
		entity.taskNumber = record.taskNumber ?? 0;
		entity.parentId = record.parentId;
		entity.position = record.position;
		entity.content = record.content;
		entity.origin = record.origin;
		entity.createdAt = record.createdAt ?? record.updatedAt;
		entity.createdBy = record.createdBy ?? null;
		entity.updatedAt = record.updatedAt;
		return entity;
	}

	private async ensureTaskIdentities(
		boardId: string,
		tasks: KanbanBoardTaskRecord[],
	): Promise<KanbanBoardTaskRecord[]> {
		const board = await this.boardRepository.findOne({ where: { id: boardId } });
		if (!board) throw new NotFoundException("Доска не найдена");

		const existingRows = await this.taskRepository.find({
			where: { projectId: board.projectId },
			select: ["id", "taskNumber"],
		});
		const existingById = new Map(
			existingRows.map((row) => [row.id, row.taskNumber]),
		);
		let nextNumber = existingRows.reduce(
			(max, row) => Math.max(max, row.taskNumber),
			0,
		);

		return tasks.map((task) => {
			const preserved = existingById.get(task.id);
			if (preserved != null) {
				return {
					...task,
					boardId,
					projectId: board.projectId,
					taskNumber: preserved,
				};
			}
			if (task.taskNumber != null && task.projectId === board.projectId) {
				nextNumber = Math.max(nextNumber, task.taskNumber);
				return {
					...task,
					boardId,
					projectId: board.projectId,
				};
			}
			nextNumber += 1;
			return {
				...task,
				boardId,
				projectId: board.projectId,
				taskNumber: nextNumber,
			};
		});
	}
}
