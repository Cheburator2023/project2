export const KANBAN_BOARD_PRIORITIES = [
    { id: "high", title: "Высокий" },
    { id: "medium", title: "Средний" },
    { id: "low", title: "Низкий" },
    { id: "hold", title: "Холд" },
];
export const KANBAN_BOARD_ROLE_ESTIMATE_FIELDS = [
    { key: "analyst", title: "Аналитик" },
    { key: "developer", title: "Разработчик" },
    { key: "qa", title: "Тестировщик" },
    { key: "debug", title: "Отладка" },
    { key: "devops", title: "DevOps" },
    { key: "architect", title: "Архитектор" },
];
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
export const KANBAN_BOARD_ASSIGNEE_ROLES = [
    { id: "developer", title: "Разработчик", color: "#2563eb" },
    { id: "analyst", title: "Аналитик", color: "#7c3aed" },
    { id: "qa", title: "QA", color: "#059669" },
    { id: "devops", title: "DevOps", color: "#ea580c" },
    { id: "designer", title: "Дизайнер", color: "#db2777" },
    { id: "architect", title: "Архитектор", color: "#0891b2" },
    { id: "pm", title: "Менеджер", color: "#ca8a04" },
    { id: "lead", title: "Тимлид", color: "#4f46e5" },
];
export function kanbanBoardAssigneeRoleTitle(id) {
    return KANBAN_BOARD_ASSIGNEE_ROLES.find((item) => item.id === id)?.title ?? id ?? "";
}
export function kanbanBoardAssigneeRoleColor(id) {
    return (KANBAN_BOARD_ASSIGNEE_ROLES.find((item) => item.id === id)?.color ?? "#64748b");
}
export const KANBAN_BOARD_TASK_TYPE_COLORS = {
    epic: "#9333ea",
    story: "#2563eb",
    task: "#64748b",
    bug: "#dc2626",
    subtask: "#94a3b8",
};
export const KANBAN_BOARD_WORK_TYPE_COLORS = {
    architecture: "#0891b2",
    linear: "#64748b",
    feature: "#16a34a",
    support: "#ca8a04",
    tech_debt: "#ea580c",
};
export const KANBAN_BOARD_PRIORITY_COLORS = {
    low: "#16a34a",
    medium: "#ca8a04",
    high: "#dc2626",
    hold: "#78716c",
};
export function kanbanBoardPriorityTitle(id) {
    return KANBAN_BOARD_PRIORITIES.find((item) => item.id === id)?.title ?? id ?? "";
}
export function kanbanBoardTaskTypeColor(id) {
    if (!id)
        return "#64748b";
    return (KANBAN_BOARD_TASK_TYPE_COLORS[id] ?? "#64748b");
}
export function kanbanBoardWorkTypeColor(id) {
    if (!id)
        return "#64748b";
    return (KANBAN_BOARD_WORK_TYPE_COLORS[id] ?? "#64748b");
}
export function kanbanBoardPriorityColor(priority) {
    if (!priority)
        return "#64748b";
    return KANBAN_BOARD_PRIORITY_COLORS[priority] ?? "#64748b";
}
export const KANBAN_BOARD_DEFAULT_SPRINT_CAPACITY_PD = 9;
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
