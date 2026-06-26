export function kanbanBoardPath(boardId: string) {
	return `/tracker/boards/${boardId}`;
}

export function kanbanTaskCreatePath(boardId: string, column = "backlog") {
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
