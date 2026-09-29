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
	/** Картинки этой подзадачи (те же blob, что у задачи; не дублируются в content.images) */
	images?: KanbanBoardTaskImageRef[];
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
	/** Связи с другими задачами (тип + id), двусторонние */
	relatedLinks?: KanbanBoardRelatedTaskLink[];
	/**
	 * @deprecated используйте relatedLinks
	 * Старые записи: список id без типа (нормализуется в relatedLinks).
	 */
	relatedTaskIds?: string[];
	/** Заказчик (ручной ввод) */
	customer?: string;
	/**
	 * @deprecated Перенесено в description миграцией
	 * MergeKanbanSprintOutcomeIntoDescription. Оставлено для чтения старых данных/истории.
	 */
	sprintOutcome?: string;
	sprintId?: string;
	streamCustomer?: string;
	/** Чеклист подзадач внутри карточки */
	subtasks?: KanbanBoardSubtaskItem[];
	/** Прикреплённые изображения (метаданные; файлы — отдельное хранилище) */
	images?: KanbanBoardTaskImageRef[];
	/** Офисные/прочие вложения (скачивание без превью) */
	files?: KanbanBoardTaskFileRef[];
	/**
	 * Целевые стенды задачи (dev SUMCORE / dev SUMD / ИФТ / пре-прод / прод).
	 * Не путать с `origin` записи (изоляция данных между стендами БД).
	 * @deprecated use stands
	 */
	stand?: KanbanBoardStandId;
	stands?: KanbanBoardStandId[];
	/** @deprecated use systems */
	system?: KanbanBoardSystemId;
	/** Системы / приложения, к которым относится задача. */
	systems?: KanbanBoardSystemId[];
	/** На задаче есть блокер — выделяется на доске. */
	hasBlocker?: boolean;
	/**
	 * Задачу передали другому текущему исполнителю.
	 * Висит, пока новый исполнитель не нажмёт «Взял в работу».
	 */
	assigneeHandoffPending?: boolean;
	/** Кто вёл задачу до передачи (для подсказки на доске). */
	assigneeHandoffFrom?: string;
}

/** Целевой стенд задачи (куда выкатываем / где проверяем). */
export const KANBAN_BOARD_STANDS = [
	{ id: "dev-sumcore", title: "Dev SUMCORE" },
	{ id: "dev-sumd", title: "Dev SUMD" },
	{ id: "ift", title: "ИФТ" },
	{ id: "preprod", title: "Пре-прод" },
	{ id: "prod", title: "Прод" },
] as const;

export type KanbanBoardStandId =
	| (typeof KANBAN_BOARD_STANDS)[number]["id"]
	| "dev";

export const KANBAN_BOARD_STAND_COLORS: Record<KanbanBoardStandId, string> = {
	"dev-sumcore": "#2563eb",
	"dev-sumd": "#0284c7",
	dev: "#2563eb",
	ift: "#7c3aed",
	preprod: "#ca8a04",
	prod: "#dc2626",
};

export function kanbanBoardStandTitle(
	id?: KanbanBoardStandId | string,
): string {
	if (id === "dev") return "Dev";
	return KANBAN_BOARD_STANDS.find((item) => item.id === id)?.title ?? id ?? "";
}

export function kanbanBoardStandColor(
	id?: KanbanBoardStandId | string,
): string {
	if (!id) return "#64748b";
	return KANBAN_BOARD_STAND_COLORS[id as KanbanBoardStandId] ?? "#64748b";
}

/** Система / приложение задачи. */
export const KANBAN_BOARD_SYSTEMS = [
	{ id: "sum", title: "SUM" },
	{ id: "sum-next", title: "SUM-Next" },
	{ id: "sum-rm", title: "SUM-RM" },
	{ id: "data-lineage", title: "Data Lineage" },
	{ id: "smart-anketa", title: "Smart Anketa" },
	{ id: "shell", title: "Shell" },
	{ id: "camunda", title: "Camunda" },
	{ id: "keycloak", title: "Keycloak" },
	{ id: "monitoring", title: "Мониторинг" },
	{ id: "infra", title: "Инфра" },
] as const;

export type KanbanBoardSystemId = (typeof KANBAN_BOARD_SYSTEMS)[number]["id"];

export const KANBAN_BOARD_SYSTEM_COLORS: Record<KanbanBoardSystemId, string> = {
	sum: "#2563eb",
	"sum-next": "#0284c7",
	"sum-rm": "#7c3aed",
	"data-lineage": "#0891b2",
	"smart-anketa": "#16a34a",
	shell: "#ca8a04",
	camunda: "#db2777",
	keycloak: "#4f46e5",
	monitoring: "#0d9488",
	infra: "#64748b",
};

export function kanbanBoardSystemTitle(
	id?: KanbanBoardSystemId | string,
): string {
	return KANBAN_BOARD_SYSTEMS.find((item) => item.id === id)?.title ?? id ?? "";
}

export function kanbanBoardSystemColor(
	id?: KanbanBoardSystemId | string,
): string {
	if (!id) return "#64748b";
	return KANBAN_BOARD_SYSTEM_COLORS[id as KanbanBoardSystemId] ?? "#64748b";
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

/** Метаданные файла-вложения в content задачи (без превью). */
export interface KanbanBoardTaskFileRef {
	id: string;
	name: string;
	mimeType: string;
	byteSize: number;
	createdAt: string;
}

export type KanbanBoardTaskFileDto = KanbanBoardTaskFileRef;

/** Макс. размер full-изображения после сжатия на клиенте, байт. */
export const KANBAN_BOARD_TASK_IMAGE_MAX_FULL_BYTES = 2 * 1024 * 1024;

/** Макс. размер офисного/прочего вложения, байт. */
export const KANBAN_BOARD_TASK_FILE_MAX_BYTES = 15 * 1024 * 1024;

/** MIME офисных и распространённых документов для вложений задачи. */
export const KANBAN_BOARD_TASK_FILE_ALLOWED_MIME = [
	"application/pdf",
	"application/msword",
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
	"application/vnd.ms-excel",
	"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	"application/vnd.ms-powerpoint",
	"application/vnd.openxmlformats-officedocument.presentationml.presentation",
	"application/vnd.oasis.opendocument.text",
	"application/vnd.oasis.opendocument.spreadsheet",
	"application/vnd.oasis.opendocument.presentation",
	"application/rtf",
	"text/plain",
	"text/markdown",
	"text/x-markdown",
	"text/csv",
	"application/csv",
	"application/vnd.ms-excel.sheet.macroenabled.12",
	"application/octet-stream",
] as const;

/** Срок хранения вложений у задач в колонке «Готово», дней. */
export const KANBAN_BOARD_TASK_IMAGE_DONE_RETENTION_DAYS = 7;

export const KANBAN_BOARD_DONE_COLUMN_ID = "done" as const;
export const KANBAN_BOARD_CANCELLED_COLUMN_ID = "cancelled" as const;
export const KANBAN_BOARD_RELEASES_COLUMN_ID = "demo" as const;
export const KANBAN_BOARD_RELEASES_COLUMN_TITLE = "Релизы" as const;
export const KANBAN_BOARD_RELEASES_UNASSIGNED_LANE_TITLE =
	"Без релиза" as const;
export const KANBAN_BOARD_COLUMN_WIDTH_PX = 320;

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
	{ id: "incident", title: "Инцидент" },
	{ id: "subtask", title: "Подзадача" },
] as const;

export type KanbanBoardTaskTypeId =
	(typeof KANBAN_BOARD_TASK_TYPES)[number]["id"];

export const KANBAN_BOARD_DEFAULT_TASK_TYPE_ID: KanbanBoardTaskTypeId = "task";

/** Максимум связанных задач у одной карточки. */
export const KANBAN_BOARD_RELATED_TASKS_MAX = 50;

export const KANBAN_BOARD_RELATION_TYPES = [
	{
		id: "relates",
		title: "Связана с",
		inverseId: "relates",
		color: "#64748b",
	},
	{
		id: "parent",
		title: "Родительская",
		inverseId: "child",
		color: "#7c3aed",
	},
	{
		id: "child",
		title: "Дочерняя",
		inverseId: "parent",
		color: "#7c3aed",
	},
	{
		id: "blocks",
		title: "Блокирует",
		inverseId: "blocked_by",
		color: "#dc2626",
	},
	{
		id: "blocked_by",
		title: "Блокируется",
		inverseId: "blocks",
		color: "#dc2626",
	},
	{
		id: "duplicates",
		title: "Дублирует",
		inverseId: "duplicated_by",
		color: "#ca8a04",
	},
	{
		id: "duplicated_by",
		title: "Дублируется",
		inverseId: "duplicates",
		color: "#ca8a04",
	},
	{
		id: "depends_on",
		title: "Зависит от",
		inverseId: "required_for",
		color: "#2563eb",
	},
	{
		id: "required_for",
		title: "Нужна для",
		inverseId: "depends_on",
		color: "#2563eb",
	},
] as const;

export type KanbanBoardRelationTypeId =
	(typeof KANBAN_BOARD_RELATION_TYPES)[number]["id"];

export const KANBAN_BOARD_DEFAULT_RELATION_TYPE_ID: KanbanBoardRelationTypeId =
	"relates";

export type KanbanBoardRelatedTaskLink = {
	taskId: string;
	type: KanbanBoardRelationTypeId;
};

export function isKanbanBoardRelationTypeId(
	id: string,
): id is KanbanBoardRelationTypeId {
	return KANBAN_BOARD_RELATION_TYPES.some((item) => item.id === id);
}

export function kanbanBoardRelationTypeTitle(
	id?: KanbanBoardRelationTypeId | string,
): string {
	return (
		KANBAN_BOARD_RELATION_TYPES.find((item) => item.id === id)?.title ??
		id ??
		""
	);
}

export function kanbanBoardRelationTypeColor(
	id?: KanbanBoardRelationTypeId | string,
): string {
	return (
		KANBAN_BOARD_RELATION_TYPES.find((item) => item.id === id)?.color ??
		"#64748b"
	);
}

export function kanbanBoardRelationInverseType(
	id?: KanbanBoardRelationTypeId | string,
): KanbanBoardRelationTypeId {
	const found = KANBAN_BOARD_RELATION_TYPES.find((item) => item.id === id);
	return found?.inverseId ?? KANBAN_BOARD_DEFAULT_RELATION_TYPE_ID;
}

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
	incident: "#be123c",
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
	/** Soft-delete: задача в корзине (ISO), null — активна. */
	deletedAt?: string | null;
	/** Количество комментариев (заполняется при чтении доски). */
	commentCount?: number;
	/** Релизы, к которым прикреплена задача (не часть content). */
	releases?: KanbanBoardTaskReleaseRefDto[];
}

export interface TrashKanbanBoardColumnTasksResultDto {
	trashedCount: number;
	columnId: string;
	boardId: string;
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
	/** Сколько незакрытых задач с флагом «есть блокер». */
	blockerCount: number;
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
	/** Читаемый ключ задачи для URL (/tracker/task/…): BOARDKEY-N. */
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
	stand?: KanbanBoardStandId;
	stands?: KanbanBoardStandId[];
	standTitle?: string;
	system?: KanbanBoardSystemId;
	systems?: KanbanBoardSystemId[];
	systemTitle?: string;
	/** Сводка релизов для фильтра/экспорта. */
	releaseTitle?: string;
	hasBlocker?: boolean;
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
	/** @deprecated передавайте boardKey; slug хранит публичный ключ. */
	slug?: string;
	/** Публичный ключ доски (как указано: SMARTA, SMARTA-DEV или BRD-COMMON). */
	boardKey?: string;
	description?: string | null;
	sortOrder?: number;
	/** Имя из настроек трекера («Я — исполнитель»). */
	createdBy?: string | null;
}

export interface UpdateKanbanBoardBoardRequestDto {
	projectId?: string;
	name?: string;
	/** @deprecated передавайте boardKey; slug хранит публичный ключ. */
	slug?: string;
	/** Публичный ключ доски (как указано: SMARTA, SMARTA-DEV или BRD-COMMON). */
	boardKey?: string;
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
	/** Привязка к релизам (kanban_board_release_tasks). */
	releaseIds?: string[];
}

export interface UpdateKanbanBoardTaskRequestDto {
	boardId?: string;
	parentId?: string;
	position?: number;
	content?: KanbanBoardTaskContent;
	/** Кто назначил / создал задачу (подпись в карточке) */
	createdBy?: string | null;
	/** Версия задачи на клиенте; при расхождении — 409, если не forceOverwrite */
	expectedUpdatedAt?: string;
	forceOverwrite?: boolean;
	/** Подпись редактора для проверки soft-lock (имя исполнителя из настроек) */
	lockHolderLabel?: string;
	/** Привязка к релизам; если не передано — членства не меняются. */
	releaseIds?: string[];
}

export interface SaveKanbanBoardTasksRequestDto {
	tasks: KanbanBoardTaskRecord[];
	/** taskId → updatedAt на момент начала правки */
	expectedUpdatedAtByTaskId?: Record<string, string>;
	forceOverwrite?: boolean;
	lockHolderLabel?: string;
}

export const KANBAN_BOARD_TASK_LOCK_TTL_MS = 2 * 60 * 1000;
/** Период опроса актуальности задачи на странице редактирования. */
export const KANBAN_BOARD_SYNC_POLL_INTERVAL_MS = 8_000;
/** Бездействие на странице задачи → снятие lock и выход. */
export const KANBAN_BOARD_TASK_EDIT_IDLE_TIMEOUT_MS = 10 * 60 * 1000;
/** Период опроса статуса lock задачи. */
export const KANBAN_BOARD_TASK_LOCK_POLL_INTERVAL_MS = 10_000;

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
	{
		code: "sum-next",
		name: "SUM-Next",
		description: "Стоковый проект SUM-Next",
	},
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
	/** Системы / приложения, которые выставить всем переносимым задачам. */
	systems?: KanbanBoardSystemId[];
	/** @deprecated use systems */
	system?: KanbanBoardSystemId;
}

export interface AssignKanbanBoardTasksToBoardResultDto {
	boardId: string;
	updatedCount: number;
	skippedCount: number;
	skippedReasons?: string[];
}

export interface KanbanBoardPlanningImportResultDto {
	meta: KanbanBoardSnapshotMeta;
	importFormat: "planning";
	warnings: string[];
	importedCount: number;
}

export interface KanbanBoardPlanningKanbanImportBoardDto {
	boardId: string;
	boardKey: string;
	name: string;
	taskCount: number;
	created?: boolean;
}

export interface KanbanBoardPlanningKanbanImportResultDto {
	sheetName: string;
	releaseId: string;
	releaseName: string;
	createdCount: number;
	updatedCount: number;
	attachedCount: number;
	warnings: string[];
	boards: KanbanBoardPlanningKanbanImportBoardDto[];
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
	{ id: "demo", title: KANBAN_BOARD_RELEASES_COLUMN_TITLE },
	{ id: "cancelled", title: "Отменено" },
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
	cancelled: "cancelled",
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
			: status.id === "cancelled"
				? "#64748b"
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
	taskNumber?: number;
	createdAt?: string;
	createdBy?: string | null;
	/** Версия задачи для optimistic locking на доске */
	updatedAt?: string;
	commentCount?: number;
	releases?: KanbanBoardTaskReleaseRefDto[];
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
	createdBy?: string | null;
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

export const KANBAN_BOARD_RELEASE_STATUSES = [
	{ id: "draft", title: "Черновик", color: "#64748b" },
	{ id: "planned", title: "Запланирован", color: "#2563eb" },
	{ id: "in_progress", title: "В работе", color: "#ca8a04" },
	{ id: "ready", title: "Готов к выпуску", color: "#0891b2" },
	{ id: "done", title: "Выпущен", color: "#16a34a" },
	{ id: "cancelled", title: "Отменён", color: "#dc2626" },
	{ id: "archived", title: "Архив", color: "#94a3b8" },
] as const;

export type KanbanBoardReleaseStatusId =
	(typeof KANBAN_BOARD_RELEASE_STATUSES)[number]["id"];

export const KANBAN_BOARD_RELEASE_DONE_STATUS_ID: KanbanBoardReleaseStatusId =
	"done";

export const KANBAN_BOARD_RELEASE_THEME_COLORS = [
	"#2563eb",
	"#7c3aed",
	"#ca8a04",
	"#16a34a",
	"#dc2626",
	"#0891b2",
	"#db2777",
	"#64748b",
] as const;

export function isKanbanBoardReleaseStatusId(
	value: unknown,
): value is KanbanBoardReleaseStatusId {
	return KANBAN_BOARD_RELEASE_STATUSES.some((item) => item.id === value);
}

export function kanbanBoardReleaseStatusTitle(
	id?: KanbanBoardReleaseStatusId | string,
): string {
	return (
		KANBAN_BOARD_RELEASE_STATUSES.find((item) => item.id === id)?.title ??
		id ??
		""
	);
}

export function kanbanBoardReleaseStatusColor(
	id?: KanbanBoardReleaseStatusId | string,
): string {
	return (
		KANBAN_BOARD_RELEASE_STATUSES.find((item) => item.id === id)?.color ??
		"#64748b"
	);
}

/** Завершить можно любой незакрытый релиз (не отменён и не в архиве). */
export function kanbanBoardReleaseCanComplete(
	status?: KanbanBoardReleaseStatusId | string,
): boolean {
	return status !== "cancelled" && status !== "archived";
}

/** На доске остаются только незакрытые релизы. */
export function kanbanBoardReleaseVisibleOnBoard(
	status?: KanbanBoardReleaseStatusId | string,
): boolean {
	return status !== "done" && status !== "cancelled" && status !== "archived";
}

export interface KanbanBoardReleaseThemeDto {
	id: string;
	planningId: string;
	name: string;
	color: string;
	position: number;
}

export interface KanbanBoardReleaseTaskDto {
	taskId: string;
	/** Первый релиз или пусто, если задача только в планировании. */
	releaseId: string;
	/** Все релизы планирования, к которым привязана задача. */
	releaseIds?: string[];
	themeId: string | null;
	position: number;
	task: KanbanBoardTaskRegistryDto;
}

export interface KanbanBoardTaskReleaseRefDto {
	id: string;
	code: string;
	name: string;
}

export const KANBAN_BOARD_RELEASE_CHIP_COLOR = "#d97706";

export const KANBAN_BOARD_BLOCKER_COLOR = "#dc2626";

/** Карточка ожидает, пока новый исполнитель возьмёт задачу. */
export const KANBAN_BOARD_HANDOFF_COLOR = "#c2410c";

export function kanbanBoardTaskHasBlocker(
	content?: Pick<KanbanBoardTaskContent, "hasBlocker"> | null,
): boolean {
	return content?.hasBlocker === true;
}

export function kanbanBoardTaskHasAssigneeHandoff(
	content?: Pick<KanbanBoardTaskContent, "assigneeHandoffPending"> | null,
): boolean {
	return content?.assigneeHandoffPending === true;
}

export function kanbanBoardAssigneeHandoffTitle(
	content?: Pick<
		KanbanBoardTaskContent,
		"currentAssignee" | "assigneeHandoffFrom"
	> | null,
): string {
	const to = content?.currentAssignee?.trim() || "";
	const from = content?.assigneeHandoffFrom?.trim() || "";
	if (from && to) return `Передано: ${from} → ${to}. Нужно взять в работу.`;
	if (to) return `Передано исполнителю ${to}. Нужно взять в работу.`;
	return "Задачу передали — нужно взять в работу.";
}

export const KANBAN_BOARD_RELEASE_IMAGE_TARGETS = [
	{ id: "sum", label: "SUM" },
	{ id: "sum-rm", label: "SUM-RM" },
	{ id: "shell", label: "Shell" },
	{ id: "dl", label: "DL" },
	{ id: "smart-anketa-api", label: "Smart Anketa API" },
	{ id: "smart-anketa-ui", label: "Smart Anketa UI" },
] as const;

export type KanbanBoardReleaseImageTargetId =
	(typeof KANBAN_BOARD_RELEASE_IMAGE_TARGETS)[number]["id"];

export type KanbanBoardReleaseImageVersions = Partial<
	Record<KanbanBoardReleaseImageTargetId, string>
>;

export function isKanbanBoardReleaseImageTargetId(
	value: unknown,
): value is KanbanBoardReleaseImageTargetId {
	return KANBAN_BOARD_RELEASE_IMAGE_TARGETS.some((item) => item.id === value);
}

export function normalizeKanbanBoardReleaseImageVersions(
	value: unknown,
): KanbanBoardReleaseImageVersions {
	if (!value || typeof value !== "object" || Array.isArray(value)) return {};
	const source = value as Record<string, unknown>;
	const next: KanbanBoardReleaseImageVersions = {};
	for (const target of KANBAN_BOARD_RELEASE_IMAGE_TARGETS) {
		const raw = source[target.id];
		if (typeof raw !== "string") continue;
		const trimmed = raw.trim();
		if (trimmed) next[target.id] = trimmed;
	}
	return next;
}

export function kanbanBoardReleaseImageVersionsTitle(
	versions?: KanbanBoardReleaseImageVersions | null,
): string {
	return KANBAN_BOARD_RELEASE_IMAGE_TARGETS.map((target) => {
		const version = versions?.[target.id]?.trim();
		return version ? `${target.label} ${version}` : "";
	})
		.filter(Boolean)
		.join(", ");
}

export function kanbanBoardTaskReleaseLabel(
	release: Pick<KanbanBoardTaskReleaseRefDto, "code" | "name">,
): string {
	return release.name.trim() || release.code.trim();
}

export function kanbanBoardTaskReleasesTitle(
	releases?: KanbanBoardTaskReleaseRefDto[] | null,
): string {
	return (releases ?? []).map(kanbanBoardTaskReleaseLabel).join(", ");
}

export interface KanbanBoardReleaseDto {
	id: string;
	code: string;
	name: string;
	description: string | null;
	status: KanbanBoardReleaseStatusId;
	supersprintId: string | null;
	supersprintCode: string;
	supersprintName: string;
	sprintId: string | null;
	sprintCode: string;
	sprintName: string;
	startDate: string | null;
	endDate: string | null;
	imageVersions: KanbanBoardReleaseImageVersions;
	themeCount: number;
	taskCount: number;
	hasPlanning: boolean;
	planningId: string | null;
	planningCode: string;
	planningName: string;
	createdAt: string;
	updatedAt: string;
}

export interface KanbanBoardReleaseDetailDto extends KanbanBoardReleaseDto {
	tasks: KanbanBoardReleaseTaskDto[];
}

export interface KanbanBoardPlanningDto {
	id: string;
	code: string;
	name: string;
	description: string | null;
	releaseTitle: string;
	releaseCount: number;
	taskCount: number;
	hasLayout: boolean;
	createdAt: string;
	updatedAt: string;
}

export interface KanbanBoardPlanningDetailDto extends KanbanBoardPlanningDto {
	layoutJson: unknown | null;
	releases: KanbanBoardReleaseDto[];
	themes: KanbanBoardReleaseThemeDto[];
	tasks: KanbanBoardReleaseTaskDto[];
}

export interface CreateKanbanBoardPlanningRequestDto {
	code: string;
	name: string;
	description?: string | null;
}

export interface UpdateKanbanBoardPlanningRequestDto {
	code?: string;
	name?: string;
	description?: string | null;
}

export interface UpdateKanbanBoardPlanningLayoutRequestDto {
	layoutJson: unknown;
}

export interface CreateKanbanBoardReleaseRequestDto {
	code: string;
	name: string;
	description?: string | null;
	status?: KanbanBoardReleaseStatusId;
	planningId?: string | null;
	supersprintId?: string | null;
	sprintId?: string | null;
	startDate?: string | null;
	endDate?: string | null;
	imageVersions?: KanbanBoardReleaseImageVersions;
}

export interface UpdateKanbanBoardReleaseRequestDto {
	code?: string;
	name?: string;
	description?: string | null;
	status?: KanbanBoardReleaseStatusId;
	planningId?: string | null;
	supersprintId?: string | null;
	sprintId?: string | null;
	startDate?: string | null;
	endDate?: string | null;
	imageVersions?: KanbanBoardReleaseImageVersions;
}

export interface CompleteKanbanBoardReleaseRequestDto {
	lockHolderLabel?: string;
}

export interface AttachKanbanBoardPlanningReleaseRequestDto {
	releaseId?: string;
	code?: string;
	name?: string;
	description?: string | null;
	status?: KanbanBoardReleaseStatusId;
	supersprintId?: string | null;
	sprintId?: string | null;
	startDate?: string | null;
	endDate?: string | null;
	imageVersions?: KanbanBoardReleaseImageVersions;
}

export interface CreateKanbanBoardReleaseThemeRequestDto {
	name: string;
	color?: string;
	position?: number;
}

export interface UpdateKanbanBoardReleaseThemeRequestDto {
	name?: string;
	color?: string;
	position?: number;
}

export interface AttachKanbanBoardReleaseTasksRequestDto {
	taskIds: string[];
	themeId?: string | null;
}

/** Добавить задачи в планирование. Группа и релизы необязательны. */
export interface AssignKanbanBoardPlanningTasksRequestDto {
	taskIds: string[];
	themeId?: string | null;
	releaseIds?: string[];
}

export interface ReorderKanbanBoardReleaseTasksRequestDto {
	items: Array<{
		taskId: string;
		themeId: string | null;
		position: number;
	}>;
}

export interface MoveKanbanBoardReleaseTaskRequestDto {
	targetReleaseId: string;
	themeId?: string | null;
}

export interface MoveKanbanBoardReleaseTaskStatusRequestDto {
	statusTitle: string;
	lockHolderLabel?: string;
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
