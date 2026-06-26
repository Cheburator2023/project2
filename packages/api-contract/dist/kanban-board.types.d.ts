/** Оценка трудоёмкости по ролям, чд — как в таблице планирования менеджеров. */
export interface KanbanBoardRoleEstimates {
    analyst?: number;
    developer?: number;
    qa?: number;
    debug?: number;
    devops?: number;
    architect?: number;
}
export interface KanbanBoardTaskContent {
    title: string;
    description?: string;
    priority?: KanbanBoardPriorityId;
    /** № п/п в бэклоге (для родительских задач) */
    backlogNumber?: number;
    /** @deprecated use assignees */
    assignee?: string;
    assignees?: string[];
    /** Текущий исполнитель (кто ведёт задачу сейчас) */
    currentAssignee?: string;
    /** @deprecated роль берётся из справочника исполнителей */
    assigneeRole?: KanbanBoardAssigneeRoleId;
    tags?: string[];
    /** @deprecated use estimatePd */
    estimate?: number;
    taskType?: KanbanBoardTaskTypeId;
    workType?: KanbanBoardWorkTypeId;
    /** Оценка в человеко-днях (итог или ручной ввод) */
    estimatePd?: number;
    /** Детализация оценки по ролям; при сохранении сумма попадает в estimatePd */
    roleEstimates?: KanbanBoardRoleEstimates;
    /** YYYY-MM-DD или произвольная метка срока */
    dueDate?: string;
    /** Родительская задача (ручной ввод) */
    parentTask?: string;
    /** Заказчик (ручной ввод) */
    customer?: string;
    /** Ожидаемый результат спринта */
    sprintOutcome?: string;
    sprintId?: string;
    streamCustomer?: string;
}
export declare const KANBAN_BOARD_PRIORITIES: readonly [{
    readonly id: "high";
    readonly title: "Высокий";
}, {
    readonly id: "medium";
    readonly title: "Средний";
}, {
    readonly id: "low";
    readonly title: "Низкий";
}, {
    readonly id: "hold";
    readonly title: "Холд";
}];
export type KanbanBoardPriorityId = (typeof KANBAN_BOARD_PRIORITIES)[number]["id"];
export declare const KANBAN_BOARD_ROLE_ESTIMATE_FIELDS: readonly [{
    readonly key: "analyst";
    readonly title: "Аналитик";
}, {
    readonly key: "developer";
    readonly title: "Разработчик";
}, {
    readonly key: "qa";
    readonly title: "Тестировщик";
}, {
    readonly key: "debug";
    readonly title: "Отладка";
}, {
    readonly key: "devops";
    readonly title: "DevOps";
}, {
    readonly key: "architect";
    readonly title: "Архитектор";
}];
export declare const KANBAN_BOARD_TASK_TYPES: readonly [{
    readonly id: "epic";
    readonly title: "Эпик";
}, {
    readonly id: "story";
    readonly title: "История";
}, {
    readonly id: "task";
    readonly title: "Задача";
}, {
    readonly id: "bug";
    readonly title: "Баг";
}, {
    readonly id: "subtask";
    readonly title: "Подзадача";
}];
export type KanbanBoardTaskTypeId = (typeof KANBAN_BOARD_TASK_TYPES)[number]["id"];
export declare const KANBAN_BOARD_WORK_TYPES: readonly [{
    readonly id: "architecture";
    readonly title: "Архитектурная задача";
}, {
    readonly id: "linear";
    readonly title: "Линейная деятельность";
}, {
    readonly id: "feature";
    readonly title: "Новая функциональность";
}, {
    readonly id: "support";
    readonly title: "Сопровождение";
}, {
    readonly id: "tech_debt";
    readonly title: "Технический долг";
}];
export type KanbanBoardWorkTypeId = (typeof KANBAN_BOARD_WORK_TYPES)[number]["id"];
export declare function kanbanBoardTaskTypeTitle(id?: KanbanBoardTaskTypeId | string): string;
export declare function kanbanBoardWorkTypeTitle(id?: KanbanBoardWorkTypeId | string): string;
export declare const KANBAN_BOARD_ASSIGNEE_ROLES: readonly [{
    readonly id: "developer";
    readonly title: "Разработчик";
    readonly color: "#2563eb";
}, {
    readonly id: "analyst";
    readonly title: "Аналитик";
    readonly color: "#7c3aed";
}, {
    readonly id: "qa";
    readonly title: "QA";
    readonly color: "#059669";
}, {
    readonly id: "devops";
    readonly title: "DevOps";
    readonly color: "#ea580c";
}, {
    readonly id: "designer";
    readonly title: "Дизайнер";
    readonly color: "#db2777";
}, {
    readonly id: "architect";
    readonly title: "Архитектор";
    readonly color: "#0891b2";
}, {
    readonly id: "pm";
    readonly title: "Менеджер";
    readonly color: "#ca8a04";
}, {
    readonly id: "lead";
    readonly title: "Тимлид";
    readonly color: "#4f46e5";
}];
export type KanbanBoardAssigneeRoleId = (typeof KANBAN_BOARD_ASSIGNEE_ROLES)[number]["id"];
export declare function kanbanBoardAssigneeRoleTitle(id?: KanbanBoardAssigneeRoleId | string): string;
export declare function kanbanBoardAssigneeRoleColor(id?: KanbanBoardAssigneeRoleId | string): string;
export declare const KANBAN_BOARD_TASK_TYPE_COLORS: Record<KanbanBoardTaskTypeId, string>;
export declare const KANBAN_BOARD_WORK_TYPE_COLORS: Record<KanbanBoardWorkTypeId, string>;
export declare const KANBAN_BOARD_PRIORITY_COLORS: Record<KanbanBoardPriorityId, string>;
export declare function kanbanBoardPriorityTitle(id?: KanbanBoardPriorityId | string): string;
export declare function kanbanBoardTaskTypeColor(id?: KanbanBoardTaskTypeId | string): string;
export declare function kanbanBoardWorkTypeColor(id?: KanbanBoardWorkTypeId | string): string;
export declare function kanbanBoardPriorityColor(priority?: KanbanBoardPriorityId | string): string;
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
    assigneeTitle: string;
    assignees: string[];
    currentAssigneeTitle: string;
    assigneeRoles: KanbanBoardAssigneeRoleId[];
    assigneeRoleTitles: string[];
    /** @deprecated используйте assigneeRoleTitles */
    assigneeRoleTitle: string;
    backlogNumber?: number;
    priorityTitle?: string;
    sprintOutcome?: string;
    roleEstimates?: KanbanBoardRoleEstimates;
    effectiveEstimatePd?: number;
    estimatePd?: number;
    dueDate?: string;
    parentTask?: string;
    customer?: string;
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
export declare const KANBAN_BOARD_DEFAULT_SPRINT_CAPACITY_PD = 9;
export interface KanbanBoardSettingsDto {
    defaultSprintCapacityPd: number;
    updatedAt: string;
}
export interface UpdateKanbanBoardSettingsRequestDto {
    defaultSprintCapacityPd?: number;
}
export interface KanbanBoardAssigneeDto {
    id: string;
    code: string;
    name: string;
    email: string | null;
    role: KanbanBoardAssigneeRoleId | null;
    roleTitle: string;
    /** Индивидуальная ёмкость спринта, чд; null — используется значение по умолчанию */
    sprintCapacityPd: number | null;
    /** Ёмкость с учётом настройки по умолчанию */
    effectiveSprintCapacityPd: number;
    taskCount: number;
    createdAt: string;
    updatedAt: string;
}
export interface CreateKanbanBoardAssigneeRequestDto {
    code: string;
    name: string;
    email?: string | null;
    role?: KanbanBoardAssigneeRoleId | null;
    sprintCapacityPd?: number | null;
}
export interface UpdateKanbanBoardAssigneeRequestDto {
    code?: string;
    name?: string;
    email?: string | null;
    role?: KanbanBoardAssigneeRoleId | null;
    sprintCapacityPd?: number | null;
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
