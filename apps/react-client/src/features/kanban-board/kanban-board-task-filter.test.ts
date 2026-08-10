import { describe, expect, it } from "vitest";
import type { KanbanBoardData, KanbanBoardItem } from "@smart-anketa/api-contract";
import {
	EMPTY_KANBAN_BOARD_TASK_FILTERS,
	countKanbanBoardCards,
	filterKanbanBoardData,
	kanbanBoardTaskFiltersActive,
	kanbanBoardTaskMatchesFilters,
	kanbanBoardTaskMatchesSearch,
} from "./kanban-board-task-filter";

const card = (
	partial: Partial<KanbanBoardItem> & { id: string },
): KanbanBoardItem => ({
	id: partial.id,
	title: partial.title ?? "Задача",
	parentId: partial.parentId ?? "todo",
	children: [],
	totalChildrenCount: 0,
	type: "card",
	content: partial.content ?? { title: partial.title ?? "Задача" },
	taskNumber: partial.taskNumber,
	createdAt: partial.createdAt,
	createdBy: partial.createdBy,
	updatedAt: partial.updatedAt,
	commentCount: partial.commentCount,
});

describe("kanban-board-task-filter", () => {
	it("matches quick search by title and task key", () => {
		const item = card({
			id: "t1",
			title: "Интеграция API",
			taskNumber: 12,
			content: { title: "Интеграция API", description: "Подключить сервис" },
		});
		expect(kanbanBoardTaskMatchesSearch(item, "интегр", "PRJ")).toBe(true);
		expect(kanbanBoardTaskMatchesSearch(item, "PRJ-12", "PRJ")).toBe(true);
		expect(kanbanBoardTaskMatchesSearch(item, "несуществующее", "PRJ")).toBe(
			false,
		);
	});

	it("filters by priority, assignee and due date", () => {
		const item = card({
			id: "t1",
			createdBy: "Иванов",
			createdAt: "2026-08-01T10:00:00.000Z",
			content: {
				title: "A",
				priority: "high",
				currentAssignee: "Петров",
				dueDate: "2026-08-10",
			},
		});
		expect(
			kanbanBoardTaskMatchesFilters(item, {
				...EMPTY_KANBAN_BOARD_TASK_FILTERS,
				priority: "high",
				assignee: "Петров",
				dueFrom: "2026-08-01",
				dueTo: "2026-08-15",
			}),
		).toBe(true);
		expect(
			kanbanBoardTaskMatchesFilters(item, {
				...EMPTY_KANBAN_BOARD_TASK_FILTERS,
				priority: "low",
			}),
		).toBe(false);
		expect(
			kanbanBoardTaskMatchesFilters(item, {
				...EMPTY_KANBAN_BOARD_TASK_FILTERS,
				dueFrom: "2026-08-11",
			}),
		).toBe(false);
	});

	it("filters board columns and counts cards", () => {
		const board: KanbanBoardData = {
			root: {
				id: "root",
				title: "Root",
				parentId: null,
				children: ["todo"],
				totalChildrenCount: 1,
			},
			todo: {
				id: "todo",
				title: "Todo",
				parentId: "root",
				children: ["a", "b"],
				totalChildrenCount: 2,
			},
			a: card({ id: "a", title: "Alpha", content: { title: "Alpha", priority: "high" } }),
			b: card({ id: "b", title: "Beta", content: { title: "Beta", priority: "low" } }),
		};
		const filtered = filterKanbanBoardData(board, (item) =>
			kanbanBoardTaskMatchesFilters(item, {
				...EMPTY_KANBAN_BOARD_TASK_FILTERS,
				priority: "high",
			}),
		);
		expect(filtered.todo.children).toEqual(["a"]);
		expect(countKanbanBoardCards(filtered)).toBe(1);
		expect(kanbanBoardTaskFiltersActive(EMPTY_KANBAN_BOARD_TASK_FILTERS)).toBe(
			false,
		);
		expect(
			kanbanBoardTaskFiltersActive({
				...EMPTY_KANBAN_BOARD_TASK_FILTERS,
				priority: "high",
			}),
		).toBe(true);
	});
});
