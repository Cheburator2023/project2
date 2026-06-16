export interface KanbanBoardTaskContent {
	title: string;
	description?: string;
	priority?: "low" | "medium" | "high";
	assignee?: string;
	tags?: string[];
	estimate?: number;
}

export interface KanbanBoardTaskRecord {
	id: string;
	boardId: string;
	parentId: string;
	position: number;
	content: KanbanBoardTaskContent;
	origin: string;
	updatedAt: string;
}

export interface KanbanBoardProjectDto {
	id: string;
	code: string;
	name: string;
	description: string | null;
	isStock: boolean;
	boardCount: number;
	createdAt: string;
	updatedAt: string;
}

export interface KanbanBoardBoardDto {
	id: string;
	projectId: string;
	projectCode: string;
	projectName: string;
	name: string;
	slug: string;
	description: string | null;
	sortOrder: number;
	taskCount: number;
	createdAt: string;
	updatedAt: string;
}

export interface KanbanBoardTaskRegistryDto extends KanbanBoardTaskRecord {
	projectCode: string;
	projectName: string;
	boardSlug: string;
	boardName: string;
	title: string;
	statusTitle: string;
}

export interface CreateKanbanBoardProjectRequestDto {
	code: string;
	name: string;
	description?: string | null;
}

export interface UpdateKanbanBoardProjectRequestDto {
	code?: string;
	name?: string;
	description?: string | null;
}

export interface CreateKanbanBoardBoardRequestDto {
	projectId: string;
	name: string;
	slug: string;
	description?: string | null;
	sortOrder?: number;
}

export interface UpdateKanbanBoardBoardRequestDto {
	projectId?: string;
	name?: string;
	slug?: string;
	description?: string | null;
	sortOrder?: number;
}

export interface CreateKanbanBoardTaskRequestDto {
	boardId: string;
	parentId: string;
	content: KanbanBoardTaskContent;
	position?: number;
}

export interface UpdateKanbanBoardTaskRequestDto {
	boardId?: string;
	parentId?: string;
	position?: number;
	content?: KanbanBoardTaskContent;
}

export const KANBAN_BOARD_STOCK_PROJECTS = [
	{ code: "sum", name: "SUM", description: "Стоковый проект SUM" },
	{ code: "sum-rm", name: "SUM-RM", description: "Стоковый проект SUM-RM" },
	{
		code: "data_lineage",
		name: "Data Lineage",
		description: "Стоковый проект Data Lineage",
	},
	{
		code: "smart_anketa",
		name: "Smart Anketa",
		description: "Стоковый проект Smart Anketa",
	},
] as const;

export interface KanbanBoardSnapshotMeta {
	schemaVersion: number;
	sourceStand: string;
	exportedAt: string;
	rowCount: number;
	sha256: string;
}

export const KANBAN_BOARD_SCHEMA_VERSION = 1;

export const KANBAN_BOARD_STATUSES = [
	{ id: "backlog", title: "Бэклог" },
	{ id: "todo", title: "К выполнению" },
	{ id: "in_progress", title: "В работе" },
	{ id: "review", title: "Ревью" },
	{ id: "done", title: "Готово" },
] as const;

export type KanbanBoardStatusId = (typeof KANBAN_BOARD_STATUSES)[number]["id"];

export const KANBAN_BOARD_COLUMN_COLORS: Record<KanbanBoardStatusId, string> = {
	backlog: "#64748b",
	todo: "#2563eb",
	in_progress: "#d97706",
	review: "#7c3aed",
	done: "#16a34a",
};

export interface KanbanBoardColumnContent {
	color: string;
}

export type KanbanBoardNodeContent =
	| KanbanBoardTaskContent
	| KanbanBoardColumnContent;

export interface KanbanBoardItem {
	id: string;
	title: string;
	parentId: string | null;
	children: string[];
	totalChildrenCount: number;
	type?: string;
	content?: KanbanBoardNodeContent;
	origin?: string;
}

export type KanbanBoardData = {
	root: KanbanBoardItem;
	[key: string]: KanbanBoardItem;
};

/** @deprecated use KanbanBoardTaskContent */
export type TaskContent = KanbanBoardTaskContent;
/** @deprecated use KanbanBoardTaskRecord */
export type TaskRecord = KanbanBoardTaskRecord;
/** @deprecated use KanbanBoardSnapshotMeta */
export type SnapshotMeta = KanbanBoardSnapshotMeta;
/** @deprecated use KANBAN_BOARD_SCHEMA_VERSION */
export const TASK_TRACKER_SCHEMA_VERSION = KANBAN_BOARD_SCHEMA_VERSION;
/** @deprecated use KANBAN_BOARD_STATUSES */
export const TASK_STATUSES = KANBAN_BOARD_STATUSES;
/** @deprecated use KanbanBoardStatusId */
export type TaskStatusId = KanbanBoardStatusId;
