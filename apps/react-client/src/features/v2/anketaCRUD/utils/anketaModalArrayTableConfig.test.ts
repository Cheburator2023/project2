import { describe, expect, it } from "vitest";
import {
	adjustTypicalWorkTableColumns,
	collectAppearedTypicalWorkRows,
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

	it("normalizes float artifacts when summing typical work totals", () => {
		expect(
			sumTypicalWorkTotals([{ total: 20.999999999999996 }]),
		).toBe(21);
		expect(
			sumTypicalWorkTotals([
				{ total: 10.000000000000002 },
				{ total: 10.999999999999996 },
			]),
		).toBe(21);
	});

	it("ignores negative totals in summary sum", () => {
		expect(sumTypicalWorkTotals([{ total: -5 }])).toBe(0);
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

	it("shows only numeric coefficient in coefficient column", () => {
		const coefficientCol = getTypicalWorkFactoryTableColumns().find(
			(col) => col.key === "coefficient",
		);
		expect(
			coefficientCol?.render?.({
				coefficient: 2,
				coefficientDisplay: "20 * 5 = 2",
			}),
		).toBe("2");
		expect(
			coefficientCol?.render?.({
				coefficient: 1.2,
				coefficientDisplay: "5 × 1.2",
			}),
		).toBe("1.2");
		expect(coefficientCol?.render?.({ coefficient: 1.5 })).toBe("1.5");
	});

	it("resolves typical work display name", () => {
		expect(typicalWorkItemDisplayName({ name: "  Модель  " }, 0)).toBe("Модель");
		expect(typicalWorkItemDisplayName({}, 2)).toBe("Работа 3");
	});

	it("formats summary total for canvas and table footer", () => {
		expect(formatTypicalWorkSummaryTotal(12.5)).toBe("12.5");
		expect(formatTypicalWorkSummaryTotal(20.999999999999996)).toBe("21");
		expect(formatTypicalWorkSummaryTotal(null)).toBe("—");
		expect(formatTypicalWorkSummaryTotal(null, { loading: true })).toBe("…");
		expect(formatTypicalWorkSummaryTotal(3, { loading: true })).toBe("3");
	});

	it("collects appeared typical work rows from formData", () => {
		const rows = collectAppearedTypicalWorkRows({
			streamDataSources: {
				sourceTypicalTasks: [
					{ name: "Уточнение требований", estimateHoursPerDay: 5, coefficient: 2, total: 10 },
					{ generatedByRuleId: "rule-1", estimateHoursPerDay: 3, total: 3 },
					{},
				],
			},
		});
		expect(rows).toHaveLength(2);
		expect(rows[0]?.name).toBe("Уточнение требований");
	});

	it("prefers liveFormData when collecting appeared typical work rows", () => {
		const rows = collectAppearedTypicalWorkRows(
			{
				detailInfo: {
					detailTypicalTasks: [],
				},
			},
			{
				detailInfo: {
					detailTypicalTasks: {
						"ui:options": {
							archComponent: "typicalWork",
							streamExecutor: "Модельный стрим",
						},
					},
				},
			},
			{
				detailInfo: {
					detailTypicalTasks: [
						{
							name: "Постановка задачи",
							estimateHoursPerDay: 33,
							coefficient: 1,
							total: 33,
						},
					],
				},
			},
		);
		expect(rows).toHaveLength(1);
		expect(rows[0]?.name).toBe("Постановка задачи");
	});
});
