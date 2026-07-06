import type {
	KanbanBoardBoardDto,
	KanbanBoardTaskRegistryDto,
} from "@smart-anketa/api-contract";
import { normalizeTrackerCode } from "@smart-anketa/api-contract";

export function trackerBoardPath(board: Pick<KanbanBoardBoardDto, "boardKey"> | string) {
	const key = typeof board === "string" ? board : board.boardKey;
	return `/tracker/board/${encodeURIComponent(key)}`;
}

export function trackerBoardHistoryPath(boardKey?: string) {
	if (!boardKey?.trim()) return "/tracker/history";
	return `/tracker/board/${encodeURIComponent(normalizeTrackerCode(boardKey))}/history`;
}

export function trackerTaskPath(
	task: Pick<KanbanBoardTaskRegistryDto, "taskKey"> | string,
) {
	const key = typeof task === "string" ? task : task.taskKey;
	return `/tracker/task/${encodeURIComponent(key)}`;
}

export function trackerTaskCreatePath(boardKey: string, column = "todo") {
	const params = new URLSearchParams({ column });
	return `/tracker/board/${encodeURIComponent(boardKey)}/task/new?${params.toString()}`;
}

export function trackerStandaloneTaskCreatePath(boardKey?: string) {
	if (!boardKey?.trim()) return "/tracker/task/new";
	const params = new URLSearchParams({ board: normalizeTrackerCode(boardKey) });
	return `/tracker/task/new?${params.toString()}`;
}

export const TRACKER_TASK_NEW_SEGMENT = "new";

export function isTrackerTaskCreateRoute(taskKey: string | undefined) {
	return taskKey === TRACKER_TASK_NEW_SEGMENT;
}

/** @deprecated используйте trackerBoardPath */
export function kanbanBoardPath(board: Pick<KanbanBoardBoardDto, "boardKey"> | string) {
	return trackerBoardPath(board);
}

/** @deprecated используйте trackerTaskPath */
export function kanbanTaskEditPath(
	task: Pick<KanbanBoardTaskRegistryDto, "taskKey"> | string,
) {
	return trackerTaskPath(task);
}

/** @deprecated используйте trackerTaskCreatePath */
export function kanbanTaskCreatePath(boardKey: string, column = "todo") {
	return trackerTaskCreatePath(boardKey, column);
}

export const KANBAN_TASK_NEW_ID = TRACKER_TASK_NEW_SEGMENT;

export function isKanbanTaskCreateRoute(taskId: string | undefined) {
	return isTrackerTaskCreateRoute(taskId);
}

export function trackerProjectPath(code: string) {
	return `/tracker/project/${encodeURIComponent(normalizeTrackerCode(code))}`;
}

export function trackerAssigneePath(code: string) {
	return `/tracker/assignee/${encodeURIComponent(normalizeTrackerCode(code))}`;
}

export function trackerCustomerPath(code: string) {
	return `/tracker/customer/${encodeURIComponent(normalizeTrackerCode(code))}`;
}

export function trackerSprintPath(code: string) {
	return `/tracker/sprint/${encodeURIComponent(normalizeTrackerCode(code))}`;
}

export function trackerSupersprintPath(code: string) {
	return `/tracker/supersprint/${encodeURIComponent(normalizeTrackerCode(code))}`;
}

export function trackerStreamPath(code: string) {
	return `/tracker/stream/${encodeURIComponent(normalizeTrackerCode(code))}`;
}
