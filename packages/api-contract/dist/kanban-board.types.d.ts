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
export declare const KANBAN_BOARD_STOCK_PROJECTS: readonly [{
    readonly code: "sum";
    readonly name: "SUM";
    readonly description: "Стоковый проект SUM";
}, {
    readonly code: "sum-rm";
    readonly name: "SUM-RM";
    readonly description: "Стоковый проект SUM-RM";
}, {
    readonly code: "data_lineage";
    readonly name: "Data Lineage";
    readonly description: "Стоковый проект Data Lineage";
}, {
    readonly code: "smart_anketa";
    readonly name: "Smart Anketa";
    readonly description: "Стоковый проект Smart Anketa";
}];
export interface KanbanBoardSnapshotMeta {
    schemaVersion: number;
    sourceStand: string;
    exportedAt: string;
    rowCount: number;
    sha256: string;
}
export declare const KANBAN_BOARD_SCHEMA_VERSION = 1;
export declare const KANBAN_BOARD_STATUSES: readonly [{
    readonly id: "backlog";
    readonly title: "Бэклог";
}, {
    readonly id: "todo";
    readonly title: "К выполнению";
}, {
    readonly id: "in_progress";
    readonly title: "В работе";
}, {
    readonly id: "review";
    readonly title: "Ревью";
}, {
    readonly id: "done";
    readonly title: "Готово";
}];
export type KanbanBoardStatusId = (typeof KANBAN_BOARD_STATUSES)[number]["id"];
export declare const KANBAN_BOARD_COLUMN_COLORS: Record<KanbanBoardStatusId, string>;
export declare const KANBAN_BOARD_DEFAULT_COLUMN_COLORS: readonly ["#64748b", "#2563eb", "#d97706", "#7c3aed", "#16a34a", "#db2777", "#0891b2", "#ca8a04", "#4f46e5", "#059669"];
export declare function pickKanbanBoardColumnColor(sortOrder: number): string;
export declare function defaultKanbanBoardColumns(boardId: string): Omit<KanbanBoardColumnDto, "createdAt" | "updatedAt">[];
export interface KanbanBoardColumnContent {
    color: string;
}
export type KanbanBoardNodeContent = KanbanBoardTaskContent | KanbanBoardColumnContent;
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
export declare const TASK_TRACKER_SCHEMA_VERSION = 1;
/** @deprecated use KANBAN_BOARD_STATUSES */
export declare const TASK_STATUSES: readonly [{
    readonly id: "backlog";
    readonly title: "Бэклог";
}, {
    readonly id: "todo";
    readonly title: "К выполнению";
}, {
    readonly id: "in_progress";
    readonly title: "В работе";
}, {
    readonly id: "review";
    readonly title: "Ревью";
}, {
    readonly id: "done";
    readonly title: "Готово";
}];
/** @deprecated use KanbanBoardStatusId */
export type TaskStatusId = KanbanBoardStatusId;
