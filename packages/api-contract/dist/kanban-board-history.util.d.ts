import type { KanbanBoardTaskChangeItem, KanbanBoardTaskContent, KanbanBoardTaskHistorySnapshot } from "./kanban-board.types";
export declare const KANBAN_BOARD_TASK_HISTORY_MAX_PER_TASK = 6;
/** Сколько последних изменений показывать на общей странице истории по доске. */
export declare const KANBAN_BOARD_HISTORY_OVERVIEW_PREVIEW_LIMIT = 4;
/** Человекочитаемое значение поля для истории изменений. */
export declare function formatKanbanBoardHistoryValue(value: unknown): string | null;
export declare function kanbanBoardTaskHistorySnapshot(input: {
    parentId: string;
    position: number;
    boardId: string;
    content: KanbanBoardTaskContent;
}): KanbanBoardTaskHistorySnapshot;
export declare function diffKanbanTaskChanges(before: KanbanBoardTaskHistorySnapshot, after: KanbanBoardTaskHistorySnapshot, labels?: {
    columnTitle?: (columnId: string) => string;
}): KanbanBoardTaskChangeItem[];
