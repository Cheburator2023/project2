import type { KanbanBoardTaskContent } from "./kanban-board.types";

/** История: `kanban_board_task_history.task_title` varchar(512). */
export const KANBAN_BOARD_TASK_TITLE_MAX_LENGTH = 512;

/** UX-потолок описания (в БД jsonb без лимита). */
export const KANBAN_BOARD_TASK_DESCRIPTION_MAX_LENGTH = 20_000;

export const KANBAN_BOARD_TASK_COMMENT_MAX_LENGTH = 8_000;

export const KANBAN_BOARD_SUBTASK_TEXT_MAX_LENGTH = 512;

/** `kanban_board_columns.title` varchar(255). */
export const KANBAN_BOARD_COLUMN_TITLE_MAX_LENGTH = 255;

export function clampKanbanBoardHistoryTaskTitle(title: string): string {
	if (title.length <= KANBAN_BOARD_TASK_TITLE_MAX_LENGTH) return title;
	return title.slice(0, KANBAN_BOARD_TASK_TITLE_MAX_LENGTH);
}

export function kanbanBoardTextLengthHint(
	length: number,
	max: number,
): { over: boolean; near: boolean; text: string } {
	const over = length > max;
	const near = !over && length >= Math.floor(max * 0.9);
	if (over) {
		return {
			over: true,
			near: false,
			text: `Сократите текст — максимум ${max} символов, иначе сохранение не пройдёт (${length} / ${max})`,
		};
	}
	return { over: false, near, text: `${length} / ${max}` };
}

export type KanbanBoardTaskContentLengthIssue = {
	field: "title" | "description" | "subtask";
	max: number;
	length: number;
	message: string;
};

export function kanbanBoardTaskContentLengthIssues(
	content: Pick<KanbanBoardTaskContent, "title" | "description" | "subtasks">,
): KanbanBoardTaskContentLengthIssue[] {
	const issues: KanbanBoardTaskContentLengthIssue[] = [];
	const titleLen = content.title?.length ?? 0;
	if (titleLen > KANBAN_BOARD_TASK_TITLE_MAX_LENGTH) {
		issues.push({
			field: "title",
			max: KANBAN_BOARD_TASK_TITLE_MAX_LENGTH,
			length: titleLen,
			message: `Заголовок длиннее ${KANBAN_BOARD_TASK_TITLE_MAX_LENGTH} символов (${titleLen})`,
		});
	}
	const descLen = content.description?.length ?? 0;
	if (descLen > KANBAN_BOARD_TASK_DESCRIPTION_MAX_LENGTH) {
		issues.push({
			field: "description",
			max: KANBAN_BOARD_TASK_DESCRIPTION_MAX_LENGTH,
			length: descLen,
			message: `Описание длиннее ${KANBAN_BOARD_TASK_DESCRIPTION_MAX_LENGTH} символов (${descLen})`,
		});
	}
	for (const item of content.subtasks ?? []) {
		const len = item.text?.length ?? 0;
		if (len <= KANBAN_BOARD_SUBTASK_TEXT_MAX_LENGTH) continue;
		const preview = (item.text ?? "").trim().slice(0, 24);
		issues.push({
			field: "subtask",
			max: KANBAN_BOARD_SUBTASK_TEXT_MAX_LENGTH,
			length: len,
			message: `Подзадача${preview ? ` «${preview}»` : ""} длиннее ${KANBAN_BOARD_SUBTASK_TEXT_MAX_LENGTH} символов (${len})`,
		});
	}
	return issues;
}

export function kanbanBoardTaskContentLengthErrorMessage(
	content: Pick<KanbanBoardTaskContent, "title" | "description" | "subtasks">,
): string | null {
	const issues = kanbanBoardTaskContentLengthIssues(content);
	if (!issues.length) return null;
	return issues.map((issue) => issue.message).join(". ");
}

export function kanbanBoardCommentLengthError(body: string): string | null {
	if (body.length <= KANBAN_BOARD_TASK_COMMENT_MAX_LENGTH) return null;
	return `Комментарий длиннее ${KANBAN_BOARD_TASK_COMMENT_MAX_LENGTH} символов (${body.length})`;
}

export function kanbanBoardColumnTitleLengthError(
	title: string,
): string | null {
	if (title.length <= KANBAN_BOARD_COLUMN_TITLE_MAX_LENGTH) return null;
	return `Название колонки длиннее ${KANBAN_BOARD_COLUMN_TITLE_MAX_LENGTH} символов (${title.length})`;
}
