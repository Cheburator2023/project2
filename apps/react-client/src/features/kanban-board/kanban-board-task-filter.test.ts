import { describe, expect, it } from "vitest";
import type {
	KanbanBoardData,
	KanbanBoardItem,
} from "@smart-anketa/api-contract";
import {
	EMPTY_KANBAN_BOARD_TASK_FILTERS,
	countKanbanBoardCards,
	filterKanbanBoardData,
	kanbanBoardTaskFiltersActive,
	kanbanBoardTaskMatchesFilters,
	kanbanBoardTaskMatchesSearch,
	applyKanbanBoardViewToSearchParams,
	parseKanbanBoardSearchQuery,
	parseKanbanBoardTaskFiltersFromSearchParams,
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

	it("matches quick search by system title", () => {
		const item = card({
			id: "t1",
			content: { title: "Миграция", system: "smart-anketa" },
		});
		expect(kanbanBoardTaskMatchesSearch(item, "smart anketa")).toBe(true);
		expect(kanbanBoardTaskMatchesSearch(item, "infra")).toBe(false);
	});

	it("matches quick search by any selected system", () => {
		const item = card({
			id: "t1",
			content: { title: "Миграция", systems: ["shell", "smart-anketa"] },
		});
		expect(kanbanBoardTaskMatchesSearch(item, "shell")).toBe(true);
		expect(kanbanBoardTaskMatchesSearch(item, "smart anketa")).toBe(true);
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
			a: card({
				id: "a",
				title: "Alpha",
				content: { title: "Alpha", priority: "high" },
			}),
			b: card({
				id: "b",
				title: "Beta",
				content: { title: "Beta", priority: "low" },
			}),
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

	it("round-trips board filters and search through URL params", () => {
		const filters = {
			...EMPTY_KANBAN_BOARD_TASK_FILTERS,
			assignee: "Петров",
			priority: "high" as const,
			dueFrom: "2026-08-01",
		};
		const query = applyKanbanBoardViewToSearchParams(new URLSearchParams(), {
			filters,
			query: "интеграция",
		});
		expect(query.get("q")).toBe("интеграция");
		expect(query.get("assignee")).toBe("Петров");
		expect(query.get("priority")).toBe("high");
		expect(query.get("dueFrom")).toBe("2026-08-01");
		expect(query.get("type")).toBeNull();
		expect(parseKanbanBoardSearchQuery(query)).toBe("интеграция");
		expect(parseKanbanBoardTaskFiltersFromSearchParams(query)).toEqual(filters);
	});

	it("ignores unknown priority and invalid dates in URL", () => {
		const params = new URLSearchParams(
			"priority=urgent&type=story&dueFrom=10.08.2026&createdBy=Иванов",
		);
		expect(parseKanbanBoardTaskFiltersFromSearchParams(params)).toEqual({
			...EMPTY_KANBAN_BOARD_TASK_FILTERS,
			createdBy: "Иванов",
			taskType: "story",
		});
	});
});
