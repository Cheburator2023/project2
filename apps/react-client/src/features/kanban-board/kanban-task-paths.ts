import type { KanbanBoardStatusId } from "@smart-anketa/api-contract";

export function kanbanTaskCreatePath(
	boardId: string,
	column: KanbanBoardStatusId = "backlog",
) {
	const params = new URLSearchParams({ column });
	return `/tracker/boards/${boardId}/tasks/new?${params.toString()}`;
}

export function kanbanTaskEditPath(boardId: string, taskId: string) {
	return `/tracker/boards/${boardId}/tasks/${taskId}`;
}

export const KANBAN_TASK_NEW_ID = "new";

export function isKanbanTaskCreateRoute(taskId: string | undefined) {
	return taskId === KANBAN_TASK_NEW_ID;
}
