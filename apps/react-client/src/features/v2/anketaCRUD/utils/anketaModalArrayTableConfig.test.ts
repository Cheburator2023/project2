import { describe, expect, it } from "vitest";
import {
	collectTypicalWorkSourceNames,
	filterTypicalWorkItems,
	sumTypicalWorkTotals,
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
});
