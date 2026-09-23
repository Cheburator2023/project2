import {
	formatKanbanTaskKey,
	KANBAN_BOARD_PRIORITIES,
	KANBAN_BOARD_ROLE_ESTIMATE_FIELDS,
	KANBAN_BOARD_STANDS,
	KANBAN_BOARD_SYSTEMS,
	KANBAN_BOARD_TASK_TYPES,
	KANBAN_BOARD_WORK_TYPES,
	kanbanBoardEffectiveEstimatePd,
	kanbanBoardTaskAssignees,
	kanbanBoardTaskHasBlocker,
	kanbanBoardTaskReleaseLabel,
	kanbanBoardTaskStands,
	kanbanBoardTaskStandsTitle,
	kanbanBoardTaskSystems,
	kanbanBoardTaskSystemsTitle,
	kanbanBoardWorkTypeTitle,
	type KanbanBoardData,
	type KanbanBoardItem,
	type KanbanBoardPriorityId,
	type KanbanBoardTaskContent,
	type KanbanBoardTaskTypeId,
	type KanbanBoardWorkTypeId,
} from "@smart-anketa/api-contract";
import { normalizeSearchText } from "@react-client/utils/substringSearch";

const asTaskContent = (
	content: KanbanBoardItem["content"],
): KanbanBoardTaskContent | undefined => {
	if (!content || typeof content !== "object") return undefined;
	if (!("title" in content) || typeof content.title !== "string") {
		return undefined;
	}
	return content as KanbanBoardTaskContent;
};

export type KanbanBoardBlockerFilter = "" | "yes" | "no";

export type KanbanBoardTaskFilters = {
	/** Колонка-статус */
	status: string;
	/** Исполнитель (точное имя) */
	assignee: string;
	/** Назначил (точное имя) */
	createdBy: string;
	priority: KanbanBoardPriorityId | "";
	taskType: KanbanBoardTaskTypeId | "";
	workType: KanbanBoardWorkTypeId | "";
	stand: string;
	system: string;
	customer: string;
	sprintId: string;
	stream: string;
	releaseId: string;
	blocker: KanbanBoardBlockerFilter;
	parent: string;
	tag: string;
	/** Точный № в бэклоге */
	backlog: string;
	/** YYYY-MM-DD */
	dueFrom: string;
	/** YYYY-MM-DD */
	dueTo: string;
	/** YYYY-MM-DD */
	createdFrom: string;
	/** YYYY-MM-DD */
	createdTo: string;
	/** YYYY-MM-DD */
	updatedFrom: string;
	/** YYYY-MM-DD */
	updatedTo: string;
};

export const EMPTY_KANBAN_BOARD_TASK_FILTERS: KanbanBoardTaskFilters = {
	status: "",
	assignee: "",
	createdBy: "",
	priority: "",
	taskType: "",
	workType: "",
	stand: "",
	system: "",
	customer: "",
	sprintId: "",
	stream: "",
	releaseId: "",
	blocker: "",
	parent: "",
	tag: "",
	backlog: "",
	dueFrom: "",
	dueTo: "",
	createdFrom: "",
	createdTo: "",
	updatedFrom: "",
	updatedTo: "",
};

/** Query-ключи вида доски: фильтры + быстрый поиск. */
export const KANBAN_BOARD_VIEW_QUERY = {
	q: "q",
	assignee: "assignee",
	createdBy: "createdBy",
	priority: "priority",
	taskType: "type",
	workType: "work",
	stand: "stand",
	system: "system",
	customer: "customer",
	sprintId: "sprint",
	stream: "stream",
	releaseId: "release",
	blocker: "blocker",
	parent: "parent",
	tag: "tag",
	backlog: "backlog",
	status: "status",
	dueFrom: "dueFrom",
	dueTo: "dueTo",
	createdFrom: "createdFrom",
	createdTo: "createdTo",
	updatedFrom: "updatedFrom",
	updatedTo: "updatedTo",
	layout: "layout",
} as const;

export type KanbanBoardLayout = "board" | "people";

export function parseKanbanBoardLayout(
	params: URLSearchParams,
): KanbanBoardLayout {
	return params.get(KANBAN_BOARD_VIEW_QUERY.layout) === "people"
		? "people"
		: "board";
}

const PRIORITY_IDS = new Set<string>(
	KANBAN_BOARD_PRIORITIES.map((item) => item.id),
);
const TASK_TYPE_IDS = new Set<string>(
	KANBAN_BOARD_TASK_TYPES.map((item) => item.id),
);
const WORK_TYPE_IDS = new Set<string>(
	KANBAN_BOARD_WORK_TYPES.map((item) => item.id),
);
const STAND_IDS = new Set<string>([
	...KANBAN_BOARD_STANDS.map((item) => item.id),
	"dev",
]);
const SYSTEM_IDS = new Set<string>(
	KANBAN_BOARD_SYSTEMS.map((item) => item.id),
);

const readParam = (params: URLSearchParams, key: string): string =>
	params.get(key)?.trim() ?? "";

const readDateParam = (params: URLSearchParams, key: string): string => {
	const value = readParam(params, key);
	return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : "";
};

export function parseKanbanBoardSearchQuery(params: URLSearchParams): string {
	return params.get(KANBAN_BOARD_VIEW_QUERY.q)?.trim() ?? "";
}

export function parseKanbanBoardTaskFiltersFromSearchParams(
	params: URLSearchParams,
): KanbanBoardTaskFilters {
	const priority = readParam(params, KANBAN_BOARD_VIEW_QUERY.priority);
	const taskType = readParam(params, KANBAN_BOARD_VIEW_QUERY.taskType);
	const workType = readParam(params, KANBAN_BOARD_VIEW_QUERY.workType);
	const stand = readParam(params, KANBAN_BOARD_VIEW_QUERY.stand);
	const system = readParam(params, KANBAN_BOARD_VIEW_QUERY.system);
	const blocker = readParam(params, KANBAN_BOARD_VIEW_QUERY.blocker);
	return {
		status: readParam(params, KANBAN_BOARD_VIEW_QUERY.status),
		assignee: readParam(params, KANBAN_BOARD_VIEW_QUERY.assignee),
		createdBy: readParam(params, KANBAN_BOARD_VIEW_QUERY.createdBy),
		priority: PRIORITY_IDS.has(priority)
			? (priority as KanbanBoardPriorityId)
			: "",
		taskType: TASK_TYPE_IDS.has(taskType)
			? (taskType as KanbanBoardTaskTypeId)
			: "",
		workType: WORK_TYPE_IDS.has(workType)
			? (workType as KanbanBoardWorkTypeId)
			: "",
		stand: STAND_IDS.has(stand) ? stand : "",
		system: SYSTEM_IDS.has(system) ? system : "",
		customer: readParam(params, KANBAN_BOARD_VIEW_QUERY.customer),
		sprintId: readParam(params, KANBAN_BOARD_VIEW_QUERY.sprintId),
		stream: readParam(params, KANBAN_BOARD_VIEW_QUERY.stream),
		releaseId: readParam(params, KANBAN_BOARD_VIEW_QUERY.releaseId),
		blocker: blocker === "yes" || blocker === "no" ? blocker : "",
		parent: readParam(params, KANBAN_BOARD_VIEW_QUERY.parent),
		tag: readParam(params, KANBAN_BOARD_VIEW_QUERY.tag),
		backlog: readParam(params, KANBAN_BOARD_VIEW_QUERY.backlog),
		dueFrom: readDateParam(params, KANBAN_BOARD_VIEW_QUERY.dueFrom),
		dueTo: readDateParam(params, KANBAN_BOARD_VIEW_QUERY.dueTo),
		createdFrom: readDateParam(params, KANBAN_BOARD_VIEW_QUERY.createdFrom),
		createdTo: readDateParam(params, KANBAN_BOARD_VIEW_QUERY.createdTo),
		updatedFrom: readDateParam(params, KANBAN_BOARD_VIEW_QUERY.updatedFrom),
		updatedTo: readDateParam(params, KANBAN_BOARD_VIEW_QUERY.updatedTo),
	};
}

function setOrDelete(params: URLSearchParams, key: string, value: string) {
	const trimmed = value.trim();
	if (trimmed) params.set(key, trimmed);
	else params.delete(key);
}

/** Пишет вид доски в query, чужие параметры не трогает. */
export function applyKanbanBoardViewToSearchParams(
	current: URLSearchParams,
	view: { filters: KanbanBoardTaskFilters; query: string },
): URLSearchParams {
	const next = new URLSearchParams(current);
	setOrDelete(next, KANBAN_BOARD_VIEW_QUERY.q, view.query);
	setOrDelete(next, KANBAN_BOARD_VIEW_QUERY.status, view.filters.status);
	setOrDelete(next, KANBAN_BOARD_VIEW_QUERY.assignee, view.filters.assignee);
	setOrDelete(next, KANBAN_BOARD_VIEW_QUERY.createdBy, view.filters.createdBy);
	setOrDelete(next, KANBAN_BOARD_VIEW_QUERY.priority, view.filters.priority);
	setOrDelete(next, KANBAN_BOARD_VIEW_QUERY.taskType, view.filters.taskType);
	setOrDelete(next, KANBAN_BOARD_VIEW_QUERY.workType, view.filters.workType);
	setOrDelete(next, KANBAN_BOARD_VIEW_QUERY.stand, view.filters.stand);
	setOrDelete(next, KANBAN_BOARD_VIEW_QUERY.system, view.filters.system);
	setOrDelete(next, KANBAN_BOARD_VIEW_QUERY.customer, view.filters.customer);
	setOrDelete(next, KANBAN_BOARD_VIEW_QUERY.sprintId, view.filters.sprintId);
	setOrDelete(next, KANBAN_BOARD_VIEW_QUERY.stream, view.filters.stream);
	setOrDelete(next, KANBAN_BOARD_VIEW_QUERY.releaseId, view.filters.releaseId);
	setOrDelete(next, KANBAN_BOARD_VIEW_QUERY.blocker, view.filters.blocker);
	setOrDelete(next, KANBAN_BOARD_VIEW_QUERY.parent, view.filters.parent);
	setOrDelete(next, KANBAN_BOARD_VIEW_QUERY.tag, view.filters.tag);
	setOrDelete(next, KANBAN_BOARD_VIEW_QUERY.backlog, view.filters.backlog);
	setOrDelete(next, KANBAN_BOARD_VIEW_QUERY.dueFrom, view.filters.dueFrom);
	setOrDelete(next, KANBAN_BOARD_VIEW_QUERY.dueTo, view.filters.dueTo);
	setOrDelete(
		next,
		KANBAN_BOARD_VIEW_QUERY.createdFrom,
		view.filters.createdFrom,
	);
	setOrDelete(next, KANBAN_BOARD_VIEW_QUERY.createdTo, view.filters.createdTo);
	setOrDelete(next, KANBAN_BOARD_VIEW_QUERY.updatedFrom, view.filters.updatedFrom);
	setOrDelete(next, KANBAN_BOARD_VIEW_QUERY.updatedTo, view.filters.updatedTo);
	return next;
}

export function kanbanBoardViewSearchString(view: {
	filters: KanbanBoardTaskFilters;
	query: string;
}): string {
	return applyKanbanBoardViewToSearchParams(
		new URLSearchParams(),
		view,
	).toString();
}

export function kanbanBoardTaskFiltersActive(
	filters: KanbanBoardTaskFilters,
): boolean {
	return Object.values(filters).some((value) =>
		Boolean(value?.trim?.() ?? value),
	);
}

const dateOnly = (value: string | undefined | null): string => {
	if (!value?.trim()) return "";
	const trimmed = value.trim();
	if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10);
	try {
		return new Date(trimmed).toISOString().slice(0, 10);
	} catch {
		return "";
	}
};

const includesNormalized = (haystack: string, needle: string): boolean => {
	if (!needle) return true;
	return normalizeSearchText(haystack).includes(needle);
};

export function kanbanBoardTaskSearchHaystack(
	item: KanbanBoardItem,
	taskKeyPrefix?: string,
): string {
	const content = asTaskContent(item.content);
	const taskKey =
		taskKeyPrefix && item.taskNumber
			? formatKanbanTaskKey(taskKeyPrefix, item.taskNumber)
			: "";
	const assignees = content ? kanbanBoardTaskAssignees(content).join(" ") : "";
	const roleEstimates = content?.roleEstimates
		? KANBAN_BOARD_ROLE_ESTIMATE_FIELDS.flatMap((field) => {
				const value = content.roleEstimates?.[field.key];
				return value == null ? [] : [field.title, String(value)];
			})
		: [];
	const estimate = content ? kanbanBoardEffectiveEstimatePd(content) : undefined;
	return [
		item.title,
		content?.title,
		content?.description,
		taskKey,
		content?.currentAssignee,
		content?.assignee,
		assignees,
		item.createdBy,
		content?.customer,
		content?.parentTask,
		content?.streamCustomer,
		content?.tags?.join(" "),
		content?.subtasks?.map((subtask) => subtask.text).join(" "),
		content ? kanbanBoardWorkTypeTitle(content.workType) : "",
		content ? kanbanBoardTaskStands(content).join(" ") : "",
		content ? kanbanBoardTaskStandsTitle(content) : "",
		content ? kanbanBoardTaskSystems(content).join(" ") : "",
		content ? kanbanBoardTaskSystemsTitle(content) : "",
		item.releases?.map((release) => kanbanBoardTaskReleaseLabel(release)).join(" "),
		content?.backlogNumber != null ? String(content.backlogNumber) : "",
		estimate != null ? String(estimate) : "",
		...roleEstimates,
		content && kanbanBoardTaskHasBlocker(content) ? "блокер" : "",
	]
		.filter(Boolean)
		.join(" ");
}

export function kanbanBoardTaskMatchesSearch(
	item: KanbanBoardItem,
	query: string,
	taskKeyPrefix?: string,
): boolean {
	const normalized = normalizeSearchText(query);
	if (!normalized) return true;
	return includesNormalized(
		kanbanBoardTaskSearchHaystack(item, taskKeyPrefix),
		normalized,
	);
}

export function kanbanBoardTaskMatchesFilters(
	item: KanbanBoardItem,
	filters: KanbanBoardTaskFilters,
): boolean {
	const content = asTaskContent(item.content);
	if (filters.status && item.parentId !== filters.status) return false;
	if (filters.priority && content?.priority !== filters.priority) {
		return false;
	}
	if (filters.taskType && content?.taskType !== filters.taskType) {
		return false;
	}
	if (filters.workType && content?.workType !== filters.workType) {
		return false;
	}
	if (
		filters.stand &&
		!(content ? kanbanBoardTaskStands(content) : []).some(
			(id) => id === filters.stand,
		)
	) {
		return false;
	}
	if (
		filters.system &&
		!(content ? kanbanBoardTaskSystems(content) : []).some(
			(id) => id === filters.system,
		)
	) {
		return false;
	}
	if (
		filters.customer &&
		(content?.customer ?? "").trim() !== filters.customer
	) {
		return false;
	}
	if (filters.sprintId && content?.sprintId !== filters.sprintId) return false;
	if (
		filters.stream &&
		(content?.streamCustomer ?? "").trim() !== filters.stream
	) {
		return false;
	}
	if (
		filters.releaseId &&
		!(item.releases ?? []).some((release) => release.id === filters.releaseId)
	) {
		return false;
	}
	if (filters.blocker === "yes" && !kanbanBoardTaskHasBlocker(content)) {
		return false;
	}
	if (filters.blocker === "no" && kanbanBoardTaskHasBlocker(content)) {
		return false;
	}
	if (filters.parent && (content?.parentTask ?? "").trim() !== filters.parent) {
		return false;
	}
	if (
		filters.tag &&
		!(content?.tags ?? []).some((tag) => tag.trim() === filters.tag)
	) {
		return false;
	}
	if (
		filters.backlog &&
		String(content?.backlogNumber ?? "") !== filters.backlog
	) {
		return false;
	}
	if (filters.assignee) {
		const names = new Set(
			[
				content?.currentAssignee?.trim(),
				...(content ? kanbanBoardTaskAssignees(content) : []),
			].filter(Boolean),
		);
		if (!names.has(filters.assignee)) return false;
	}
	if (filters.createdBy) {
		if ((item.createdBy ?? "").trim() !== filters.createdBy) return false;
	}

	const due = dateOnly(content?.dueDate);
	if (filters.dueFrom && (!due || due < filters.dueFrom)) return false;
	if (filters.dueTo && (!due || due > filters.dueTo)) return false;

	const created = dateOnly(item.createdAt);
	if (filters.createdFrom && (!created || created < filters.createdFrom)) {
		return false;
	}
	if (filters.createdTo && (!created || created > filters.createdTo)) {
		return false;
	}

	const updated = dateOnly(item.updatedAt);
	if (filters.updatedFrom && (!updated || updated < filters.updatedFrom)) {
		return false;
	}
	if (filters.updatedTo && (!updated || updated > filters.updatedTo)) {
		return false;
	}

	return true;
}

export function filterKanbanBoardData(
	board: KanbanBoardData,
	predicate: (item: KanbanBoardItem) => boolean,
): KanbanBoardData {
	const next: KanbanBoardData = {
		...board,
		root: { ...board.root },
	};

	for (const columnId of board.root.children) {
		const column = board[columnId];
		if (!column) continue;
		const children = column.children.filter((taskId) => {
			const card = board[taskId];
			if (!card || card.type !== "card") return false;
			return predicate(card);
		});
		next[columnId] = {
			...column,
			children,
			totalChildrenCount: children.length,
		};
	}

	return next;
}

export function countKanbanBoardCards(board: KanbanBoardData): number {
	return board.root.children.reduce((sum, columnId) => {
		const column = board[columnId];
		return sum + (column?.children.length ?? 0);
	}, 0);
}
