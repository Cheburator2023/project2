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

export const KANBAN_BOARD_SUBTASK_STATUSES = [
	{ id: "next_up", title: "Следующая" },
	{ id: "in_progress", title: "В работе" },
	{ id: "in_review", title: "На ревью" },
	{ id: "qa", title: "QA" },
	{ id: "done", title: "Готово" },
	{ id: "skipped", title: "Пропущена" },
] as const;

export type KanbanBoardSubtaskStatusId =
	(typeof KANBAN_BOARD_SUBTASK_STATUSES)[number]["id"];

export const KANBAN_BOARD_SUBTASK_STATUS_COLORS: Record<
	KanbanBoardSubtaskStatusId,
	string
> = {
	next_up: "#7c3aed",
	in_progress: "#2563eb",
	in_review: "#ca8a04",
	qa: "#0891b2",
	done: "#16a34a",
	skipped: "#64748b",
};

export function kanbanBoardSubtaskStatusTitle(
	id?: KanbanBoardSubtaskStatusId | string,
): string {
	return (
		KANBAN_BOARD_SUBTASK_STATUSES.find((item) => item.id === id)?.title ??
		id ??
		""
	);
}

export function kanbanBoardSubtaskStatusColor(
	status?: KanbanBoardSubtaskStatusId | string,
): string {
	if (!status) return "#64748b";
	return (
		KANBAN_BOARD_SUBTASK_STATUS_COLORS[status as KanbanBoardSubtaskStatusId] ??
		"#64748b"
	);
}

export function kanbanBoardSubtaskIsDone(
	item: Pick<KanbanBoardSubtaskItem, "status" | "done">,
): boolean {
	if (item.status) return item.status === "done";
	return Boolean(item.done);
}

export function kanbanBoardSubtaskDefaultStatus(): KanbanBoardSubtaskStatusId {
	return "next_up";
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
export const KANBAN_BOARD_TASK_IMAGE_MAX_FULL_BYTES = 2 * 1024 * 1024;

/** Срок хранения вложений у задач в колонке «Готово», дней. */
export const KANBAN_BOARD_TASK_IMAGE_DONE_RETENTION_DAYS = 7;

export const KANBAN_BOARD_DONE_COLUMN_ID = "done" as const;

export const KANBAN_BOARD_PRIORITIES = [
	{ id: "high", title: "Высокий" },
	{ id: "medium", title: "Средний" },
	{ id: "low", title: "Низкий" },
	{ id: "hold", title: "Холд" },
] as const;

export type KanbanBoardPriorityId =
	(typeof KANBAN_BOARD_PRIORITIES)[number]["id"];

export const KANBAN_BOARD_ROLE_ESTIMATE_FIELDS = [
	{ key: "analyst", title: "Аналитик" },
	{ key: "developer", title: "Разработчик" },
	{ key: "qa", title: "Тестировщик" },
	{ key: "debug", title: "Отладка" },
	{ key: "devops", title: "DevOps" },
	{ key: "architect", title: "Архитектор" },
] as const satisfies ReadonlyArray<{
	key: keyof KanbanBoardRoleEstimates;
	title: string;
}>;

export const KANBAN_BOARD_TASK_TYPES = [
	{ id: "epic", title: "Эпик" },
	{ id: "story", title: "История" },
	{ id: "task", title: "Задача" },
	{ id: "bug", title: "Баг" },
	{ id: "subtask", title: "Подзадача" },
] as const;

export type KanbanBoardTaskTypeId =
	(typeof KANBAN_BOARD_TASK_TYPES)[number]["id"];

export const KANBAN_BOARD_WORK_TYPES = [
	{ id: "architecture", title: "Архитектурная задача" },
	{ id: "linear", title: "Линейная деятельность" },
	{ id: "feature", title: "Новая функциональность" },
	{ id: "support", title: "Сопровождение" },
	{ id: "tech_debt", title: "Технический долг" },
] as const;

export type KanbanBoardWorkTypeId =
	(typeof KANBAN_BOARD_WORK_TYPES)[number]["id"];

export function kanbanBoardTaskTypeTitle(
	id?: KanbanBoardTaskTypeId | string,
): string {
	return (
		KANBAN_BOARD_TASK_TYPES.find((item) => item.id === id)?.title ?? id ?? ""
	);
}

export function kanbanBoardWorkTypeTitle(
	id?: KanbanBoardWorkTypeId | string,
): string {
	return (
		KANBAN_BOARD_WORK_TYPES.find((item) => item.id === id)?.title ?? id ?? ""
	);
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
] as const;

export type KanbanBoardAssigneeRoleId =
	(typeof KANBAN_BOARD_ASSIGNEE_ROLES)[number]["id"];

export function kanbanBoardAssigneeRoleTitle(
	id?: KanbanBoardAssigneeRoleId | string,
): string {
	return (
		KANBAN_BOARD_ASSIGNEE_ROLES.find((item) => item.id === id)?.title ??
		id ??
		""
	);
}

export function kanbanBoardAssigneeRoleColor(
	id?: KanbanBoardAssigneeRoleId | string,
): string {
	return (
		KANBAN_BOARD_ASSIGNEE_ROLES.find((item) => item.id === id)?.color ??
		"#64748b"
	);
}

export const KANBAN_BOARD_TASK_TYPE_COLORS: Record<
	KanbanBoardTaskTypeId,
	string
> = {
	epic: "#9333ea",
	story: "#2563eb",
	task: "#64748b",
	bug: "#dc2626",
	subtask: "#94a3b8",
};

export const KANBAN_BOARD_WORK_TYPE_COLORS: Record<
	KanbanBoardWorkTypeId,
	string
> = {
	architecture: "#0891b2",
	linear: "#64748b",
	feature: "#16a34a",
	support: "#ca8a04",
	tech_debt: "#ea580c",
};

export const KANBAN_BOARD_PRIORITY_COLORS: Record<
	KanbanBoardPriorityId,
	string
> = {
	low: "#16a34a",
	medium: "#ca8a04",
	high: "#dc2626",
	hold: "#78716c",
};

export function kanbanBoardPriorityTitle(
	id?: KanbanBoardPriorityId | string,
): string {
	return (
		KANBAN_BOARD_PRIORITIES.find((item) => item.id === id)?.title ?? id ?? ""
	);
}

export function kanbanBoardTaskTypeColor(
	id?: KanbanBoardTaskTypeId | string,
): string {
	if (!id) return "#64748b";
	return (
		KANBAN_BOARD_TASK_TYPE_COLORS[id as KanbanBoardTaskTypeId] ?? "#64748b"
	);
}

export function kanbanBoardWorkTypeColor(
	id?: KanbanBoardWorkTypeId | string,
): string {
	if (!id) return "#64748b";
	return (
		KANBAN_BOARD_WORK_TYPE_COLORS[id as KanbanBoardWorkTypeId] ?? "#64748b"
	);
}

export function kanbanBoardPriorityColor(
	priority?: KanbanBoardPriorityId | string,
): string {
	if (!priority) return "#64748b";
	return (
		KANBAN_BOARD_PRIORITY_COLORS[priority as KanbanBoardPriorityId] ?? "#64748b"
	);
}

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

export const KANBAN_BOARD_TASK_LOCK_TTL_MS = 2 * 60 * 1000;
export const KANBAN_BOARD_SYNC_POLL_INTERVAL_MS = 15_000;

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

export const KANBAN_BOARD_DEFAULT_SPRINT_CAPACITY_PD = 9;

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

export const KANBAN_BOARD_STOCK_CUSTOMERS = [
	{ code: "dadm", name: "ДАДМ" },
	{ code: "umrv", name: "УМРВ" },
	{ code: "ib", name: "ИБ" },
	{ code: "dpsis", name: "ДПСИС" },
] as const;

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
] as const;

/** Доска «Куча» — задачи без привязки к рабочей доске (импорт, черновики). */
export const KANBAN_BOARD_HEAP_BOARD_ID = "01J000000000000000000015";
export const KANBAN_BOARD_HEAP_BOARD_SLUG = "heap";

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

export const KANBAN_BOARD_SCHEMA_VERSION = 1;

export const KANBAN_BOARD_STATUSES = [
	{ id: "todo", title: "Сделать" },
	{ id: "input_buffer", title: "Входной буфер" },
	{ id: "analysis_wip", title: "Анализ запроса (В работе)" },
	{ id: "analysis_done", title: "Анализ запроса (Готово)" },
	{ id: "dev_wip", title: "Разработка (В работе)" },
	{ id: "dev_done", title: "Разработка (Готово)" },
	{ id: "review_wip", title: "Проверка (В работе)" },
	{ id: "review_done", title: "Проверка (Готово)" },
	{ id: "demo", title: "Демонстрация" },
	{ id: "done", title: "Готово" },
] as const;

export type KanbanBoardStatusId = (typeof KANBAN_BOARD_STATUSES)[number]["id"];

export const KANBAN_BOARD_INPUT_BUFFER_COLUMN_ID = "input_buffer" as const;

/** Соответствие устаревших id колонок новому заводскому набору. */
export const KANBAN_BOARD_LEGACY_COLUMN_ID_MAP: Record<
	string,
	KanbanBoardStatusId
> = {
	backlog: "input_buffer",
	todo: "todo",
	in_progress: "dev_wip",
	review: "review_wip",
	qa: "review_wip",
	demo_wip: "demo",
	demo_done: "demo",
	done_wip: "done",
	done: "done",
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
	"#ea580c",
	"#0d9488",
] as const;

export function pickKanbanBoardColumnColor(sortOrder: number): string {
	return KANBAN_BOARD_DEFAULT_COLUMN_COLORS[
		sortOrder % KANBAN_BOARD_DEFAULT_COLUMN_COLORS.length
	];
}

export const KANBAN_BOARD_COLUMN_COLORS = Object.fromEntries(
	KANBAN_BOARD_STATUSES.map((status, sortOrder) => [
		status.id,
		status.id === "done"
			? "#16a34a"
			: pickKanbanBoardColumnColor(sortOrder),
	]),
) as Record<KanbanBoardStatusId, string>;

export function defaultKanbanBoardColumns(
	boardId: string,
): Omit<KanbanBoardColumnDto, "createdAt" | "updatedAt">[] {
	return KANBAN_BOARD_STATUSES.map((status, sortOrder) => ({
		id: status.id,
		boardId,
		title: status.title,
		color: KANBAN_BOARD_COLUMN_COLORS[status.id],
		sortOrder,
	}));
}

export interface KanbanBoardColumnContent {
	color: string;
}

export type KanbanBoardNodeContent =
	| KanbanBoardTaskContent
	| KanbanBoardColumnContent;

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
export const TASK_TRACKER_SCHEMA_VERSION = KANBAN_BOARD_SCHEMA_VERSION;
/** @deprecated use KANBAN_BOARD_STATUSES */
export const TASK_STATUSES = KANBAN_BOARD_STATUSES;
/** @deprecated use KanbanBoardStatusId */
export type TaskStatusId = KanbanBoardStatusId;
