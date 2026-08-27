import { describe, expect, it } from "vitest";
import {
	boardsEquivalent,
	countKanbanBoardBlockers,
	defaultKanbanBoardColumns,
	findKanbanBoardCancelledColumnId,
	fromBoardData,
	kanbanBoardColumnCanTrashTasks,
	kanbanBoardEffectiveEstimatePd,
	kanbanBoardEffectiveSprintCapacityPd,
	kanbanBoardIsCancelledColumn,
	kanbanBoardReleaseImageVersionsTitle,
	kanbanBoardRoleEstimatesTotal,
	kanbanBoardSubtasksProgress,
	kanbanBoardTaskReleaseLabel,
	kanbanBoardTaskReleasesTitle,
	moveKanbanBoardCardToColumn,
	normalizeKanbanBoardReleaseImageVersions,
	normalizeKanbanBoardSubtasks,
	normalizeKanbanBoardTaskContent,
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
		const rows = fromBoardData(
			board,
			"local-dev",
			"2026-06-16T12:00:00.000Z",
			"board-1",
		);
		const restored = toBoardData(rows, boardColumns);
		expect(boardsEquivalent(board, restored)).toBe(true);
	});

	it("counts tasks with hasBlocker", () => {
		const board = sampleBoard();
		expect(countKanbanBoardBlockers(board)).toBe(0);
		board["task-1"] = {
			...board["task-1"],
			content: { title: "Demo", hasBlocker: true },
		};
		expect(countKanbanBoardBlockers(board)).toBe(1);
	});

	it("places cancelled column immediately before done", () => {
		const columns = defaultKanbanBoardColumns("board-1");
		const ids = columns.map((column) => column.id);
		expect(ids.indexOf("cancelled")).toBe(ids.indexOf("done") - 1);
		expect(columns.find((column) => column.id === "cancelled")?.title).toBe(
			"Отменено",
		);
	});

	it("moves a card into the cancelled column", () => {
		const board = sampleBoard();
		expect(findKanbanBoardCancelledColumnId([{ id: "cancelled" }])).toBe(
			"cancelled",
		);
		expect(kanbanBoardIsCancelledColumn({ id: "todo", title: "Отменено" })).toBe(
			true,
		);
		const moved = moveKanbanBoardCardToColumn(board, "task-1", "cancelled");
		expect(moved).not.toBeNull();
		expect(moved?.["task-1"].parentId).toBe("cancelled");
		expect(moved?.todo.children).not.toContain("task-1");
		expect(moved?.cancelled.children).toContain("task-1");
	});

	it("allows trash-all only for done and cancelled columns", () => {
		expect(
			kanbanBoardColumnCanTrashTasks({ id: "done", title: "Готово" }),
		).toBe(true);
		expect(
			kanbanBoardColumnCanTrashTasks({ id: "cancelled", title: "Отменено" }),
		).toBe(true);
		expect(
			kanbanBoardColumnCanTrashTasks({ id: "todo", title: "К выполнению" }),
		).toBe(false);
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

	it("stores hasBlocker as a boolean so JSON merge can turn it off", () => {
		expect(
			normalizeKanbanBoardTaskContent({ title: "Task", hasBlocker: true })
				.hasBlocker,
		).toBe(true);
		expect(
			normalizeKanbanBoardTaskContent({ title: "Task", hasBlocker: false })
				.hasBlocker,
		).toBe(false);
		expect(
			JSON.parse(
				JSON.stringify(
					normalizeKanbanBoardTaskContent({
						title: "Task",
						hasBlocker: false,
					}),
				),
			).hasBlocker,
		).toBe(false);
	});

	it("keeps a known system id", () => {
		expect(
			normalizeKanbanBoardTaskContent({
				title: "Task",
				system: "smart-anketa",
			}).system,
		).toBe("smart-anketa");
		expect(
			normalizeKanbanBoardTaskContent({
				title: "Task",
				system: "unknown",
			}).system,
		).toBeUndefined();
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

describe("kanbanBoardTaskReleaseLabel", () => {
	it("shows the release name and keeps code as fallback", () => {
		expect(kanbanBoardTaskReleaseLabel({ code: "REL-1", name: "Апрель" })).toBe(
			"Апрель",
		);
		expect(kanbanBoardTaskReleaseLabel({ code: "REL-1", name: "  " })).toBe(
			"REL-1",
		);
		expect(
			kanbanBoardTaskReleasesTitle([
				{ id: "1", code: "REL-1", name: "Апрель" },
				{ id: "2", code: "REL-2", name: "Май" },
			]),
		).toBe("Апрель, Май");
	});
});

describe("normalizeKanbanBoardReleaseImageVersions", () => {
	it("keeps only known image targets", () => {
		expect(
			normalizeKanbanBoardReleaseImageVersions({
				sum: " 1.2.3 ",
				"sum-rm": "4.0",
				unknown: "x",
				"smart-anketa-ui": "",
				"smart-anketa-api": "0.9",
			}),
		).toEqual({
			sum: "1.2.3",
			"sum-rm": "4.0",
			"smart-anketa-api": "0.9",
		});
		expect(
			kanbanBoardReleaseImageVersionsTitle({
				sum: "1.2.3",
				"smart-anketa-ui": "0.9",
			}),
		).toBe("SUM 1.2.3, Smart Anketa UI 0.9");
	});
});
