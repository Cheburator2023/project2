import {
	KANBAN_BOARD_DONE_COLUMN_ID,
	KANBAN_BOARD_TASK_IMAGE_DONE_RETENTION_DAYS,
} from "@smart-anketa/api-contract";

export function kanbanBoardIsDoneColumn(
	column: Pick<{ id: string; title: string }, "id" | "title">,
): boolean {
	if (column.id === KANBAN_BOARD_DONE_COLUMN_ID) return true;
	return column.title.trim().toLowerCase() === "готово";
}

export function kanbanBoardTaskImageDoneRetentionDays(
	envValue: string | undefined,
): number {
	if (!envValue?.trim()) return KANBAN_BOARD_TASK_IMAGE_DONE_RETENTION_DAYS;
	const parsed = Number(envValue);
	if (!Number.isFinite(parsed) || parsed < 1) {
		return KANBAN_BOARD_TASK_IMAGE_DONE_RETENTION_DAYS;
	}
	return Math.floor(parsed);
}

export function kanbanBoardTaskImageCleanupCutoffIso(retentionDays: number): string {
	return new Date(
		Date.now() - retentionDays * 24 * 60 * 60 * 1000,
	).toISOString();
}
