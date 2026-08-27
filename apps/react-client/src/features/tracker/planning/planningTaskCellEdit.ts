import {
	KANBAN_BOARD_PRIORITIES,
	KANBAN_BOARD_ROLE_ESTIMATE_FIELDS,
	KANBAN_BOARD_STANDS,
	KANBAN_BOARD_STATUSES,
	KANBAN_BOARD_SYSTEMS,
	KANBAN_BOARD_TASK_TYPES,
	KANBAN_BOARD_WORK_TYPES,
	kanbanBoardEffectiveEstimatePd,
	kanbanBoardPriorityTitle,
	kanbanBoardStandTitle,
	kanbanBoardTaskAssignees,
	kanbanBoardTaskAssigneesTitle,
	kanbanBoardTaskSystems,
	kanbanBoardTaskSystemsTitle,
	kanbanBoardTaskTypeTitle,
	kanbanBoardWorkTypeTitle,
	normalizeKanbanBoardTaskContent,
	type KanbanBoardRoleEstimates,
	type KanbanBoardTaskContent,
	type KanbanBoardTaskRegistryDto,
} from "@smart-anketa/api-contract";

export type PlanningTaskSprintOption = {
	id: string;
	label: string;
};

export type PlanningTaskParentOption = {
	id: string;
	label: string;
};

export type PlanningTaskFieldLookups = {
	assigneeNames: string[];
	sprintOptions: PlanningTaskSprintOption[];
	streamNames: string[];
	customerNames: string[];
	parentTaskOptions: PlanningTaskParentOption[];
};

export const EMPTY_PLANNING_TASK_FIELD_LOOKUPS: PlanningTaskFieldLookups = {
	assigneeNames: [],
	sprintOptions: [],
	streamNames: [],
	customerNames: [],
	parentTaskOptions: [],
};

export const ROLE_ESTIMATE_COL_PREFIX = "roleEstimate.";

export function roleEstimateColId(key: keyof KanbanBoardRoleEstimates): string {
	return `${ROLE_ESTIMATE_COL_PREFIX}${key}`;
}

export function parseRoleEstimateColId(
	colId: string,
): keyof KanbanBoardRoleEstimates | null {
	if (!colId.startsWith(ROLE_ESTIMATE_COL_PREFIX)) return null;
	const key = colId.slice(ROLE_ESTIMATE_COL_PREFIX.length);
	return KANBAN_BOARD_ROLE_ESTIMATE_FIELDS.some((item) => item.key === key)
		? (key as keyof KanbanBoardRoleEstimates)
		: null;
}

const PERSIST_COL_IDS = new Set<string>([
	"title",
	"description",
	"backlogNumber",
	"priority",
	"assignees",
	"currentAssignee",
	"createdBy",
	"taskType",
	"workType",
	"stand",
	"system",
	"blocker",
	"estimatePd",
	"dueDate",
	"parentTask",
	"customer",
	"sprintId",
	"streamCustomer",
	"status",
	...KANBAN_BOARD_ROLE_ESTIMATE_FIELDS.map((item) =>
		roleEstimateColId(item.key),
	),
]);

export function isPlanningTaskPersistColId(colId: string): boolean {
	return PERSIST_COL_IDS.has(colId);
}

export function planningTaskSprintDisplay(
	task: KanbanBoardTaskRegistryDto,
	lookups: PlanningTaskFieldLookups,
): string {
	if (task.sprintTitle) return task.sprintTitle;
	const sprintId = task.content.sprintId;
	if (!sprintId) return "";
	return (
		lookups.sprintOptions.find((item) => item.id === sprintId)?.label ?? ""
	);
}

export function planningTaskParentDisplay(
	task: KanbanBoardTaskRegistryDto,
	lookups: PlanningTaskFieldLookups,
): string {
	const raw = task.content.parentTask ?? task.parentTask ?? "";
	if (!raw) return "";
	return (
		lookups.parentTaskOptions.find((item) => item.id === raw)?.label ?? raw
	);
}

export function planningSprintOptionLabel(sprint: {
	code: string;
	name: string;
}): string {
	return `${sprint.code} — ${sprint.name}`;
}

export function planningParentTaskLabel(task: {
	taskKey: string;
	title: string;
}): string {
	return `${task.taskKey} · ${task.title}`;
}

function resolveAssigneeFields(
	assignees: string[],
	currentAssignee: string,
): { assignees?: string[]; currentAssignee?: string } {
	const uniqueAssignees = [
		...new Set(assignees.map((item) => item.trim()).filter(Boolean)),
	];
	const current = currentAssignee.trim();
	if (current && !uniqueAssignees.includes(current)) {
		uniqueAssignees.push(current);
	}
	const resolvedCurrent = current || uniqueAssignees[0];
	return {
		assignees: uniqueAssignees.length ? uniqueAssignees : undefined,
		currentAssignee: resolvedCurrent || undefined,
	};
}

function text(value: unknown): string {
	return String(value ?? "").trim();
}

function parseOptionalNumber(value: unknown): number | undefined {
	if (value === null || value === undefined || value === "") return undefined;
	const parsed = Number(value);
	if (!Number.isFinite(parsed)) return undefined;
	return parsed;
}

function findCatalogId<T extends { id: string; title: string }>(
	items: readonly T[],
	raw: unknown,
): T["id"] | undefined {
	const value = text(raw);
	if (!value) return undefined;
	const match = items.find(
		(item) =>
			item.id === value || item.title.toLowerCase() === value.toLowerCase(),
	);
	return match?.id;
}

function parseBlocker(value: unknown): boolean {
	const raw = text(value).toLowerCase();
	return raw === "есть" || raw === "да" || raw === "true" || raw === "1";
}

function parseAssigneeList(value: unknown): string[] {
	return String(value ?? "")
		.split(/[,;]/)
		.map((item) => item.trim())
		.filter(Boolean);
}

function resolveSprintId(
	raw: unknown,
	lookups: PlanningTaskFieldLookups,
): string | undefined {
	const value = text(raw);
	if (!value) return undefined;
	const match = lookups.sprintOptions.find(
		(item) =>
			item.id === value || item.label.toLowerCase() === value.toLowerCase(),
	);
	return match?.id;
}

function resolveParentTask(
	raw: unknown,
	lookups: PlanningTaskFieldLookups,
): string | undefined {
	const value = text(raw);
	if (!value) return undefined;
	const match = lookups.parentTaskOptions.find(
		(item) =>
			item.id === value || item.label.toLowerCase() === value.toLowerCase(),
	);
	return match?.id ?? value;
}

function snapshot(task: KanbanBoardTaskRegistryDto): string {
	return JSON.stringify({
		parentId: task.parentId,
		createdBy: task.createdBy ?? null,
		content: normalizeKanbanBoardTaskContent({
			...task.content,
			title: task.content.title || task.title,
		}),
	});
}

function syncTaskDisplay(
	task: KanbanBoardTaskRegistryDto,
	lookups: PlanningTaskFieldLookups,
): void {
	const content = task.content;
	task.title = content.title;
	task.hasBlocker = content.hasBlocker === true;
	task.priorityTitle = content.priority
		? kanbanBoardPriorityTitle(content.priority)
		: undefined;
	task.taskTypeTitle = content.taskType
		? kanbanBoardTaskTypeTitle(content.taskType)
		: "";
	task.workTypeTitle = content.workType
		? kanbanBoardWorkTypeTitle(content.workType)
		: "";
	task.assignees = kanbanBoardTaskAssignees(content);
	task.assigneeTitle = kanbanBoardTaskAssigneesTitle(content);
	task.currentAssigneeTitle = content.currentAssignee ?? "";
	task.estimatePd = content.estimatePd;
	task.effectiveEstimatePd = kanbanBoardEffectiveEstimatePd(content);
	task.roleEstimates = content.roleEstimates;
	task.dueDate = content.dueDate;
	task.parentTask = content.parentTask;
	task.customer = content.customer;
	task.streamCustomer = content.streamCustomer;
	task.stand = content.stand;
	task.standTitle = content.stand
		? kanbanBoardStandTitle(content.stand)
		: undefined;
	const systems = kanbanBoardTaskSystems(content);
	task.system = systems[0];
	task.systems = systems;
	task.systemTitle = kanbanBoardTaskSystemsTitle(content) || undefined;
	task.backlogNumber = content.backlogNumber;
	const sprint = lookups.sprintOptions.find(
		(item) => item.id === content.sprintId,
	);
	if (sprint) task.sprintTitle = sprint.label;
	else if (!content.sprintId) task.sprintTitle = undefined;
	const status = KANBAN_BOARD_STATUSES.find(
		(item) => item.id === task.parentId,
	);
	if (status) task.statusTitle = status.title;
}

function applyContent(
	task: KanbanBoardTaskRegistryDto,
	patch: Partial<KanbanBoardTaskContent>,
	lookups: PlanningTaskFieldLookups,
	extras?: { parentId?: string; createdBy?: string | null },
): boolean {
	const before = snapshot(task);
	const content = normalizeKanbanBoardTaskContent({
		...task.content,
		title: task.content.title || task.title,
		...patch,
	});
	if (!content.title.trim()) return false;
	task.content = content;
	if (extras?.parentId !== undefined) task.parentId = extras.parentId;
	if (extras && "createdBy" in extras) task.createdBy = extras.createdBy;
	syncTaskDisplay(task, lookups);
	return snapshot(task) !== before;
}

export function applyPlanningTaskFieldToTask(
	task: KanbanBoardTaskRegistryDto,
	colId: string,
	rawValue: unknown,
	lookups: PlanningTaskFieldLookups = EMPTY_PLANNING_TASK_FIELD_LOOKUPS,
): boolean {
	const roleKey = parseRoleEstimateColId(colId);
	if (roleKey) {
		const nextRoles: KanbanBoardRoleEstimates = {
			...(task.content.roleEstimates ?? {}),
		};
		const parsed = parseOptionalNumber(rawValue);
		if (parsed === undefined) {
			delete nextRoles[roleKey];
		} else {
			nextRoles[roleKey] = parsed;
		}
		return applyContent(
			task,
			{
				roleEstimates: Object.keys(nextRoles).length ? nextRoles : undefined,
			},
			lookups,
		);
	}

	switch (colId) {
		case "title":
			return applyContent(task, { title: text(rawValue) }, lookups);
		case "description":
			return applyContent(
				task,
				{ description: text(rawValue) || undefined },
				lookups,
			);
		case "backlogNumber":
			return applyContent(
				task,
				{ backlogNumber: parseOptionalNumber(rawValue) },
				lookups,
			);
		case "priority":
			return applyContent(
				task,
				{
					priority: findCatalogId(KANBAN_BOARD_PRIORITIES, rawValue),
				},
				lookups,
			);
		case "assignees": {
			const names = parseAssigneeList(rawValue);
			const current = task.content.currentAssignee ?? "";
			return applyContent(
				task,
				resolveAssigneeFields(names, names.includes(current) ? current : ""),
				lookups,
			);
		}
		case "currentAssignee":
			return applyContent(
				task,
				resolveAssigneeFields(
					kanbanBoardTaskAssignees(task.content),
					text(rawValue),
				),
				lookups,
			);
		case "createdBy":
			return applyContent(task, {}, lookups, {
				createdBy: text(rawValue) || null,
			});
		case "taskType":
			return applyContent(
				task,
				{ taskType: findCatalogId(KANBAN_BOARD_TASK_TYPES, rawValue) },
				lookups,
			);
		case "workType":
			return applyContent(
				task,
				{ workType: findCatalogId(KANBAN_BOARD_WORK_TYPES, rawValue) },
				lookups,
			);
		case "stand":
			return applyContent(
				task,
				{ stand: findCatalogId(KANBAN_BOARD_STANDS, rawValue) },
				lookups,
			);
		case "system": {
			const ids = parseAssigneeList(rawValue)
				.map((item) => findCatalogId(KANBAN_BOARD_SYSTEMS, item))
				.filter((id): id is NonNullable<typeof id> => Boolean(id));
			return applyContent(
				task,
				{
					systems: ids,
					system: undefined,
				},
				lookups,
			);
		}
		case "blocker":
			return applyContent(
				task,
				{ hasBlocker: parseBlocker(rawValue) },
				lookups,
			);
		case "estimatePd":
			return applyContent(
				task,
				{
					roleEstimates: undefined,
					estimatePd: parseOptionalNumber(rawValue),
				},
				lookups,
			);
		case "dueDate":
			return applyContent(
				task,
				{ dueDate: text(rawValue) || undefined },
				lookups,
			);
		case "parentTask":
			return applyContent(
				task,
				{ parentTask: resolveParentTask(rawValue, lookups) },
				lookups,
			);
		case "customer":
			return applyContent(
				task,
				{ customer: text(rawValue) || undefined },
				lookups,
			);
		case "sprintId":
			return applyContent(
				task,
				{ sprintId: resolveSprintId(rawValue, lookups) },
				lookups,
			);
		case "streamCustomer":
			return applyContent(
				task,
				{ streamCustomer: text(rawValue) || undefined },
				lookups,
			);
		case "status": {
			const parentId =
				findCatalogId(KANBAN_BOARD_STATUSES, rawValue) ??
				(text(rawValue) === task.statusTitle ? task.parentId : undefined);
			if (!parentId) return false;
			return applyContent(task, {}, lookups, { parentId });
		}
		default:
			return false;
	}
}
