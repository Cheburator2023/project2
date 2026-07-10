import { describe, expect, it } from "vitest";
import {
	adjustTypicalWorkTableColumns,
	collectTypicalWorkSourceNames,
	filterTypicalWorkItems,
	sumTypicalWorkTotals,
	typicalWorkItemDisplayName,
} from "./anketaModalArrayTableConfig";
import type { AnketaArrayTableColumn } from "./anketaModalArrayTableConfig";

const TYPICAL_COLUMNS: AnketaArrayTableColumn[] = [
	{ key: "name", header: "Наименование" },
	{ key: "sourceName", header: "Объект" },
	{ key: "total", header: "Итог" },
];

describe("typical work table helpers", () => {
	it("sums total column", () => {
		expect(
			sumTypicalWorkTotals([
				{ total: 1.2 },
				{ total: 2 },
				{ name: "skip" },
			]),
		).toBe(3.2);
	});

	it("collects and filters by sourceName", () => {
		const items = [
			{ sourceName: "CRM", total: 1 },
			{ sourceName: "DWH", total: 2 },
			{ sourceName: "CRM", total: 3 },
		];
		expect(collectTypicalWorkSourceNames(items)).toEqual(["CRM", "DWH"]);
		expect(filterTypicalWorkItems(items, "CRM")).toHaveLength(2);
	});

	it("moves work name to row header columns", () => {
		expect(
			adjustTypicalWorkTableColumns(TYPICAL_COLUMNS, [
				{ name: "Уточнение требований", total: 1 },
			]).map((col) => col.key),
		).toEqual(["total"]);
		expect(
			adjustTypicalWorkTableColumns(TYPICAL_COLUMNS, [
				{ name: "Работа", sourceName: "CRM", total: 1 },
			]).map((col) => col.key),
		).toEqual(["sourceName", "total"]);
	});

	it("resolves typical work display name", () => {
		expect(typicalWorkItemDisplayName({ name: "  Модель  " }, 0)).toBe("Модель");
		expect(typicalWorkItemDisplayName({}, 2)).toBe("Работа 3");
	});
});
