export interface TaskContent {
	title: string;
	description?: string;
	priority?: "low" | "medium" | "high";
	assignee?: string;
	tags?: string[];
	estimate?: number;
}

export interface TaskRecord {
	id: string;
	parentId: string;
	position: number;
	content: TaskContent;
	origin: string;
	updatedAt: string;
}

export interface SnapshotMeta {
	schemaVersion: number;
	sourceStand: string;
	exportedAt: string;
	rowCount: number;
	sha256: string;
}

export const TASK_TRACKER_SCHEMA_VERSION = 1;

export const TASK_STATUSES = [
	{ id: "backlog", title: "Бэклог" },
	{ id: "todo", title: "К выполнению" },
	{ id: "in_progress", title: "В работе" },
	{ id: "review", title: "Ревью" },
	{ id: "done", title: "Готово" },
] as const;

export type TaskStatusId = (typeof TASK_STATUSES)[number]["id"];

export interface KanbanBoardItem {
	id: string;
	title: string;
	parentId: string | null;
	children: string[];
	totalChildrenCount: number;
	type?: string;
	content?: TaskContent;
	origin?: string;
}

export type KanbanBoardData = {
	root: KanbanBoardItem;
	[key: string]: KanbanBoardItem;
};
