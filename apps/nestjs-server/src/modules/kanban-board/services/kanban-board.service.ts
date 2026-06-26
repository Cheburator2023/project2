import { Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";
import type { KanbanBoardTaskRecord } from "@smart-anketa/api-contract";
import { KanbanBoardTaskEntity } from "../entities/kanban-board-task.entity";
import {
	assertSnapshotImportable,
	exportXlsx,
	importXlsx,
} from "../utils/kanban-board-snapshot.util";

export {
	SnapshotIntegrityError,
	SnapshotSchemaError,
} from "../utils/kanban-board-snapshot.util";

@Injectable()
export class KanbanBoardService {
	private static readonly DEFAULT_BOARD_ID = "01J000000000000000000014";

	constructor(
		@InjectRepository(KanbanBoardTaskEntity)
		private readonly taskRepository: Repository<KanbanBoardTaskEntity>,
		private readonly dataSource: DataSource,
		private readonly configService: ConfigService,
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
		return rows.map((row) => this.toRecord(row));
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
	): Promise<KanbanBoardTaskRecord[]> {
		const standId = this.getStandId();
		const now = new Date().toISOString();
		const normalized = tasks.map((task) => ({
			...task,
			boardId,
			origin: standId,
			updatedAt: now,
		}));

		await this.dataSource.transaction(async (manager) => {
			const repo = manager.getRepository(KanbanBoardTaskEntity);
			const incoming = new Set(normalized.map((task) => task.id));
			const existing = await repo.find({
				where: { boardId, origin: standId },
			});
			const stale = existing.filter((row) => !incoming.has(row.id));
			if (stale.length) {
				await repo.remove(stale);
			}

			for (const task of normalized) {
				await repo.save(this.fromRecord(task));
			}
		});

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
	}> {
		const { meta, payload } = await importXlsx(buf);
		assertSnapshotImportable(meta, payload);

		const normalized = payload.map((task) => ({ ...task, boardId }));

		await this.dataSource.transaction(async (manager) => {
			const repo = manager.getRepository(KanbanBoardTaskEntity);
			const incoming = new Set(normalized.map((task) => task.id));
			const existing = await repo.find({
				where: { boardId, origin: meta.sourceStand },
			});
			const stale = existing.filter((row) => !incoming.has(row.id));
			if (stale.length) {
				await repo.remove(stale);
			}

			for (const task of normalized) {
				await repo.save(this.fromRecord(task));
			}
		});

		return { meta, tasks: await this.findByBoard(boardId) };
	}

	async importSnapshot(buf: Buffer): Promise<{
		meta: Awaited<ReturnType<typeof importXlsx>>["meta"];
		tasks: KanbanBoardTaskRecord[];
	}> {
		const { meta, payload } = await importXlsx(buf);
		assertSnapshotImportable(meta, payload);

		await this.dataSource.transaction(async (manager) => {
			const repo = manager.getRepository(KanbanBoardTaskEntity);
			const incoming = new Set(payload.map((task) => task.id));
			const existing = await repo.find({ where: { origin: meta.sourceStand } });
			const stale = existing.filter((row) => !incoming.has(row.id));
			if (stale.length) {
				await repo.remove(stale);
			}

			for (const task of payload) {
				await repo.save(
					this.fromRecord({
						...task,
						boardId: task.boardId || KanbanBoardService.DEFAULT_BOARD_ID,
					}),
				);
			}
		});

		return { meta, tasks: await this.findAll() };
	}

	private toRecord(entity: KanbanBoardTaskEntity): KanbanBoardTaskRecord {
		return {
			id: entity.id,
			boardId: entity.boardId,
			parentId: entity.parentId,
			position: entity.position,
			content: entity.content,
			origin: entity.origin,
			updatedAt: entity.updatedAt,
		};
	}

	private fromRecord(record: KanbanBoardTaskRecord): KanbanBoardTaskEntity {
		const entity = new KanbanBoardTaskEntity();
		entity.id = record.id;
		entity.boardId = record.boardId;
		entity.parentId = record.parentId;
		entity.position = record.position;
		entity.content = record.content;
		entity.origin = record.origin;
		entity.updatedAt = record.updatedAt;
		return entity;
	}
}
