import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { ulid } from "ulid";
import { In, Repository } from "typeorm";
import {
	diffKanbanTaskChanges,
	formatKanbanBoardKey,
	formatKanbanTaskKey,
	KANBAN_BOARD_HISTORY_OVERVIEW_PREVIEW_LIMIT,
	KANBAN_BOARD_TASK_HISTORY_MAX_PER_TASK,
	kanbanBoardTaskHistorySnapshot,
	type KanbanBoardHistoryDto,
	type KanbanBoardHistoryOverviewDto,
	type KanbanBoardTaskChangeItem,
	type KanbanBoardTaskHistoryEntryDto,
	type KanbanBoardTaskHistorySnapshot,
} from "@smart-anketa/api-contract";
import { KanbanBoardTaskHistoryEntity } from "../entities/kanban-board-task-history.entity";
import { KanbanBoardEntity } from "../entities/kanban-board.entity";
import { KanbanBoardColumnEntity } from "../entities/kanban-board-column.entity";
import { KanbanBoardTaskEntity } from "../entities/kanban-board-task.entity";

@Injectable()
export class KanbanBoardHistoryService {
	constructor(
		@InjectRepository(KanbanBoardTaskHistoryEntity)
		private readonly historyRepository: Repository<KanbanBoardTaskHistoryEntity>,
		@InjectRepository(KanbanBoardEntity)
		private readonly boardRepository: Repository<KanbanBoardEntity>,
		@InjectRepository(KanbanBoardColumnEntity)
		private readonly columnRepository: Repository<KanbanBoardColumnEntity>,
	) {}

	snapshotFromTask(task: {
		parentId: string;
		position: number;
		boardId: string;
		createdBy?: string | null;
		content: KanbanBoardTaskEntity["content"];
	}): KanbanBoardTaskHistorySnapshot {
		return kanbanBoardTaskHistorySnapshot(task);
	}

	async logTaskChanges(input: {
		boardId: string;
		taskId: string;
		taskKey: string;
		taskTitle: string;
		changes: KanbanBoardTaskChangeItem[];
		createdBy?: string | null;
	}): Promise<void> {
		if (!input.changes.length) return;

		const entry = this.historyRepository.create({
			id: ulid(),
			boardId: input.boardId,
			taskId: input.taskId,
			taskKey: input.taskKey,
			taskTitle: input.taskTitle,
			changes: input.changes,
			createdBy: input.createdBy ?? null,
		});
		await this.historyRepository.save(entry);
		await this.trimTaskHistory(input.taskId);
	}

	async logTaskDiff(input: {
		boardId: string;
		taskId: string;
		taskKey: string;
		taskTitle: string;
		before: KanbanBoardTaskHistorySnapshot;
		after: KanbanBoardTaskHistorySnapshot;
		columnTitle?: (columnId: string) => string;
		createdBy?: string | null;
	}): Promise<void> {
		const changes = diffKanbanTaskChanges(input.before, input.after, {
			columnTitle: input.columnTitle,
		});
		await this.logTaskChanges({
			boardId: input.boardId,
			taskId: input.taskId,
			taskKey: input.taskKey,
			taskTitle: input.taskTitle,
			changes,
			createdBy: input.createdBy,
		});
	}

	private toEntryDto(row: KanbanBoardTaskHistoryEntity): KanbanBoardTaskHistoryEntryDto {
		return {
			id: row.id,
			boardId: row.boardId,
			taskId: row.taskId,
			taskKey: row.taskKey,
			taskTitle: row.taskTitle,
			changes: row.changes,
			createdAt: row.createdAt.toISOString(),
			createdBy: row.createdBy,
		};
	}

	async findTaskHistory(
		taskId: string,
	): Promise<KanbanBoardTaskHistoryEntryDto[]> {
		const rows = await this.historyRepository.find({
			where: { taskId },
			order: { createdAt: "DESC" },
		});
		return rows.map((row) => this.toEntryDto(row));
	}

	async findBoardHistory(boardId: string): Promise<KanbanBoardHistoryDto> {
		const board = await this.boardRepository.findOne({
			where: { id: boardId },
			relations: { project: true },
		});
		if (!board) {
			return {
				boardId,
				boardKey: "",
				boardName: "",
				days: [],
			};
		}

		const projectCode = board.project?.code ?? "";
		const boardKey = formatKanbanBoardKey(projectCode, board.slug);

		const rows = await this.historyRepository.find({
			where: { boardId },
			order: { createdAt: "DESC" },
		});

		const dayMap = new Map<string, KanbanBoardHistoryDto["days"][number]>();
		for (const row of rows) {
			const date = row.createdAt.toISOString().slice(0, 10);
			const group = dayMap.get(date) ?? { date, entries: [] };
			group.entries.push(this.toEntryDto(row));
			dayMap.set(date, group);
		}

		return {
			boardId,
			boardKey,
			boardName: board.name,
			days: [...dayMap.values()].sort((a, b) =>
				b.date < a.date ? 1 : b.date < a.date ? -1 : 0,
			),
		};
	}

	async findAllBoardsHistoryOverview(
		limitPerBoard = KANBAN_BOARD_HISTORY_OVERVIEW_PREVIEW_LIMIT,
	): Promise<KanbanBoardHistoryOverviewDto> {
		const boards = await this.boardRepository.find({
			relations: { project: true },
			order: { sortOrder: "ASC", name: "ASC" },
		});
		if (!boards.length) {
			return { previewLimit: limitPerBoard, boards: [] };
		}

		const boardIds = boards.map((board) => board.id);
		const rows = await this.historyRepository.find({
			where: { boardId: In(boardIds) },
			order: { createdAt: "DESC" },
		});

		const previewByBoard = new Map<string, KanbanBoardTaskHistoryEntryDto[]>();
		for (const row of rows) {
			const list = previewByBoard.get(row.boardId) ?? [];
			if (list.length >= limitPerBoard) continue;
			list.push(this.toEntryDto(row));
			previewByBoard.set(row.boardId, list);
		}

		const boardsWithPreview = boards
			.map((board) => {
				const projectCode = board.project?.code ?? "";
				const entries = previewByBoard.get(board.id) ?? [];
				return {
					boardId: board.id,
					boardKey: formatKanbanBoardKey(projectCode, board.slug),
					boardName: board.name,
					entries,
					latestAt: entries[0]?.createdAt ?? "",
				};
			})
			.filter((board) => board.entries.length > 0)
			.sort((a, b) =>
				a.latestAt < b.latestAt ? 1 : b.latestAt < a.latestAt ? -1 : 0,
			)
			.map(({ latestAt: _latestAt, ...board }) => board);

		return {
			previewLimit: limitPerBoard,
			boards: boardsWithPreview,
		};
	}

	async loadColumnTitleMap(boardIds: string[]): Promise<Map<string, string>> {
		if (!boardIds.length) return new Map();
		const columns = await this.columnRepository.find({
			where: { boardId: In(boardIds) },
		});
		return new Map(
			columns.map((column) => [
				`${column.boardId}:${column.id}`,
				column.title,
			]),
		);
	}

	columnTitleResolver(
		columnTitles: Map<string, string>,
		boardId: string,
	): (columnId: string) => string {
		return (columnId) =>
			columnTitles.get(`${boardId}:${columnId}`) ?? columnId;
	}

	formatTaskKey(
		task: Pick<KanbanBoardTaskEntity, "taskNumber"> & {
			board?: { project?: { code?: string } | null } | null;
			project?: { code?: string } | null;
		},
	): string {
		const projectCode =
			task.board?.project?.code ?? task.project?.code ?? "TASK";
		return formatKanbanTaskKey(projectCode, task.taskNumber);
	}

	private async trimTaskHistory(taskId: string): Promise<void> {
		const rows = await this.historyRepository.find({
			where: { taskId },
			order: { createdAt: "DESC" },
			select: ["id"],
		});
		const stale = rows
			.slice(KANBAN_BOARD_TASK_HISTORY_MAX_PER_TASK)
			.map((row) => row.id);
		if (!stale.length) return;
		await this.historyRepository.delete(stale);
	}
}
