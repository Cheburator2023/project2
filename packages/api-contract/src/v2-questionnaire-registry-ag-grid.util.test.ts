import { describe, expect, it } from "vitest";
import {
	expandV2RegistrySetFilterValues,
	formatV2RegistrySetFilterValue,
	omitV2AgGridFilterColumn,
	parseV2AgGridFilterModel,
	parseV2AgGridSortModel,
	toV2RegistryDateOnly,
	V2_REGISTRY_EDIT_LOCK_FILTER_VALUE,
} from "./v2-questionnaire-registry-ag-grid.util";

describe("v2 registry ag-grid query helpers", () => {
	it("parses filterModel JSON and objects", () => {
		expect(
			parseV2AgGridFilterModel(
				JSON.stringify({
					status: { filterType: "set", values: ["Активная"] },
				}),
			),
		).toEqual({
			status: { filterType: "set", values: ["Активная"] },
		});
		expect(parseV2AgGridFilterModel("not-json")).toEqual({});
	});

	it("parses sortModel and drops invalid entries", () => {
		expect(
			parseV2AgGridSortModel(
				'[{"colId":"createdAt","sort":"desc"},{"colId":"x"}]',
			),
		).toEqual([{ colId: "createdAt", sort: "desc" }]);
	});

	it("maps status and stream labels both ways for set-filter SQL", () => {
		expect(expandV2RegistrySetFilterValues("status", "Активная")).toEqual(
			expect.arrayContaining(["Активная", "active"]),
		);
		expect(
			expandV2RegistrySetFilterValues(
				"form.generalInfo.implementationStream",
				"ДАДМ",
			),
		).toEqual(expect.arrayContaining(["ДАДМ", "dadm"]));
	});

	it("formats distinct values like the grid cells", () => {
		expect(formatV2RegistrySetFilterValue("status", "active")).toBe("Активная");
		expect(formatV2RegistrySetFilterValue("editLock", "x")).toBe(
			V2_REGISTRY_EDIT_LOCK_FILTER_VALUE,
		);
		expect(
			formatV2RegistrySetFilterValue("createdAt", "2026-08-26T15:00:00.000Z"),
		).toBe("2026-08-26");
		expect(
			formatV2RegistrySetFilterValue(
				"form.generalInfo.someDate",
				"2026-08-26T15:00:00.000Z",
			),
		).toBe("2026-08-26");
		expect(formatV2RegistrySetFilterValue("form.x", true)).toBe("Да");
	});

	it("omits the opened set-filter column from the values query", () => {
		expect(
			omitV2AgGridFilterColumn(
				{
					status: { filterType: "set", values: ["Активная"] },
					calcName: { filterType: "set", values: ["A"] },
				},
				"status",
			),
		).toEqual({
			calcName: { filterType: "set", values: ["A"] },
		});
	});

	it("normalizes dates to UTC calendar day", () => {
		expect(toV2RegistryDateOnly("2026-01-02T23:15:00.000Z")).toBe("2026-01-02");
	});
});
