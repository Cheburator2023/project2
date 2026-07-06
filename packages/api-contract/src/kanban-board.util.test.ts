import { describe, expect, it } from "vitest";
import {
	boardsEquivalent,
	defaultKanbanBoardColumns,
	fromBoardData,
	kanbanBoardEffectiveEstimatePd,
	kanbanBoardEffectiveSprintCapacityPd,
	kanbanBoardRoleEstimatesTotal,
	kanbanBoardTaskAssigneeRoles,
	normalizeKanbanBoardTaskContent,
	normalizeKanbanBoardSubtasks,
	kanbanBoardSubtasksProgress,
	toBoardData,
	type KanbanBoardData,
} from "@smart-anketa/api-contract";

const boardColumns = defaultKanbanBoardColumns("board-1").map((column) => ({
	...column,
	createdAt: "2026-06-16T12:00:00.000Z",
	updatedAt: "2026-06-16T12:00:00.000Z",
}));

function sampleBoard(): KanbanBoardData {
	const columns = defaultKanbanBoardColumns("board-1");
	const columnIds = columns.map((column) => column.id);
	const board: KanbanBoardData = {
		root: {
			id: "root",
			title: "Root",
			parentId: null,
			children: columnIds,
			totalChildrenCount: columnIds.length,
		},
	};
	for (const column of columns) {
		board[column.id] = {
			id: column.id,
			title: column.title,
			parentId: "root",
			children: column.id === "todo" ? ["task-1"] : [],
			totalChildrenCount: column.id === "todo" ? 1 : 0,
		};
	}
	board["task-1"] = {
		id: "task-1",
		title: "Demo",
		parentId: "todo",
		children: [],
		totalChildrenCount: 0,
		type: "card",
		content: { title: "Demo", priority: "medium" },
		origin: "local-dev",
	};
	return board;
}

describe("kanban board mapping", () => {
	it("preserves board structure in fromBoardData → toBoardData cycle", () => {
		const board = sampleBoard();
		const rows = fromBoardData(board, "local-dev", "2026-06-16T12:00:00.000Z", "board-1");
		const restored = toBoardData(rows, boardColumns);
		expect(boardsEquivalent(board, restored)).toBe(true);
	});
});

describe("kanban board role estimates", () => {
	it("sums role estimates and normalizes estimatePd", () => {
		expect(
			kanbanBoardRoleEstimatesTotal({
				analyst: 0.5,
				developer: 2,
				qa: 0.5,
			}),
		).toBe(3);
		const normalized = normalizeKanbanBoardTaskContent({
			title: "Task",
			roleEstimates: { developer: 2, qa: 1 },
		});
		expect(normalized.estimatePd).toBe(3);
		expect(kanbanBoardEffectiveEstimatePd(normalized)).toBe(3);
	});

	it("preserves images when images field is omitted on update", () => {
		const withImages = normalizeKanbanBoardTaskContent({
			title: "Task",
			images: [
				{
					id: "img1",
					name: "shot.png",
					width: 100,
					height: 50,
					fullByteSize: 1000,
					thumbByteSize: 200,
					createdAt: "2026-06-16T12:00:00.000Z",
				},
			],
		});
		const updated = normalizeKanbanBoardTaskContent({
			title: "Task updated",
			images: withImages.images,
		});
		expect(updated.images).toHaveLength(1);

		const titleOnly = normalizeKanbanBoardTaskContent({
			title: "Task updated again",
		});
		expect(titleOnly.images).toBeUndefined();
	});
});

describe("kanban board sprint capacity", () => {
	it("uses individual capacity or default", () => {
		expect(
			kanbanBoardEffectiveSprintCapacityPd({
				sprintCapacityPd: 6,
				defaultSprintCapacityPd: 9,
			}),
		).toBe(6);
		expect(
			kanbanBoardEffectiveSprintCapacityPd({
				sprintCapacityPd: null,
				defaultSprintCapacityPd: 9,
			}),
		).toBe(9);
	});
});

describe("kanban board subtasks", () => {
	it("normalizes and counts progress", () => {
		const normalized = normalizeKanbanBoardSubtasks([
			{ id: "a", text: " One ", done: true },
			{ id: "b", text: "", done: false },
			{ id: "c", text: "Two", done: false },
		]);
		expect(normalized).toEqual([
			{ id: "a", text: "One", status: "done" },
			{ id: "c", text: "Two", status: "next_up" },
		]);
		expect(kanbanBoardSubtasksProgress({ subtasks: normalized })).toEqual({
			done: 1,
			total: 2,
		});
	});

	it("keeps explicit status", () => {
		const normalized = normalizeKanbanBoardSubtasks([
			{ id: "a", text: "Review", status: "in_review" },
		]);
		expect(normalized).toEqual([
			{ id: "a", text: "Review", status: "in_review" },
		]);
	});

	it("keeps qa status", () => {
		const normalized = normalizeKanbanBoardSubtasks([
			{ id: "a", text: "Check regression", status: "qa" },
		]);
		expect(normalized).toEqual([
			{ id: "a", text: "Check regression", status: "qa" },
		]);
	});
});
