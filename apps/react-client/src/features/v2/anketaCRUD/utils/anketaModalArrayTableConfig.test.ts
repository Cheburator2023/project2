import { describe, expect, it } from "vitest";
import {
	adjustTypicalWorkTableColumns,
	collectTypicalWorkSourceNames,
	filterTypicalWorkItems,
	formatTypicalWorkSummaryTotal,
	getTypicalWorkFactoryTableColumns,
	resolveArrayTableColumns,
	sumTypicalWorkTotals,
	typicalWorkItemDisplayName,
} from "./anketaModalArrayTableConfig";

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

	it("uses factory four-column layout for typical work paths", () => {
		expect(getTypicalWorkFactoryTableColumns().map((col) => col.header)).toEqual([
			"Название типовой работы",
			"Базовая оценка",
			"Коэффициент",
			"Итог",
		]);
		expect(
			resolveArrayTableColumns("detailInfo.detailTypicalTasks")?.map(
				(col) => col.key,
			),
		).toEqual(["name", "estimate", "coefficient", "total"]);
		expect(
			adjustTypicalWorkTableColumns(
				[
					{ key: "name", header: "Название типовой работы" },
					{ key: "workType", header: "Тип работ" },
					{ key: "total", header: "Итог" },
				],
				[{ name: "Уточнение требований", total: 1 }],
			).map((col) => col.key),
		).toEqual(["name", "estimate", "coefficient", "total"]);
	});

	it("shows numeric coefficient, not formula display", () => {
		const coefficientCol = getTypicalWorkFactoryTableColumns().find(
			(col) => col.key === "coefficient",
		);
		expect(
			coefficientCol?.render?.({
				coefficient: 2,
				coefficientDisplay: "20 * 5 = 2",
			}),
		).toBe("2");
		expect(coefficientCol?.render?.({ coefficient: 1.5 })).toBe("1.5");
	});

	it("resolves typical work display name", () => {
		expect(typicalWorkItemDisplayName({ name: "  Модель  " }, 0)).toBe("Модель");
		expect(typicalWorkItemDisplayName({}, 2)).toBe("Работа 3");
	});

	it("formats summary total for canvas and table footer", () => {
		expect(formatTypicalWorkSummaryTotal(12.5)).toBe("12.5");
		expect(formatTypicalWorkSummaryTotal(null)).toBe("—");
		expect(formatTypicalWorkSummaryTotal(null, { loading: true })).toBe("…");
		expect(formatTypicalWorkSummaryTotal(3, { loading: true })).toBe("3");
	});
});
