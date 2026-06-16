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
/** @deprecated use KANBAN_BOARD_SCHEMA_VERSION */
export const TASK_TRACKER_SCHEMA_VERSION = KANBAN_BOARD_SCHEMA_VERSION;
/** @deprecated use KANBAN_BOARD_STATUSES */
export const TASK_STATUSES = KANBAN_BOARD_STATUSES;
