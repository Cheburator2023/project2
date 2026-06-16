"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TASK_STATUSES = exports.TASK_TRACKER_SCHEMA_VERSION = exports.KANBAN_BOARD_DEFAULT_COLUMN_COLORS = exports.KANBAN_BOARD_COLUMN_COLORS = exports.KANBAN_BOARD_STATUSES = exports.KANBAN_BOARD_SCHEMA_VERSION = exports.KANBAN_BOARD_STOCK_PROJECTS = void 0;
exports.pickKanbanBoardColumnColor = pickKanbanBoardColumnColor;
exports.defaultKanbanBoardColumns = defaultKanbanBoardColumns;
exports.KANBAN_BOARD_STOCK_PROJECTS = [
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
exports.KANBAN_BOARD_SCHEMA_VERSION = 1;
exports.KANBAN_BOARD_STATUSES = [
    { id: "backlog", title: "Бэклог" },
    { id: "todo", title: "К выполнению" },
    { id: "in_progress", title: "В работе" },
    { id: "review", title: "Ревью" },
    { id: "done", title: "Готово" },
];
exports.KANBAN_BOARD_COLUMN_COLORS = {
    backlog: "#64748b",
    todo: "#2563eb",
    in_progress: "#d97706",
    review: "#7c3aed",
    done: "#16a34a",
};
exports.KANBAN_BOARD_DEFAULT_COLUMN_COLORS = [
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
function pickKanbanBoardColumnColor(sortOrder) {
    return exports.KANBAN_BOARD_DEFAULT_COLUMN_COLORS[sortOrder % exports.KANBAN_BOARD_DEFAULT_COLUMN_COLORS.length];
}
function defaultKanbanBoardColumns(boardId) {
    return exports.KANBAN_BOARD_STATUSES.map((status, sortOrder) => ({
        id: status.id,
        boardId,
        title: status.title,
        color: exports.KANBAN_BOARD_COLUMN_COLORS[status.id],
        sortOrder,
    }));
}
/** @deprecated use KANBAN_BOARD_SCHEMA_VERSION */
exports.TASK_TRACKER_SCHEMA_VERSION = exports.KANBAN_BOARD_SCHEMA_VERSION;
/** @deprecated use KANBAN_BOARD_STATUSES */
exports.TASK_STATUSES = exports.KANBAN_BOARD_STATUSES;
