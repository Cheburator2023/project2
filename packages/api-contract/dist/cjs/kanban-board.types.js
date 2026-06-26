"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TASK_STATUSES = exports.TASK_TRACKER_SCHEMA_VERSION = exports.KANBAN_BOARD_DEFAULT_COLUMN_COLORS = exports.KANBAN_BOARD_COLUMN_COLORS = exports.KANBAN_BOARD_STATUSES = exports.KANBAN_BOARD_SCHEMA_VERSION = exports.KANBAN_BOARD_HEAP_BOARD_SLUG = exports.KANBAN_BOARD_HEAP_BOARD_ID = exports.KANBAN_BOARD_STOCK_PROJECTS = exports.KANBAN_BOARD_STOCK_CUSTOMERS = exports.KANBAN_BOARD_DEFAULT_SPRINT_CAPACITY_PD = exports.KANBAN_BOARD_PRIORITY_COLORS = exports.KANBAN_BOARD_WORK_TYPE_COLORS = exports.KANBAN_BOARD_TASK_TYPE_COLORS = exports.KANBAN_BOARD_ASSIGNEE_ROLES = exports.KANBAN_BOARD_WORK_TYPES = exports.KANBAN_BOARD_TASK_TYPES = exports.KANBAN_BOARD_ROLE_ESTIMATE_FIELDS = exports.KANBAN_BOARD_PRIORITIES = void 0;
exports.kanbanBoardTaskTypeTitle = kanbanBoardTaskTypeTitle;
exports.kanbanBoardWorkTypeTitle = kanbanBoardWorkTypeTitle;
exports.kanbanBoardAssigneeRoleTitle = kanbanBoardAssigneeRoleTitle;
exports.kanbanBoardAssigneeRoleColor = kanbanBoardAssigneeRoleColor;
exports.kanbanBoardPriorityTitle = kanbanBoardPriorityTitle;
exports.kanbanBoardTaskTypeColor = kanbanBoardTaskTypeColor;
exports.kanbanBoardWorkTypeColor = kanbanBoardWorkTypeColor;
exports.kanbanBoardPriorityColor = kanbanBoardPriorityColor;
exports.pickKanbanBoardColumnColor = pickKanbanBoardColumnColor;
exports.defaultKanbanBoardColumns = defaultKanbanBoardColumns;
exports.KANBAN_BOARD_PRIORITIES = [
    { id: "high", title: "Высокий" },
    { id: "medium", title: "Средний" },
    { id: "low", title: "Низкий" },
    { id: "hold", title: "Холд" },
];
exports.KANBAN_BOARD_ROLE_ESTIMATE_FIELDS = [
    { key: "analyst", title: "Аналитик" },
    { key: "developer", title: "Разработчик" },
    { key: "qa", title: "Тестировщик" },
    { key: "debug", title: "Отладка" },
    { key: "devops", title: "DevOps" },
    { key: "architect", title: "Архитектор" },
];
exports.KANBAN_BOARD_TASK_TYPES = [
    { id: "epic", title: "Эпик" },
    { id: "story", title: "История" },
    { id: "task", title: "Задача" },
    { id: "bug", title: "Баг" },
    { id: "subtask", title: "Подзадача" },
];
exports.KANBAN_BOARD_WORK_TYPES = [
    { id: "architecture", title: "Архитектурная задача" },
    { id: "linear", title: "Линейная деятельность" },
    { id: "feature", title: "Новая функциональность" },
    { id: "support", title: "Сопровождение" },
    { id: "tech_debt", title: "Технический долг" },
];
function kanbanBoardTaskTypeTitle(id) {
    return exports.KANBAN_BOARD_TASK_TYPES.find((item) => item.id === id)?.title ?? id ?? "";
}
function kanbanBoardWorkTypeTitle(id) {
    return exports.KANBAN_BOARD_WORK_TYPES.find((item) => item.id === id)?.title ?? id ?? "";
}
exports.KANBAN_BOARD_ASSIGNEE_ROLES = [
    { id: "developer", title: "Разработчик", color: "#2563eb" },
    { id: "analyst", title: "Аналитик", color: "#7c3aed" },
    { id: "qa", title: "QA", color: "#059669" },
    { id: "devops", title: "DevOps", color: "#ea580c" },
    { id: "designer", title: "Дизайнер", color: "#db2777" },
    { id: "architect", title: "Архитектор", color: "#0891b2" },
    { id: "pm", title: "Менеджер", color: "#ca8a04" },
    { id: "lead", title: "Тимлид", color: "#4f46e5" },
];
function kanbanBoardAssigneeRoleTitle(id) {
    return exports.KANBAN_BOARD_ASSIGNEE_ROLES.find((item) => item.id === id)?.title ?? id ?? "";
}
function kanbanBoardAssigneeRoleColor(id) {
    return (exports.KANBAN_BOARD_ASSIGNEE_ROLES.find((item) => item.id === id)?.color ?? "#64748b");
}
exports.KANBAN_BOARD_TASK_TYPE_COLORS = {
    epic: "#9333ea",
    story: "#2563eb",
    task: "#64748b",
    bug: "#dc2626",
    subtask: "#94a3b8",
};
exports.KANBAN_BOARD_WORK_TYPE_COLORS = {
    architecture: "#0891b2",
    linear: "#64748b",
    feature: "#16a34a",
    support: "#ca8a04",
    tech_debt: "#ea580c",
};
exports.KANBAN_BOARD_PRIORITY_COLORS = {
    low: "#16a34a",
    medium: "#ca8a04",
    high: "#dc2626",
    hold: "#78716c",
};
function kanbanBoardPriorityTitle(id) {
    return exports.KANBAN_BOARD_PRIORITIES.find((item) => item.id === id)?.title ?? id ?? "";
}
function kanbanBoardTaskTypeColor(id) {
    if (!id)
        return "#64748b";
    return (exports.KANBAN_BOARD_TASK_TYPE_COLORS[id] ?? "#64748b");
}
function kanbanBoardWorkTypeColor(id) {
    if (!id)
        return "#64748b";
    return (exports.KANBAN_BOARD_WORK_TYPE_COLORS[id] ?? "#64748b");
}
function kanbanBoardPriorityColor(priority) {
    if (!priority)
        return "#64748b";
    return exports.KANBAN_BOARD_PRIORITY_COLORS[priority] ?? "#64748b";
}
exports.KANBAN_BOARD_DEFAULT_SPRINT_CAPACITY_PD = 9;
exports.KANBAN_BOARD_STOCK_CUSTOMERS = [
    { code: "dadm", name: "ДАДМ" },
    { code: "umrv", name: "УМРВ" },
    { code: "ib", name: "ИБ" },
    { code: "dpsis", name: "ДПСИС" },
];
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
/** Доска «Куча» — задачи без привязки к рабочей доске (импорт, черновики). */
exports.KANBAN_BOARD_HEAP_BOARD_ID = "01J000000000000000000015";
exports.KANBAN_BOARD_HEAP_BOARD_SLUG = "heap";
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
