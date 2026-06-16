export const KANBAN_BOARD_TASK_TYPES = [
    { id: "epic", title: "Эпик" },
    { id: "story", title: "История" },
    { id: "task", title: "Задача" },
    { id: "bug", title: "Баг" },
    { id: "subtask", title: "Подзадача" },
];
export const KANBAN_BOARD_WORK_TYPES = [
    { id: "architecture", title: "Архитектурная задача" },
    { id: "linear", title: "Линейная деятельность" },
    { id: "feature", title: "Новая функциональность" },
    { id: "support", title: "Сопровождение" },
    { id: "tech_debt", title: "Технический долг" },
];
export function kanbanBoardTaskTypeTitle(id) {
    return KANBAN_BOARD_TASK_TYPES.find((item) => item.id === id)?.title ?? id ?? "";
}
export function kanbanBoardWorkTypeTitle(id) {
    return KANBAN_BOARD_WORK_TYPES.find((item) => item.id === id)?.title ?? id ?? "";
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
];
export const KANBAN_BOARD_SCHEMA_VERSION = 1;
export const KANBAN_BOARD_STATUSES = [
    { id: "backlog", title: "Бэклог" },
    { id: "todo", title: "К выполнению" },
    { id: "in_progress", title: "В работе" },
    { id: "review", title: "Ревью" },
    { id: "done", title: "Готово" },
];
export const KANBAN_BOARD_COLUMN_COLORS = {
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
];
export function pickKanbanBoardColumnColor(sortOrder) {
    return KANBAN_BOARD_DEFAULT_COLUMN_COLORS[sortOrder % KANBAN_BOARD_DEFAULT_COLUMN_COLORS.length];
}
export function defaultKanbanBoardColumns(boardId) {
    return KANBAN_BOARD_STATUSES.map((status, sortOrder) => ({
        id: status.id,
        boardId,
        title: status.title,
        color: KANBAN_BOARD_COLUMN_COLORS[status.id],
        sortOrder,
    }));
}
/** @deprecated use KANBAN_BOARD_SCHEMA_VERSION */
export const TASK_TRACKER_SCHEMA_VERSION = KANBAN_BOARD_SCHEMA_VERSION;
/** @deprecated use KANBAN_BOARD_STATUSES */
export const TASK_STATUSES = KANBAN_BOARD_STATUSES;
