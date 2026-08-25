import {
	KANBAN_BOARD_PLANNING_UNTHEMED_ID,
	KANBAN_BOARD_ROLE_ESTIMATE_FIELDS,
	kanbanBoardAssigneeRoleTitle,
	kanbanBoardEffectiveEstimatePd,
	kanbanBoardRoleEstimatesTotal,
	kanbanBoardTaskAssignees,
	type KanbanBoardAssigneeRoleId,
	type KanbanBoardReleaseTaskDto,
	type KanbanBoardRoleEstimates,
} from "@smart-anketa/api-contract";

export const PLANNING_ASSIGNEE_UNASSIGNED = "Без исполнителя";

export type PlanningAssigneeDirectoryPerson = {
	name: string;
	role?: KanbanBoardAssigneeRoleId | null;
	roleTitle?: string;
	effectiveSprintCapacityPd?: number;
};

export type PlanningAssigneeLoadRow = {
	assigneeName: string;
	roleTitle: string;
	taskCount: number;
	totalPd: number;
	capacityPd?: number;
	loadPercent?: number;
	byRelease: Record<string, number>;
	byTheme: Record<string, number>;
};

function addPd(target: Record<string, number>, key: string, pd: number) {
	if (!pd) return;
	target[key] = (target[key] ?? 0) + pd;
}

function uniqueTaskAssigneeNames(
	task: KanbanBoardReleaseTaskDto["task"],
): string[] {
	const names = new Set(kanbanBoardTaskAssignees(task.content));
	const current = task.content.currentAssignee?.trim();
	if (current) names.add(current);
	if (task.currentAssigneeTitle?.trim())
		names.add(task.currentAssigneeTitle.trim());
	for (const name of task.assignees ?? []) {
		const trimmed = name.trim();
		if (trimmed) names.add(trimmed);
	}
	return [...names];
}

function addShare(shares: Map<string, number>, name: string, pd: number) {
	if (!pd) return;
	shares.set(name, (shares.get(name) ?? 0) + pd);
}

/** Раскладывает оценку задачи по исполнителям: сначала по ролям, иначе поровну. */
export function allocatePlanningTaskEstimatePd(
	task: KanbanBoardReleaseTaskDto["task"],
	roleByName: ReadonlyMap<string, KanbanBoardAssigneeRoleId | null | undefined>,
): Map<string, number> {
	const shares = new Map<string, number>();
	const assignees = uniqueTaskAssigneeNames(task);
	const total = kanbanBoardEffectiveEstimatePd(task.content) ?? 0;
	if (!assignees.length) {
		addShare(shares, PLANNING_ASSIGNEE_UNASSIGNED, total);
		return shares;
	}
	if (!total) return shares;

	const roleEstimates = task.content.roleEstimates;
	if (kanbanBoardRoleEstimatesTotal(roleEstimates) === undefined) {
		const each = total / assignees.length;
		for (const name of assignees) addShare(shares, name, each);
		return shares;
	}

	let leftover = 0;
	for (const field of KANBAN_BOARD_ROLE_ESTIMATE_FIELDS) {
		const amount = roleEstimates?.[field.key as keyof KanbanBoardRoleEstimates];
		if (
			amount === undefined ||
			amount === null ||
			Number.isNaN(amount) ||
			!amount
		) {
			continue;
		}
		const matching = assignees.filter(
			(name) => roleByName.get(name) === field.key,
		);
		if (!matching.length) {
			leftover += amount;
			continue;
		}
		const each = amount / matching.length;
		for (const name of matching) addShare(shares, name, each);
	}

	if (leftover) {
		const current = task.content.currentAssignee?.trim();
		const fallback =
			current && assignees.includes(current) ? [current] : assignees;
		const each = leftover / fallback.length;
		for (const name of fallback) addShare(shares, name, each);
	}

	return shares;
}

export function buildPlanningAssigneeLoadRows(input: {
	tasks: KanbanBoardReleaseTaskDto[];
	directory?: PlanningAssigneeDirectoryPerson[];
}): PlanningAssigneeLoadRow[] {
	const directory = input.directory ?? [];
	const roleByName = new Map(
		directory.map((person) => [person.name, person.role ?? null]),
	);
	const roleTitleByName = new Map(
		directory.map((person) => [
			person.name,
			person.roleTitle ||
				kanbanBoardAssigneeRoleTitle(person.role ?? undefined),
		]),
	);
	const capacityByName = new Map(
		directory.map((person) => [person.name, person.effectiveSprintCapacityPd]),
	);

	const rows = new Map<string, PlanningAssigneeLoadRow>();

	const ensureRow = (name: string): PlanningAssigneeLoadRow => {
		const existing = rows.get(name);
		if (existing) return existing;
		const created: PlanningAssigneeLoadRow = {
			assigneeName: name,
			roleTitle:
				name === PLANNING_ASSIGNEE_UNASSIGNED
					? ""
					: (roleTitleByName.get(name) ?? ""),
			taskCount: 0,
			totalPd: 0,
			capacityPd: capacityByName.get(name),
			byRelease: {},
			byTheme: {},
		};
		rows.set(name, created);
		return created;
	};

	for (const item of input.tasks) {
		const names = uniqueTaskAssigneeNames(item.task);
		const shares = allocatePlanningTaskEstimatePd(item.task, roleByName);
		const themeKey = item.themeId ?? KANBAN_BOARD_PLANNING_UNTHEMED_ID;
		const counted = names.length ? names : [PLANNING_ASSIGNEE_UNASSIGNED];
		for (const name of counted) {
			const row = ensureRow(name);
			row.taskCount += 1;
			const pd = shares.get(name) ?? 0;
			row.totalPd += pd;
			addPd(row.byRelease, item.releaseId, pd);
			addPd(row.byTheme, themeKey, pd);
		}
		for (const [name, pd] of shares) {
			if (counted.includes(name)) continue;
			const row = ensureRow(name);
			row.totalPd += pd;
			addPd(row.byRelease, item.releaseId, pd);
			addPd(row.byTheme, themeKey, pd);
		}
	}

	const result = [...rows.values()].map((row) => ({
		...row,
		loadPercent:
			row.capacityPd && row.capacityPd > 0
				? (row.totalPd / row.capacityPd) * 100
				: undefined,
	}));

	result.sort((left, right) => {
		if (left.assigneeName === PLANNING_ASSIGNEE_UNASSIGNED) return 1;
		if (right.assigneeName === PLANNING_ASSIGNEE_UNASSIGNED) return -1;
		return left.assigneeName.localeCompare(right.assigneeName, "ru");
	});
	return result;
}

export function buildPlanningAssigneeLoadFooter(
	rows: PlanningAssigneeLoadRow[],
	taskCount: number,
): PlanningAssigneeLoadRow {
	const byRelease: Record<string, number> = {};
	const byTheme: Record<string, number> = {};
	let totalPd = 0;
	let capacityPd = 0;
	let hasCapacity = false;
	for (const row of rows) {
		totalPd += row.totalPd;
		if (row.capacityPd !== undefined) {
			capacityPd += row.capacityPd;
			hasCapacity = true;
		}
		for (const [key, value] of Object.entries(row.byRelease)) {
			addPd(byRelease, key, value);
		}
		for (const [key, value] of Object.entries(row.byTheme)) {
			addPd(byTheme, key, value);
		}
	}
	return {
		assigneeName: "Всего",
		roleTitle: "",
		taskCount,
		totalPd,
		capacityPd: hasCapacity ? capacityPd : undefined,
		loadPercent:
			hasCapacity && capacityPd > 0 ? (totalPd / capacityPd) * 100 : undefined,
		byRelease,
		byTheme,
	};
}
