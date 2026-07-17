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
	it("keeps one row per workId", () => {
		const workId = "f8e3a1b2-4c5d-6e7f-8a9b-0c1d2e3f4001";
		const rows = dedupeTypicalWorkRowsByWorkId([
			{ workId, name: "01. Постановка задачи.", total: 33 },
			{ workId, name: "01. Постановка задачи.", total: 33 },
		]);
		expect(rows).toHaveLength(1);
	});
});

describe("isModelStreamTypicalWorkVisibleInSummary", () => {
	it("hides zero-total placeholder rows", () => {
		expect(isModelStreamTypicalWorkVisibleInSummary({ total: 0 })).toBe(false);
		expect(isModelStreamTypicalWorkVisibleInSummary({ total: 33 })).toBe(true);
	});
});
