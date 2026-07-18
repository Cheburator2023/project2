import { describe, expect, it } from "vitest";
import {
	compareModelStreamTypicalWorkNames,
	dedupeTypicalWorkRowsByWorkId,
	isModelStreamTypicalWorkVisibleInSummary,
} from "./v2-model-stream-typical-works.constants";

describe("compareModelStreamTypicalWorkNames", () => {
	it("orders model stream stages like CSV", () => {
		const names = [
			"AutoML: внедрение",
			"05. Разработка модели",
			"01. Постановка задачи",
			"02. Поиск данных",
			"05A. Разработка пилотной модели (MVP)",
		];
		names.sort(compareModelStreamTypicalWorkNames);
		expect(names).toEqual([
			"01. Постановка задачи",
			"02. Поиск данных",
			"05A. Разработка пилотной модели (MVP)",
			"05. Разработка модели",
			"AutoML: внедрение",
		]);
	});
});

describe("dedupeTypicalWorkRowsByWorkId", () => {
	it("keeps one row per workId and sums coefficient/total", () => {
		const workId = "f8e3a1b2-4c5d-6e7f-8a9b-0c1d2e3f4001";
		const rows = dedupeTypicalWorkRowsByWorkId([
			{
				workId,
				name: "07. Разработка витрины для применения модели",
				estimateHoursPerDay: 56,
				coefficient: 1,
				total: 56,
			},
			{
				workId,
				name: "07. Разработка витрины для применения модели",
				estimateHoursPerDay: 56,
				coefficient: 1,
				total: 56,
			},
			{
				workId,
				name: "07. Разработка витрины для применения модели",
				estimateHoursPerDay: 56,
				coefficient: 1,
				total: 56,
			},
			{
				workId,
				name: "07. Разработка витрины для применения модели",
				estimateHoursPerDay: 56,
				coefficient: 1,
				total: 56,
			},
		]);
		expect(rows).toHaveLength(1);
		expect(rows[0]?.coefficient).toBe(4);
		expect(rows[0]?.total).toBe(224);
		expect(rows[0]).toMatchObject({
			coefficientDisplay: "×4",
			sourceName: "×4",
		});
	});
});

describe("isModelStreamTypicalWorkVisibleInSummary", () => {
	it("hides zero-total placeholder rows", () => {
		expect(isModelStreamTypicalWorkVisibleInSummary({ total: 0 })).toBe(false);
		expect(isModelStreamTypicalWorkVisibleInSummary({ total: 33 })).toBe(true);
	});
});
