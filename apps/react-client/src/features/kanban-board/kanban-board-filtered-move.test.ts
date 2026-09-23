import { describe, expect, it } from "vitest";
import type { KanbanBoardData } from "@smart-anketa/api-contract";
import { normalizeKanbanBoardData } from "@smart-anketa/api-contract";
import { dropHandler } from "react-kanban-kit";

describe("filtered board card move", () => {
	it("moves a visible card and keeps cards hidden by the filter in the column", () => {
		const board: KanbanBoardData = {
			root: {
				id: "root",
				title: "Root",
				parentId: null,
				children: ["todo", "doing"],
				totalChildrenCount: 2,
			},
			todo: {
				id: "todo",
				title: "Todo",
				parentId: "root",
				children: ["hidden", "visible"],
				totalChildrenCount: 2,
			},
			doing: {
				id: "doing",
				title: "Doing",
				parentId: "root",
				children: ["other"],
				totalChildrenCount: 1,
			},
			hidden: {
				id: "hidden",
				title: "Hidden",
				parentId: "todo",
				children: [],
				totalChildrenCount: 0,
				type: "card",
			},
			visible: {
				id: "visible",
				title: "Visible",
				parentId: "todo",
				children: [],
				totalChildrenCount: 0,
				type: "card",
			},
			other: {
				id: "other",
				title: "Other",
				parentId: "doing",
				children: [],
				totalChildrenCount: 0,
				type: "card",
			},
		};

		const moved = normalizeKanbanBoardData(
			dropHandler(
				{
					cardId: "visible",
					fromColumnId: "todo",
					toColumnId: "doing",
					taskAbove: "other",
					taskBelow: null,
					position: 1,
				},
				board,
			) as KanbanBoardData,
		);

		expect(moved.todo.children).toEqual(["hidden"]);
		expect(moved.doing.children).toEqual(["other", "visible"]);
		expect(moved.visible.parentId).toBe("doing");
	});
});
