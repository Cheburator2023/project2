import { describe, expect, it } from "vitest";
import {
	findKanbanBoardColumnByStatusTitle,
	groupPlanningTasksByStatus,
	buildPlanningTaskGridRows,
	buildPlanningReleaseTaskGridRows,
	groupPlanningTasksByTheme,
	KANBAN_BOARD_PLANNING_UNTHEMED_ID,
	nextKanbanBoardReleaseThemeColor,
	planningReleaseGridRowId,
	planningTaskGridRowId,
} from "./kanban-board-planning.util";

describe("groupPlanningTasksByTheme", () => {
	it("puts themed tasks into theme columns and the rest into unthemed", () => {
		const columns = groupPlanningTasksByTheme(
			[
				{ id: "t1", themeId: "theme-b", position: 1 },
				{ id: "t2", themeId: null, position: 0 },
				{ id: "t3", themeId: "theme-a", position: 0 },
				{ id: "t4", themeId: "missing", position: 2 },
			],
			[
				{ id: "theme-b", name: "B", color: "#111111", position: 1 },
				{ id: "theme-a", name: "A", color: "#222222", position: 0 },
			],
		);

		expect(columns.map((column) => column.id)).toEqual([
			"theme-a",
			"theme-b",
			KANBAN_BOARD_PLANNING_UNTHEMED_ID,
		]);
		expect(columns[0]?.items.map((item) => item.id)).toEqual(["t3"]);
		expect(columns[1]?.items.map((item) => item.id)).toEqual(["t1"]);
		expect(columns[2]?.items.map((item) => item.id)).toEqual(["t2", "t4"]);
		expect(columns[2]?.title).toBe("Без группы");
	});
});

describe("buildPlanningTaskGridRows", () => {
	it("nests tasks under planning-wide theme groups, mixing releases", () => {
		const tasks: Array<{
			taskId: string;
			releaseId: string;
			themeId: string | null;
			position: number;
		}> = [
			{ taskId: "t1", releaseId: "r1", themeId: "theme-a", position: 0 },
			{ taskId: "t2", releaseId: "r2", themeId: null, position: 0 },
			{ taskId: "t3", releaseId: "r2", themeId: "theme-a", position: 1 },
		];
		const rows = buildPlanningTaskGridRows(tasks, [
			{ id: "theme-a", name: "Онбординг", color: "#111111", position: 0 },
			{ id: "theme-b", name: "Пустая", color: "#222222", position: 1 },
		]);

		expect(
			rows.map((row) => [row.rowKind, row.title, row.children.length]),
		).toEqual([
			["theme", "Онбординг", 2],
			["theme", "Пустая", 0],
			["theme", "Без группы", 1],
		]);
		expect(rows[0]?.children.map((item) => item.releaseId)).toEqual([
			"r1",
			"r2",
		]);
		expect(rows[2]?.id).toBe(KANBAN_BOARD_PLANNING_UNTHEMED_ID);
		expect(planningTaskGridRowId(rows[0]!)).toBe("theme:theme-a");
		expect(planningTaskGridRowId(rows[0]!.children[0]!)).toBe("task:t1");
	});
});

describe("groupPlanningTasksByStatus", () => {
	it("orders known factory statuses first", () => {
		const columns = groupPlanningTasksByStatus([
			{ id: "t1", statusTitle: "Готово", position: 0 },
			{ id: "t2", statusTitle: "Сделать", position: 1 },
			{ id: "t3", statusTitle: "Кастом", position: 0 },
		]);
		expect(columns.map((column) => column.title)).toEqual([
			"Сделать",
			"Готово",
			"Кастом",
		]);
	});
});

describe("findKanbanBoardColumnByStatusTitle", () => {
	it("matches title case-insensitively", () => {
		const column = findKanbanBoardColumnByStatusTitle(
			[
				{ id: "c1", title: "Сделать" },
				{ id: "c2", title: "Готово" },
			],
			"  готово ",
		);
		expect(column?.id).toBe("c2");
		expect(
			findKanbanBoardColumnByStatusTitle(
				[{ id: "c1", title: "Сделать" }],
				"Нет такой",
			),
		).toBeUndefined();
	});
});

describe("buildPlanningReleaseTaskGridRows", () => {
	it("nests every planning release even when it has no tasks", () => {
		const rows = buildPlanningReleaseTaskGridRows(
			[
				{ taskId: "t1", releaseId: "r2", position: 1 },
				{ taskId: "t2", releaseId: "r1", position: 0 },
				{ taskId: "t3", releaseId: "missing", position: 0 },
			],
			[
				{ id: "r1", code: "REL-1", name: "Апрель" },
				{ id: "r2", code: "REL-2", name: "Май" },
			],
		);
		expect(rows.map((row) => [row.title, row.children.length])).toEqual([
			["Апрель", 1],
			["Май", 1],
			["Без релиза", 1],
		]);
		expect(planningReleaseGridRowId(rows[0]!)).toBe("release:r1");
		expect(planningReleaseGridRowId(rows[0]!.children[0]!)).toBe("task:t2");
		expect(rows[2]?.id).toBe("__none__");
	});
});

describe("nextKanbanBoardReleaseThemeColor", () => {
	it("cycles through palette", () => {
		expect(nextKanbanBoardReleaseThemeColor(0)).toBe("#2563eb");
		expect(nextKanbanBoardReleaseThemeColor(8)).toBe("#2563eb");
	});
});
