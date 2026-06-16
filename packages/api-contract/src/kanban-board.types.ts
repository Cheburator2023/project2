export interface KanbanBoardTaskContent {
	title: string;
	description?: string;
	priority?: "low" | "medium" | "high";
	assignee?: string;
	tags?: string[];
	/** @deprecated use estimatePd */
	estimate?: number;
	taskType?: KanbanBoardTaskTypeId;
	workType?: KanbanBoardWorkTypeId;
	/** Оценка в человеко-днях */
	estimatePd?: number;
	/** YYYY-MM-DD */
	dueDate?: string;
	/** Родительская задача (ручной ввод) */
	parentTask?: string;
	sprintId?: string;
	streamCustomer?: string;
}

export const KANBAN_BOARD_TASK_TYPES = [
	{ id: "epic", title: "Эпик" },
	{ id: "story", title: "История" },
	{ id: "task", title: "Задача" },
	{ id: "bug", title: "Баг" },
	{ id: "subtask", title: "Подзадача" },
] as const;

export type KanbanBoardTaskTypeId = (typeof KANBAN_BOARD_TASK_TYPES)[number]["id"];

export const KANBAN_BOARD_WORK_TYPES = [
	{ id: "architecture", title: "Архитектурная задача" },
	{ id: "linear", title: "Линейная деятельность" },
	{ id: "feature", title: "Новая функциональность" },
	{ id: "support", title: "Сопровождение" },
	{ id: "tech_debt", title: "Технический долг" },
] as const;

export type KanbanBoardWorkTypeId = (typeof KANBAN_BOARD_WORK_TYPES)[number]["id"];

export function kanbanBoardTaskTypeTitle(
	id?: KanbanBoardTaskTypeId | string,
): string {
	return KANBAN_BOARD_TASK_TYPES.find((item) => item.id === id)?.title ?? id ?? "";
}

export function kanbanBoardWorkTypeTitle(
	id?: KanbanBoardWorkTypeId | string,
): string {
	return KANBAN_BOARD_WORK_TYPES.find((item) => item.id === id)?.title ?? id ?? "";
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
	taskTypeTitle: string;
	workTypeTitle: string;
	estimatePd?: number;
	dueDate?: string;
	parentTask?: string;
	sprintTitle?: string;
	streamCustomer?: string;
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

export interface KanbanBoardColumnDto {
	id: string;
	boardId: string;
	title: string;
	color: string;
	sortOrder: number;
	createdAt: string;
	updatedAt: string;
}

export interface CreateKanbanBoardColumnRequestDto {
	title: string;
	color?: string;
}

export interface UpdateKanbanBoardColumnRequestDto {
	title?: string;
	color?: string;
}

export interface KanbanBoardAssigneeDto {
	id: string;
	code: string;
	name: string;
	email: string | null;
	taskCount: number;
	createdAt: string;
	updatedAt: string;
}

export interface CreateKanbanBoardAssigneeRequestDto {
	code: string;
	name: string;
	email?: string | null;
}

export interface UpdateKanbanBoardAssigneeRequestDto {
	code?: string;
	name?: string;
	email?: string | null;
}

export interface KanbanBoardSupersprintDto {
	id: string;
	code: string;
	name: string;
	description: string | null;
	startDate: string;
	endDate: string | null;
	sprintCount: number;
	createdAt: string;
	updatedAt: string;
}

export interface CreateKanbanBoardSupersprintRequestDto {
	code: string;
	name: string;
	description?: string | null;
	startDate: string;
	endDate?: string | null;
}

export interface UpdateKanbanBoardSupersprintRequestDto {
	code?: string;
	name?: string;
	description?: string | null;
	startDate?: string;
	endDate?: string | null;
}

export interface KanbanBoardSprintDto {
	id: string;
	supersprintId: string | null;
	supersprintCode: string;
	supersprintName: string;
	code: string;
	name: string;
	description: string | null;
	startDate: string;
	endDate: string | null;
	taskCount: number;
	createdAt: string;
	updatedAt: string;
}

export interface CreateKanbanBoardSprintRequestDto {
	supersprintId?: string | null;
	code: string;
	name: string;
	description?: string | null;
	startDate: string;
	endDate?: string | null;
}

export interface UpdateKanbanBoardSprintRequestDto {
	supersprintId?: string | null;
	code?: string;
	name?: string;
	description?: string | null;
	startDate?: string;
	endDate?: string | null;
}

export interface KanbanBoardStreamDto {
	id: string;
	code: string;
	name: string;
	description: string | null;
	taskCount: number;
	createdAt: string;
	updatedAt: string;
}

export interface CreateKanbanBoardStreamRequestDto {
	code: string;
	name: string;
	description?: string | null;
}

export interface UpdateKanbanBoardStreamRequestDto {
	code?: string;
	name?: string;
	description?: string | null;
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

export const KANBAN_BOARD_DEFAULT_COLUMN_COLORS = [
	"#64748b",
	"#2563eb",
	"#d97706",
	"#7c3aed",
	"#16a34a",
	"#db2777",
	"#0891b2",
	"#ca8a04",
	"#4f46e5",
	"#059669",
] as const;

export function pickKanbanBoardColumnColor(sortOrder: number): string {
	return KANBAN_BOARD_DEFAULT_COLUMN_COLORS[
		sortOrder % KANBAN_BOARD_DEFAULT_COLUMN_COLORS.length
	];
}

export function defaultKanbanBoardColumns(
	boardId: string,
): Omit<KanbanBoardColumnDto, "createdAt" | "updatedAt">[] {
	return KANBAN_BOARD_STATUSES.map((status, sortOrder) => ({
		id: status.id,
		boardId,
		title: status.title,
		color: KANBAN_BOARD_COLUMN_COLORS[status.id],
		sortOrder,
	}));
}

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
