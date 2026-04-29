import { BadRequestException } from "@nestjs/common";
import { ExportValidationPipe } from "../../../../../src/modules/calculation/pipe/export-validation.pipe";

describe("ExportValidationPipe", () => {
	let pipe: ExportValidationPipe;

	beforeEach(() => {
		pipe = new ExportValidationPipe();
	});

	it("returns transformed dto unchanged when no fields supplied", () => {
		const out = pipe.transform({} as any);
		expect(out).toEqual({});
	});

	it("splits selectedIds string into trimmed array", () => {
		const out = pipe.transform({ selectedIds: "  a, b ,c " } as any);
		expect(out.selectedIdsArray).toEqual(["a", "b", "c"]);
	});

	it("throws when selectedIds resolves to empty array", () => {
		expect(() => pipe.transform({ selectedIds: " , , " } as any)).toThrow(
			BadRequestException,
		);
	});

	it("parses valid filterModel JSON and validates", () => {
		const out = pipe.transform({
			filterModel: JSON.stringify({
				calcName: { filterType: "text", type: "equals", filter: "x" },
			}),
		} as any);
		expect(out.parsedFilterModel).toBeDefined();
	});

	it("throws on invalid filterModel JSON", () => {
		expect(() => pipe.transform({ filterModel: "{not json" } as any)).toThrow(
			BadRequestException,
		);
	});

	it("throws when filterModel filter has no filterType", () => {
		expect(() =>
			pipe.transform({
				filterModel: JSON.stringify({ name: { type: "equals" } }),
			} as any),
		).toThrow(BadRequestException);
	});

	it("throws when filterModel uses unsupported filterType", () => {
		expect(() =>
			pipe.transform({
				filterModel: JSON.stringify({ name: { filterType: "weird" } }),
			} as any),
		).toThrow(BadRequestException);
	});

	it("throws when combined filter has unsupported operator", () => {
		expect(() =>
			pipe.transform({
				filterModel: JSON.stringify({
					name: {
						filterType: "text",
						operator: "XOR",
						condition1: { filterType: "text" },
						condition2: { filterType: "text" },
					},
				}),
			} as any),
		).toThrow(BadRequestException);
	});

	it("throws when combined filter missing conditions", () => {
		expect(() =>
			pipe.transform({
				filterModel: JSON.stringify({
					name: {
						filterType: "text",
						operator: "AND",
					},
				}),
			} as any),
		).toThrow(BadRequestException);
	});

	it("throws on malformed dateFrom in date filter", () => {
		expect(() =>
			pipe.transform({
				filterModel: JSON.stringify({
					createdAt: {
						filterType: "date",
						type: "equals",
						dateFrom: "not-a-date",
					},
				}),
			} as any),
		).toThrow(BadRequestException);
	});

	it("throws on malformed dateTo in date filter", () => {
		expect(() =>
			pipe.transform({
				filterModel: JSON.stringify({
					createdAt: {
						filterType: "date",
						type: "inRange",
						dateFrom: "2025-01-01",
						dateTo: "x",
					},
				}),
			} as any),
		).toThrow(BadRequestException);
	});

	it("parses and validates sortModel", () => {
		const out = pipe.transform({
			sortModel: JSON.stringify([{ colId: "x", sort: "asc" }]),
		} as any);
		expect(out.parsedSortModel).toEqual([{ colId: "x", sort: "asc" }]);
	});

	it("throws on invalid sortModel JSON", () => {
		expect(() => pipe.transform({ sortModel: "{nope" } as any)).toThrow(
			BadRequestException,
		);
	});

	it("throws when sortModel is not array", () => {
		expect(() =>
			pipe.transform({ sortModel: JSON.stringify({ a: 1 }) } as any),
		).toThrow(BadRequestException);
	});

	it("throws when sortModel item missing colId", () => {
		expect(() =>
			pipe.transform({
				sortModel: JSON.stringify([{ sort: "asc" }]),
			} as any),
		).toThrow(BadRequestException);
	});

	it("throws when sortModel item has unsupported sort direction", () => {
		expect(() =>
			pipe.transform({
				sortModel: JSON.stringify([{ colId: "x", sort: "weird" }]),
			} as any),
		).toThrow(BadRequestException);
	});
});
