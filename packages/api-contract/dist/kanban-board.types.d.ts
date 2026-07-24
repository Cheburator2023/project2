/** Оценка трудоёмкости по ролям, чд — как в таблице планирования менеджеров. */
export interface KanbanBoardRoleEstimates {
    analyst?: number;
    developer?: number;
    qa?: number;
    debug?: number;
    devops?: number;
    architect?: number;
}
export interface KanbanBoardSubtaskItem {
    id: string;
    text: string;
    /** После normalize всегда задан; legacy-данные могут приходить только с done */
    status?: KanbanBoardSubtaskStatusId;
    /** @deprecated используйте status === "done" */
    done?: boolean;
}
export declare const KANBAN_BOARD_SUBTASK_STATUSES: readonly [{
    readonly id: "next_up";
    readonly title: "Следующая";
}, {
    readonly id: "in_progress";
    readonly title: "В работе";
}, {
    readonly id: "in_review";
    readonly title: "На ревью";
}, {
    readonly id: "qa";
    readonly title: "QA";
}, {
    readonly id: "done";
    readonly title: "Готово";
}, {
    readonly id: "skipped";
    readonly title: "Пропущена";
}];
export type KanbanBoardSubtaskStatusId = (typeof KANBAN_BOARD_SUBTASK_STATUSES)[number]["id"];
export declare const KANBAN_BOARD_SUBTASK_STATUS_COLORS: Record<KanbanBoardSubtaskStatusId, string>;
export declare function kanbanBoardSubtaskStatusTitle(id?: KanbanBoardSubtaskStatusId | string): string;
export declare function kanbanBoardSubtaskStatusColor(status?: KanbanBoardSubtaskStatusId | string): string;
export declare function kanbanBoardSubtaskIsDone(item: Pick<KanbanBoardSubtaskItem, "status" | "done">): boolean;
export declare function kanbanBoardSubtaskDefaultStatus(): KanbanBoardSubtaskStatusId;
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
    /** Чеклист подзадач внутри карточки */
    subtasks?: KanbanBoardSubtaskItem[];
    /** Прикреплённые изображения (метаданные; файлы — отдельное хранилище) */
    images?: KanbanBoardTaskImageRef[];
}
/** Метаданные изображения в content задачи */
export interface KanbanBoardTaskImageRef {
    id: string;
    name: string;
    width: number;
    height: number;
    fullByteSize: number;
    thumbByteSize: number;
    createdAt: string;
}
export type KanbanBoardTaskImageDto = KanbanBoardTaskImageRef;
/** Макс. размер full-изображения после сжатия на клиенте, байт. */
export declare const KANBAN_BOARD_TASK_IMAGE_MAX_FULL_BYTES: number;
/** Срок хранения вложений у задач в колонке «Готово», дней. */
export declare const KANBAN_BOARD_TASK_IMAGE_DONE_RETENTION_DAYS = 7;
export declare const KANBAN_BOARD_DONE_COLUMN_ID: "done";
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
    /** Заполняется сервером; при сохранении доски может отсутствовать у новых карточек. */
    projectId?: string;
    /** Номер задачи в рамках проекта (ключ PROJECT-N); выдаётся сервером. */
    taskNumber?: number;
    parentId: string;
    position: number;
    content: KanbanBoardTaskContent;
    origin: string;
    /** ISO; при отсутствии у старых записей сервер подставляет updatedAt. */
    createdAt?: string;
    /** Имя исполнителя из настроек трекера («Я — исполнитель»). */
    createdBy?: string | null;
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
    /** Читаемый ключ доски для URL (/tracker/board/…). */
    boardKey: string;
    name: string;
    slug: string;
    description: string | null;
    sortOrder: number;
    taskCount: number;
    createdAt: string;
    /** Имя из настроек трекера («Я — исполнитель»). */
    createdBy: string | null;
    updatedAt: string;
}
export interface KanbanBoardTaskRegistryDto extends KanbanBoardTaskRecord {
    projectId: string;
    taskNumber: number;
    projectCode: string;
    projectName: string;
    /** Читаемый ключ задачи для URL (/tracker/task/…). */
    taskKey: string;
    boardSlug: string;
    boardName: string;
    boardKey: string;
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
    /** Имя из настроек трекера («Я — исполнитель»). */
    createdBy?: string | null;
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
    /** Имя из настроек трекера («Я — исполнитель»), как authorName у комментариев. */
    createdBy?: string | null;
}
export interface UpdateKanbanBoardTaskRequestDto {
    boardId?: string;
    parentId?: string;
    position?: number;
    content?: KanbanBoardTaskContent;
    /** Версия задачи на клиенте; при расхождении — 409, если не forceOverwrite */
    expectedUpdatedAt?: string;
    forceOverwrite?: boolean;
    /** Подпись редактора для проверки soft-lock (имя исполнителя из настроек) */
    lockHolderLabel?: string;
}
export interface SaveKanbanBoardTasksRequestDto {
    tasks: KanbanBoardTaskRecord[];
    /** taskId → updatedAt на момент начала правки */
    expectedUpdatedAtByTaskId?: Record<string, string>;
    forceOverwrite?: boolean;
    lockHolderLabel?: string;
}
export declare const KANBAN_BOARD_TASK_LOCK_TTL_MS: number;
export declare const KANBAN_BOARD_SYNC_POLL_INTERVAL_MS = 15000;
export interface KanbanBoardTaskLockDto {
    taskId: string;
    lockedByLabel: string;
    lockedByUserId: string | null;
    expiresAt: string;
}
export interface AcquireKanbanBoardTaskLockRequestDto {
    lockedByLabel: string;
}
export interface KanbanBoardTaskConflictItemDto {
    taskId: string;
    taskKey?: string;
    taskTitle?: string;
    expectedUpdatedAt: string;
    actualUpdatedAt: string;
}
export type KanbanBoardTaskEditBlockReason = "version" | "lock";
export interface KanbanBoardTaskEditBlockedErrorDto {
    message: string;
    reason: KanbanBoardTaskEditBlockReason;
    conflicts?: KanbanBoardTaskConflictItemDto[];
    lock?: KanbanBoardTaskLockDto;
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
    /** Имя исполнителя, от лица которого пишутся комментарии (пока без ролевой модели) */
    defaultCurrentUserAssigneeName: string | null;
    updatedAt: string;
}
export interface UpdateKanbanBoardSettingsRequestDto {
    defaultSprintCapacityPd?: number;
    defaultCurrentUserAssigneeName?: string | null;
}
export interface KanbanBoardTaskCommentDto {
    id: string;
    taskId: string;
    body: string;
    authorName: string;
    createdAt: string;
}
export interface CreateKanbanBoardTaskCommentRequestDto {
    body: string;
    authorName: string;
}
export interface ResetKanbanBoardColumnsResultDto {
    boardCount: number;
    movedTaskCount: number;
    boards: Array<{
        boardId: string;
        boardName: string;
        columnCount: number;
    }>;
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
export interface KanbanBoardCustomerDto {
    id: string;
    code: string;
    name: string;
    description: string | null;
    taskCount: number;
    createdAt: string;
    updatedAt: string;
}
export interface CreateKanbanBoardCustomerRequestDto {
    code: string;
    name: string;
    description?: string | null;
}
export interface UpdateKanbanBoardCustomerRequestDto {
    code?: string;
    name?: string;
    description?: string | null;
}
export declare const KANBAN_BOARD_STOCK_CUSTOMERS: readonly [{
    readonly code: "dadm";
    readonly name: "ДАДМ";
}, {
    readonly code: "umrv";
    readonly name: "УМРВ";
}, {
    readonly code: "ib";
    readonly name: "ИБ";
}, {
    readonly code: "dpsis";
    readonly name: "ДПСИС";
}];
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
/** Доска «Куча» — задачи без привязки к рабочей доске (импорт, черновики). */
export declare const KANBAN_BOARD_HEAP_BOARD_ID = "01J000000000000000000015";
export declare const KANBAN_BOARD_HEAP_BOARD_SLUG = "heap";
export interface AssignKanbanBoardTasksToBoardRequestDto {
    taskIds: string[];
    boardId: string;
}
export interface AssignKanbanBoardTasksToBoardResultDto {
    boardId: string;
    updatedCount: number;
    skippedCount: number;
}
export interface KanbanBoardPlanningImportResultDto {
    meta: KanbanBoardSnapshotMeta;
    importFormat: "planning";
    warnings: string[];
    importedCount: number;
}
export interface KanbanBoardSnapshotMeta {
    schemaVersion: number;
    sourceStand: string;
    exportedAt: string;
    rowCount: number;
    sha256: string;
}
export declare const KANBAN_BOARD_SCHEMA_VERSION = 1;
export declare const KANBAN_BOARD_STATUSES: readonly [{
    readonly id: "todo";
    readonly title: "Сделать";
}, {
    readonly id: "input_buffer";
    readonly title: "Входной буфер";
}, {
    readonly id: "analysis_wip";
    readonly title: "Анализ запроса (В работе)";
}, {
    readonly id: "analysis_done";
    readonly title: "Анализ запроса (Готово)";
}, {
    readonly id: "dev_wip";
    readonly title: "Разработка (В работе)";
}, {
    readonly id: "dev_done";
    readonly title: "Разработка (Готово)";
}, {
    readonly id: "review_wip";
    readonly title: "Проверка (В работе)";
}, {
    readonly id: "review_done";
    readonly title: "Проверка (Готово)";
}, {
    readonly id: "demo";
    readonly title: "Демонстрация";
}, {
    readonly id: "done";
    readonly title: "Готово";
}];
export type KanbanBoardStatusId = (typeof KANBAN_BOARD_STATUSES)[number]["id"];
export declare const KANBAN_BOARD_INPUT_BUFFER_COLUMN_ID: "input_buffer";
/** Соответствие устаревших id колонок новому заводскому набору. */
export declare const KANBAN_BOARD_LEGACY_COLUMN_ID_MAP: Record<string, KanbanBoardStatusId>;
export declare const KANBAN_BOARD_DEFAULT_COLUMN_COLORS: readonly ["#64748b", "#2563eb", "#d97706", "#7c3aed", "#16a34a", "#db2777", "#0891b2", "#ca8a04", "#4f46e5", "#059669", "#ea580c", "#0d9488"];
export declare function pickKanbanBoardColumnColor(sortOrder: number): string;
export declare const KANBAN_BOARD_COLUMN_COLORS: Record<KanbanBoardStatusId, string>;
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
    createdAt?: string;
    createdBy?: string | null;
    /** Версия задачи для optimistic locking на доске */
    updatedAt?: string;
}
export type KanbanBoardData = {
    root: KanbanBoardItem;
    [key: string]: KanbanBoardItem;
};
/** Снимок задачи для сравнения в истории изменений. */
export interface KanbanBoardTaskHistorySnapshot {
    parentId: string;
    position: number;
    boardId: string;
    content: KanbanBoardTaskContent;
}
export interface KanbanBoardTaskChangeItem {
    field: string;
    label: string;
    from: string | null;
    to: string | null;
}
export interface KanbanBoardTaskHistoryEntryDto {
    id: string;
    boardId: string;
    taskId: string;
    taskKey: string;
    taskTitle: string;
    changes: KanbanBoardTaskChangeItem[];
    createdAt: string;
    createdBy: string | null;
}
export interface KanbanBoardHistoryDayGroupDto {
    date: string;
    entries: KanbanBoardTaskHistoryEntryDto[];
}
export interface KanbanBoardHistoryDto {
    boardId: string;
    boardKey: string;
    boardName: string;
    days: KanbanBoardHistoryDayGroupDto[];
}
export interface KanbanBoardHistoryPreviewDto {
    boardId: string;
    boardKey: string;
    boardName: string;
    entries: KanbanBoardTaskHistoryEntryDto[];
}
export interface KanbanBoardHistoryOverviewDto {
    previewLimit: number;
    boards: KanbanBoardHistoryPreviewDto[];
}
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
    readonly id: "todo";
    readonly title: "Сделать";
}, {
    readonly id: "input_buffer";
    readonly title: "Входной буфер";
}, {
    readonly id: "analysis_wip";
    readonly title: "Анализ запроса (В работе)";
}, {
    readonly id: "analysis_done";
    readonly title: "Анализ запроса (Готово)";
}, {
    readonly id: "dev_wip";
    readonly title: "Разработка (В работе)";
}, {
    readonly id: "dev_done";
    readonly title: "Разработка (Готово)";
}, {
    readonly id: "review_wip";
    readonly title: "Проверка (В работе)";
}, {
    readonly id: "review_done";
    readonly title: "Проверка (Готово)";
}, {
    readonly id: "demo";
    readonly title: "Демонстрация";
}, {
    readonly id: "done";
    readonly title: "Готово";
}];
/** @deprecated use KanbanBoardStatusId */
export type TaskStatusId = KanbanBoardStatusId;
