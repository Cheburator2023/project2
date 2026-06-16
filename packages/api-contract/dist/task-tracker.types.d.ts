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
export declare const TASK_TRACKER_SCHEMA_VERSION = 1;
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
