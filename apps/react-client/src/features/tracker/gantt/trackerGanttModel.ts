import type { ITask } from "@svar-ui/react-gantt";
import type {
	KanbanBoardSprintDto,
	KanbanBoardTaskRegistryDto,
} from "@smart-anketa/api-contract";
import { addDays, differenceInCalendarDays, parseISO, startOfDay } from "date-fns";
import {
	TRACKER_GANTT_MAX_TIMELINE_DAYS,
	TRACKER_GANTT_TIMELINE_PADDING_DAYS,
} from "./trackerGanttConfig";
import {
	TRACKER_GANTT_UNASSIGNED_SPRINT_ID,
	trackerGanttSprintId,
} from "./trackerGanttIds";

export type TrackerGanttTaskMeta = {
	trackerKind: "sprint" | "task";
	trackerTaskId?: string;
	trackerBoardId?: string;
	projectCode?: string;
	sprintId?: string | null;
};

export type TrackerGanttFilters = {
	projectCode?: string;
	sprintId?: string;
};

const DEFAULT_TASK_DURATION_DAYS = 1;
const DEFAULT_SPRINT_DURATION_DAYS = 14;

function parseTrackerDate(value: string | null | undefined): Date | null {
	if (!value?.trim()) return null;
	const normalized = value.trim();
	try {
		if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
			return startOfDay(parseISO(normalized));
		}
		const parsed = new Date(normalized);
		return Number.isNaN(parsed.getTime()) ? null : startOfDay(parsed);
	} catch {
		return null;
	}
}

function taskDurationDays(task: KanbanBoardTaskRegistryDto): number {
	const estimate = task.effectiveEstimatePd ?? task.estimatePd ?? task.content.estimatePd;
	if (typeof estimate === "number" && estimate > 0) {
		return Math.max(1, Math.ceil(estimate));
	}
	return DEFAULT_TASK_DURATION_DAYS;
}

export function resolveTaskBarDates(task: KanbanBoardTaskRegistryDto): {
	start: Date;
	end: Date;
	duration: number;
} {
	const duration = taskDurationDays(task);
	const dueDate = parseTrackerDate(task.dueDate ?? task.content.dueDate);
	if (dueDate) {
		return {
			start: addDays(dueDate, -(duration - 1)),
			end: dueDate,
			duration,
		};
	}

	const today = startOfDay(new Date());
	return {
		start: today,
		end: addDays(today, duration - 1),
		duration,
	};
}

function resolveSprintDates(
	sprint: KanbanBoardSprintDto,
	childTasks: KanbanBoardTaskRegistryDto[],
): { start: Date; end: Date; duration: number } {
	const start =
		parseTrackerDate(sprint.startDate) ??
		startOfDay(new Date());
	const explicitEnd = parseTrackerDate(sprint.endDate);
	if (explicitEnd && explicitEnd >= start) {
		return {
			start,
			end: explicitEnd,
			duration: differenceInCalendarDays(explicitEnd, start) + 1,
		};
	}

	let end = addDays(start, DEFAULT_SPRINT_DURATION_DAYS - 1);
	for (const task of childTasks) {
		const { end: taskEnd } = resolveTaskBarDates(task);
		if (taskEnd > end) end = taskEnd;
	}

	return {
		start,
		end,
		duration: differenceInCalendarDays(end, start) + 1,
	};
}

function filterRegistryTasks(
	tasks: KanbanBoardTaskRegistryDto[],
	filters: TrackerGanttFilters,
): KanbanBoardTaskRegistryDto[] {
	return tasks.filter((task) => {
		if (filters.projectCode && task.projectCode !== filters.projectCode) {
			return false;
		}
		if (filters.sprintId) {
			const sprintId = task.content.sprintId ?? null;
			if (filters.sprintId === "unassigned") {
				return !sprintId;
			}
			return sprintId === filters.sprintId;
		}
		return true;
	});
}

function buildSprintSummaryTask(
	sprint: KanbanBoardSprintDto,
	childTasks: KanbanBoardTaskRegistryDto[],
	open: boolean,
): ITask & TrackerGanttTaskMeta {
	const { start, end, duration } = resolveSprintDates(sprint, childTasks);
	return {
		id: trackerGanttSprintId(sprint.id),
		type: "summary",
		open,
		text: `${sprint.code} — ${sprint.name}`,
		start,
		end,
		duration,
		progress: 0,
		trackerKind: "sprint",
		sprintId: sprint.id,
	};
}

function buildUnassignedSummaryTask(
	childTasks: KanbanBoardTaskRegistryDto[],
	open: boolean,
): ITask & TrackerGanttTaskMeta {
	let start = startOfDay(new Date());
	let end = addDays(start, DEFAULT_SPRINT_DURATION_DAYS - 1);
	for (const task of childTasks) {
		const bar = resolveTaskBarDates(task);
		if (bar.start < start) start = bar.start;
		if (bar.end > end) end = bar.end;
	}

	return {
		id: TRACKER_GANTT_UNASSIGNED_SPRINT_ID,
		type: "summary",
		open,
		text: "Без спринта",
		start,
		end,
		duration: differenceInCalendarDays(end, start) + 1,
		progress: 0,
		trackerKind: "sprint",
		sprintId: null,
	};
}

function buildTaskRow(task: KanbanBoardTaskRegistryDto): ITask & TrackerGanttTaskMeta {
	const sprintId = task.content.sprintId ?? null;
	const { start, end, duration } = resolveTaskBarDates(task);
	const details = [
		task.projectName,
		task.boardName,
		task.statusTitle,
		task.currentAssigneeTitle || task.assigneeTitle,
	]
		.filter(Boolean)
		.join(" · ");

	return {
		id: task.id,
		type: "task",
		parent: sprintId ? trackerGanttSprintId(sprintId) : TRACKER_GANTT_UNASSIGNED_SPRINT_ID,
		text: task.title,
		details,
		start,
		end,
		duration,
		progress: 0,
		trackerKind: "task",
		trackerTaskId: task.id,
		trackerBoardId: task.boardId,
		projectCode: task.projectCode,
		sprintId,
	};
}

export function buildTrackerGanttTasks(input: {
	tasks: KanbanBoardTaskRegistryDto[];
	sprints: KanbanBoardSprintDto[];
	filters?: TrackerGanttFilters;
}): Array<ITask & TrackerGanttTaskMeta> {
	const filters = input.filters ?? {};
	const filteredTasks = filterRegistryTasks(input.tasks, filters);
	const sprintIdsInData = new Set(
		filteredTasks
			.map((task) => task.content.sprintId)
			.filter((value): value is string => Boolean(value)),
	);

	const sprintsToShow = input.sprints.filter((sprint) => {
		if (filters.sprintId && filters.sprintId !== "unassigned") {
			return sprint.id === filters.sprintId;
		}
		if (filters.sprintId === "unassigned") return false;
		return sprintIdsInData.has(sprint.id);
	});

	const tasksBySprint = new Map<string, KanbanBoardTaskRegistryDto[]>();
	const unassigned: KanbanBoardTaskRegistryDto[] = [];

	for (const task of filteredTasks) {
		const sprintId = task.content.sprintId;
		if (!sprintId) {
			unassigned.push(task);
			continue;
		}
		const bucket = tasksBySprint.get(sprintId) ?? [];
		bucket.push(task);
		tasksBySprint.set(sprintId, bucket);
	}

	const result: Array<ITask & TrackerGanttTaskMeta> = [];

	for (const sprint of sprintsToShow) {
		const children = tasksBySprint.get(sprint.id) ?? [];
		result.push(buildSprintSummaryTask(sprint, children, true));
		for (const task of children) {
			result.push(buildTaskRow(task));
		}
	}

	const showUnassigned =
		unassigned.length > 0 &&
		(!filters.sprintId || filters.sprintId === "unassigned");

	if (showUnassigned) {
		result.push(buildUnassignedSummaryTask(unassigned, true));
		for (const task of unassigned) {
			result.push(buildTaskRow(task));
		}
	}

	return result;
}

export function formatTrackerDueDate(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

export function estimatePdFromGanttBar(start: Date, end: Date): number {
	return Math.max(1, differenceInCalendarDays(end, start) + 1);
}

type TimelineTask = Pick<ITask, "start" | "end">;

/** Границы шкалы времени — иначе Gantt рисует всю ось в полную ширину страницы. */
export function resolveTrackerGanttTimelineBounds(
	tasks: TimelineTask[],
	now = new Date(),
): { start: Date; end: Date } {
	let min: Date | null = null;
	let max: Date | null = null;

	for (const task of tasks) {
		for (const date of [task.start, task.end]) {
			if (!date) continue;
			if (!min || date < min) min = date;
			if (!max || date > max) max = date;
		}
	}

	const fallbackStart = startOfDay(now);
	if (!min || !max) {
		return {
			start: fallbackStart,
			end: addDays(fallbackStart, 30),
		};
	}

	let start = addDays(min, -TRACKER_GANTT_TIMELINE_PADDING_DAYS);
	let end = addDays(max, TRACKER_GANTT_TIMELINE_PADDING_DAYS);

	const spanDays = differenceInCalendarDays(end, start) + 1;
	if (spanDays > TRACKER_GANTT_MAX_TIMELINE_DAYS) {
		const center = addDays(start, Math.floor(spanDays / 2));
		const half = Math.floor(TRACKER_GANTT_MAX_TIMELINE_DAYS / 2);
		start = addDays(center, -half);
		end = addDays(center, half);
	}

	return { start, end };
}
