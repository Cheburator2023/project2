import {
	kanbanBoardIsDoneColumn,
	kanbanBoardTaskImageCleanupCutoffIso,
	kanbanBoardTaskImageDoneRetentionDays,
} from "../../../../src/modules/kanban-board/utils/kanban-board-task-image.util";

describe("kanban-board-task-image.util", () => {
	it("detects done column by id and title", () => {
		expect(kanbanBoardIsDoneColumn({ id: "done", title: "Готово" })).toBe(true);
		expect(kanbanBoardIsDoneColumn({ id: "custom", title: "готово" })).toBe(
			true,
		);
		expect(kanbanBoardIsDoneColumn({ id: "todo", title: "К выполнению" })).toBe(
			false,
		);
	});

	it("parses retention days from env", () => {
		expect(kanbanBoardTaskImageDoneRetentionDays(undefined)).toBe(7);
		expect(kanbanBoardTaskImageDoneRetentionDays("14")).toBe(14);
		expect(kanbanBoardTaskImageDoneRetentionDays("0")).toBe(7);
		expect(kanbanBoardTaskImageDoneRetentionDays("bad")).toBe(7);
	});

	it("builds cutoff iso in the past", () => {
		const cutoff = kanbanBoardTaskImageCleanupCutoffIso(7);
		expect(Date.parse(cutoff)).toBeLessThan(Date.now());
	});
});
