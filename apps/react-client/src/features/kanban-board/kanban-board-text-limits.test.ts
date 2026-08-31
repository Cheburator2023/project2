import { describe, expect, it } from "vitest";
import {
	KANBAN_BOARD_COLUMN_TITLE_MAX_LENGTH,
	KANBAN_BOARD_SUBTASK_TEXT_MAX_LENGTH,
	KANBAN_BOARD_TASK_COMMENT_MAX_LENGTH,
	KANBAN_BOARD_TASK_DESCRIPTION_MAX_LENGTH,
	KANBAN_BOARD_TASK_TITLE_MAX_LENGTH,
	clampKanbanBoardHistoryTaskTitle,
	kanbanBoardColumnTitleLengthError,
	kanbanBoardCommentLengthError,
	kanbanBoardTaskContentLengthErrorMessage,
	kanbanBoardTaskContentLengthIssues,
	kanbanBoardTextLengthHint,
} from "@smart-anketa/api-contract";

describe("kanbanBoardTextLengthHint", () => {
	it("shows a counter under the limit and an explicit save warning over it", () => {
		expect(kanbanBoardTextLengthHint(12, 512)).toEqual({
			over: false,
			near: false,
			text: "12 / 512",
		});
		expect(kanbanBoardTextLengthHint(512, 512).over).toBe(false);
		expect(kanbanBoardTextLengthHint(461, 512).near).toBe(true);
		expect(kanbanBoardTextLengthHint(513, 512)).toMatchObject({
			over: true,
			near: false,
		});
		expect(kanbanBoardTextLengthHint(513, 512).text).toContain(
			"сохранение не пройдёт",
		);
	});
});

describe("kanbanBoardTaskContentLengthIssues", () => {
	it("rejects a title that would overflow history.task_title varchar(512)", () => {
		const title = "а".repeat(KANBAN_BOARD_TASK_TITLE_MAX_LENGTH + 1);
		const issues = kanbanBoardTaskContentLengthIssues({ title });
		expect(issues).toHaveLength(1);
		expect(issues[0]?.field).toBe("title");
		expect(kanbanBoardTaskContentLengthErrorMessage({ title })).toContain(
			"Заголовок длиннее 512",
		);
	});

	it("rejects overlong description and subtask text", () => {
		const issues = kanbanBoardTaskContentLengthIssues({
			title: "Ок",
			description: "b".repeat(KANBAN_BOARD_TASK_DESCRIPTION_MAX_LENGTH + 1),
			subtasks: [
				{
					id: "1",
					text: "c".repeat(KANBAN_BOARD_SUBTASK_TEXT_MAX_LENGTH + 1),
					status: "next_up",
				},
			],
		});
		expect(issues.map((item) => item.field)).toEqual([
			"description",
			"subtask",
		]);
	});

	it("accepts content at the limits", () => {
		expect(
			kanbanBoardTaskContentLengthErrorMessage({
				title: "т".repeat(KANBAN_BOARD_TASK_TITLE_MAX_LENGTH),
				description: "о".repeat(KANBAN_BOARD_TASK_DESCRIPTION_MAX_LENGTH),
				subtasks: [
					{
						id: "1",
						text: "п".repeat(KANBAN_BOARD_SUBTASK_TEXT_MAX_LENGTH),
						status: "done",
					},
				],
			}),
		).toBeNull();
	});
});

describe("clampKanbanBoardHistoryTaskTitle", () => {
	it("keeps history writes inside varchar(512)", () => {
		const over = "x".repeat(600);
		expect(clampKanbanBoardHistoryTaskTitle(over)).toHaveLength(
			KANBAN_BOARD_TASK_TITLE_MAX_LENGTH,
		);
		expect(clampKanbanBoardHistoryTaskTitle("короткий")).toBe("короткий");
	});
});

describe("comment and column limits", () => {
	it("reports over-limit comments and column titles", () => {
		expect(
			kanbanBoardCommentLengthError(
				"к".repeat(KANBAN_BOARD_TASK_COMMENT_MAX_LENGTH + 1),
			),
		).toContain("Комментарий длиннее");
		expect(
			kanbanBoardColumnTitleLengthError(
				"к".repeat(KANBAN_BOARD_COLUMN_TITLE_MAX_LENGTH + 1),
			),
		).toContain("Название колонки длиннее");
		expect(kanbanBoardCommentLengthError("ок")).toBeNull();
		expect(kanbanBoardColumnTitleLengthError("Готово")).toBeNull();
	});
});
