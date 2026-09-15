import { describe, expect, it } from "vitest";
import {
	boardsEquivalent,
	countKanbanBoardBlockers,
	defaultKanbanBoardColumns,
	findKanbanBoardCancelledColumnId,
	fromBoardData,
	kanbanBoardColumnCanTrashTasks,
	kanbanBoardDisplayColumnTitle,
	kanbanBoardEffectiveEstimatePd,
	kanbanBoardEffectiveSprintCapacityPd,
	kanbanBoardIsCancelledColumn,
	kanbanBoardIsReleasesColumn,
	kanbanBoardReleaseImageVersionsTitle,
	kanbanBoardReleasesLaneId,
	kanbanBoardReleasesLaneWidthPx,
	kanbanBoardRoleEstimatesTotal,
	kanbanBoardSubtasksProgress,
	kanbanBoardTaskReleaseLabel,
	kanbanBoardTaskReleasesTitle,
	collapseKanbanBoardReleasesLanes,
	expandKanbanBoardReleasesLanes,
	moveKanbanBoardCardToColumn,
	normalizeKanbanBoardReleaseImageVersions,
	applyKanbanBoardStoredImagesToContent,
	mergeKanbanBoardSubtaskImages,
	normalizeKanbanBoardSubtasks,
	normalizeKanbanBoardTaskContent,
	normalizeKanbanBoardRelatedTaskIds,
	pickKanbanBoardRelatedTaskIds,
	kanbanBoardRelatedTaskIdsDiff,
	parseKanbanBoardReleasesLaneId,
	toBoardData,
	type KanbanBoardData,
	type KanbanBoardTaskContent,
	KANBAN_BOARD_COLUMN_WIDTH_PX,
	KANBAN_BOARD_RELEASES_COLUMN_TITLE,
	KANBAN_BOARD_RELEASES_UNASSIGNED_LANE_TITLE,
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
		const fromLegacy = normalizeKanbanBoardTaskContent({
			title: "Task",
			system: "smart-anketa",
		});
		expect(fromLegacy.systems).toEqual(["smart-anketa"]);
		expect(fromLegacy.system).toBeUndefined();
		expect(
			normalizeKanbanBoardTaskContent({
				title: "Task",
				system: "unknown",
			} as unknown as KanbanBoardTaskContent).systems,
		).toBeUndefined();
	});

	it("keeps multiple known systems and drops unknown ids", () => {
		const next = normalizeKanbanBoardTaskContent({
			title: "Task",
			systems: ["smart-anketa", "shell", "nope", "smart-anketa"],
		} as unknown as KanbanBoardTaskContent);
		expect(next.systems).toEqual(["smart-anketa", "shell"]);
		expect(next.system).toBeUndefined();
	});

	it("keeps a legacy dev stand and splits new catalog ids", () => {
		const fromLegacy = normalizeKanbanBoardTaskContent({
			title: "Task",
			stand: "dev",
		});
		expect(fromLegacy.stands).toEqual(["dev"]);
		expect(fromLegacy.stand).toBeUndefined();
		const next = normalizeKanbanBoardTaskContent({
			title: "Task",
			stands: ["dev-sumcore", "dev-sumd", "nope"],
		} as unknown as KanbanBoardTaskContent);
		expect(next.stands).toEqual(["dev-sumcore", "dev-sumd"]);
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

	it("keeps subtask images and does not copy them onto the task gallery", () => {
		const image = {
			id: "img-1",
			name: "shot.png",
			width: 100,
			height: 80,
			fullByteSize: 12,
			thumbByteSize: 4,
			createdAt: "2026-09-15T00:00:00.000Z",
		};
		const normalized = normalizeKanbanBoardTaskContent({
			title: "Task",
			images: [image],
			subtasks: [
				{
					id: "a",
					text: "With photo",
					status: "next_up",
					images: [image],
				},
			],
		});
		expect(normalized.subtasks).toEqual([
			{
				id: "a",
				text: "With photo",
				status: "next_up",
				images: [image],
			},
		]);
		expect(normalized.images).toBeUndefined();
	});

	it("keeps stored blobs on the subtask that owns them", () => {
		const taskImage = {
			id: "img-task",
			name: "cover.png",
			width: 10,
			height: 10,
			fullByteSize: 8,
			thumbByteSize: 2,
			createdAt: "2026-09-15T00:00:00.000Z",
		};
		const subtaskImage = {
			id: "img-sub",
			name: "step.png",
			width: 20,
			height: 20,
			fullByteSize: 16,
			thumbByteSize: 4,
			createdAt: "2026-09-15T00:00:00.000Z",
		};
		const next = applyKanbanBoardStoredImagesToContent(
			{
				title: "Task",
				subtasks: [
					{
						id: "a",
						text: "Step",
						status: "next_up",
						images: [subtaskImage],
					},
				],
			},
			[taskImage, subtaskImage],
		);
		expect(next.images).toEqual([taskImage]);
		expect(next.subtasks?.[0]?.images).toEqual([subtaskImage]);
	});

	it("keeps previous subtask images when a save omits them", () => {
		const image = {
			id: "img-sub",
			name: "step.png",
			width: 20,
			height: 20,
			fullByteSize: 16,
			thumbByteSize: 4,
			createdAt: "2026-09-15T00:00:00.000Z",
		};
		expect(
			mergeKanbanBoardSubtaskImages(
				[{ id: "a", text: "Step", status: "next_up" }],
				[
					{
						id: "a",
						text: "Step",
						status: "next_up",
						images: [image],
					},
				],
			),
		).toEqual([
			{
				id: "a",
				text: "Step",
				status: "next_up",
				images: [image],
			},
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

describe("kanban releases column lanes", () => {
	it("recognizes the renamed demo column as Релизы", () => {
		expect(kanbanBoardIsReleasesColumn({ id: "demo", title: "Демонстрация" })).toBe(
			true,
		);
		expect(kanbanBoardDisplayColumnTitle({ id: "demo", title: "Демонстрация" })).toBe(
			KANBAN_BOARD_RELEASES_COLUMN_TITLE,
		);
		expect(kanbanBoardIsReleasesColumn({ id: "todo", title: "Сделать" })).toBe(
			false,
		);
	});

	it("widens the group to at least three card columns", () => {
		expect(kanbanBoardReleasesLaneWidthPx(1)).toBe(KANBAN_BOARD_COLUMN_WIDTH_PX * 3);
		expect(kanbanBoardReleasesLaneWidthPx(2)).toBe(KANBAN_BOARD_COLUMN_WIDTH_PX * 1.5);
		expect(kanbanBoardReleasesLaneWidthPx(3)).toBe(KANBAN_BOARD_COLUMN_WIDTH_PX);
		expect(kanbanBoardReleasesLaneWidthPx(5)).toBe(KANBAN_BOARD_COLUMN_WIDTH_PX);
	});

	it("splits Релизы by primary release and collapses lanes before persist", () => {
		const board = sampleBoard();
		board.demo = { ...board.demo, children: ["task-1"], totalChildrenCount: 1 };
		board.todo = { ...board.todo, children: [], totalChildrenCount: 0 };
		board["task-1"] = {
			...board["task-1"],
			parentId: "demo",
			releases: [{ id: "rel-1", code: "REL-1", name: "Апрель" }],
		};

		const expanded = expandKanbanBoardReleasesLanes(board, [
			{ id: "rel-1", code: "REL-1", name: "Апрель" },
			{ id: "rel-2", code: "REL-2", name: "Май" },
		]);
		const unassignedId = kanbanBoardReleasesLaneId("demo", null);
		const aprilId = kanbanBoardReleasesLaneId("demo", "rel-1");
		const mayId = kanbanBoardReleasesLaneId("demo", "rel-2");

		expect(expanded.root.children).not.toContain("demo");
		expect(expanded.root.children).toEqual(
			expect.arrayContaining([unassignedId, aprilId, mayId]),
		);
		expect(expanded[aprilId]?.children).toEqual(["task-1"]);
		expect(expanded[unassignedId]?.children).toEqual([]);
		expect(expanded[unassignedId]?.title).toBe(
			KANBAN_BOARD_RELEASES_UNASSIGNED_LANE_TITLE,
		);
		expect(parseKanbanBoardReleasesLaneId(aprilId)).toEqual({
			columnId: "demo",
			releaseId: "rel-1",
		});

		const collapsed = collapseKanbanBoardReleasesLanes(expanded);
		expect(collapsed.root.children).toContain("demo");
		expect(collapsed.demo.children).toEqual(["task-1"]);
		expect(collapsed["task-1"].parentId).toBe("demo");

		const rows = fromBoardData(
			expanded,
			"local-dev",
			"2026-06-16T12:00:00.000Z",
			"board-1",
		);
		expect(rows.find((row) => row.id === "task-1")?.parentId).toBe("demo");
	});

	it("normalizes related task ids: unique, no self, cap", () => {
		expect(
			normalizeKanbanBoardRelatedTaskIds(["  a  ", "a", "", "b", "self"], {
				excludeId: "self",
			}),
		).toEqual(["a", "b"]);
		expect(
			normalizeKanbanBoardTaskContent({
				title: "Task",
				relatedTaskIds: ["t-2", "t-2", "  "],
			}).relatedTaskIds,
		).toEqual(["t-2"]);
		expect(
			normalizeKanbanBoardTaskContent({
				title: "Task",
				relatedTaskIds: [],
			}).relatedTaskIds,
		).toEqual([]);
	});

	it("picks related ids only when the field is present", () => {
		const previous: KanbanBoardTaskContent = {
			title: "Task",
			relatedTaskIds: ["t-2"],
		};
		expect(pickKanbanBoardRelatedTaskIds({ title: "x" }, previous)).toEqual([
			"t-2",
		]);
		expect(
			pickKanbanBoardRelatedTaskIds({ title: "x", relatedTaskIds: [] }, previous),
		).toEqual([]);
		expect(
			kanbanBoardRelatedTaskIdsDiff(["t-2", "t-3"], ["t-3", "t-4"]),
		).toEqual({
			added: ["t-4"],
			removed: ["t-2"],
		});
	});
});
