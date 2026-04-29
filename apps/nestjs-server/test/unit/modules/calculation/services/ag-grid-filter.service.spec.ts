import { SelectQueryBuilder } from "typeorm";
import { AgGridFilterService } from "../../../../../src/modules/calculation/services/ag-grid-filter.service";
import { Calculation } from "../../../../../src/modules/calculation/entities/calculation.entity";

type QbMock = {
	andWhere: jest.Mock;
	orderBy: jest.Mock;
	addOrderBy: jest.Mock;
	calls: { method: string; args: any[] }[];
};

const buildQb = (): QbMock & SelectQueryBuilder<Calculation> => {
	const calls: any[] = [];
	const qb: any = {
		calls,
		andWhere: jest.fn((sql: string, params?: any) => {
			calls.push({ method: "andWhere", args: [sql, params] });
			return qb;
		}),
		orderBy: jest.fn((field: string, dir?: string) => {
			calls.push({ method: "orderBy", args: [field, dir] });
			return qb;
		}),
		addOrderBy: jest.fn((field: string, dir?: string) => {
			calls.push({ method: "addOrderBy", args: [field, dir] });
			return qb;
		}),
	};
	return qb;
};

describe("AgGridFilterService", () => {
	let service: AgGridFilterService;
	let qb: ReturnType<typeof buildQb>;

	beforeEach(() => {
		service = new AgGridFilterService();
		qb = buildQb();
	});

	describe("applyFiltersToQuery", () => {
		it("noop when filterModel is undefined", () => {
			service.applyFiltersToQuery(qb);
			expect(qb.andWhere).not.toHaveBeenCalled();
		});

		it("applies text equals filter", () => {
			service.applyFiltersToQuery(qb, {
				calcName: { filterType: "text", type: "equals", filter: "abc" } as any,
			});
			expect(qb.andWhere).toHaveBeenCalledTimes(1);
			const [sql, params] = qb.andWhere.mock.calls[0];
			expect(sql).toMatch(/calculation\.calcName = :/);
			expect(Object.values(params)).toContain("abc");
		});

		it.each([
			["contains", "%abc%"],
			["notContains", "%abc%"],
			["startsWith", "abc%"],
			["endsWith", "%abc"],
		])("text %s wraps argument with proper wildcards", (type, expected) => {
			service.applyFiltersToQuery(qb, {
				calcName: { filterType: "text", type, filter: "abc" } as any,
			});
			const params = qb.andWhere.mock.calls[0][1];
			expect(Object.values(params)).toContain(expected);
		});

		it("text blank/notBlank produce IS NULL / IS NOT NULL conditions", () => {
			service.applyFiltersToQuery(qb, {
				calcName: { filterType: "text", type: "blank" } as any,
			});
			expect(qb.andWhere.mock.calls[0][0]).toMatch(/IS NULL OR/);

			qb = buildQb();
			service.applyFiltersToQuery(qb, {
				calcName: { filterType: "text", type: "notBlank" } as any,
			});
			expect(qb.andWhere.mock.calls[0][0]).toMatch(/IS NOT NULL/);
		});

		it("number filter set covers equals/range/blank/notBlank/lt/lte/gt/gte/notEqual", () => {
			const types = [
				"equals",
				"notEqual",
				"lessThan",
				"lessThanOrEqual",
				"greaterThan",
				"greaterThanOrEqual",
				"inRange",
				"blank",
				"notBlank",
			];
			for (const type of types) {
				qb = buildQb();
				service.applyFiltersToQuery(qb, {
					finalCoefficient: {
						filterType: "number",
						type,
						filter: 1,
						filterTo: 10,
					} as any,
				});
				expect(qb.andWhere).toHaveBeenCalled();
			}
		});

		it("date filter set covers equals/notEqual/range/lt/gt/blank/notBlank", () => {
			const types = [
				"equals",
				"notEqual",
				"lessThan",
				"greaterThan",
				"inRange",
				"blank",
				"notBlank",
			];
			for (const type of types) {
				qb = buildQb();
				service.applyFiltersToQuery(qb, {
					createdAt: {
						filterType: "date",
						type,
						dateFrom: "2025-01-01",
						dateTo: "2025-02-01",
					} as any,
				});
				expect(qb.andWhere).toHaveBeenCalled();
			}
		});

		it("set filter with empty values yields 1 = 0 condition", () => {
			service.applyFiltersToQuery(qb, {
				author: { filterType: "set", values: [] } as any,
			});
			expect(qb.andWhere).toHaveBeenCalledWith("1 = 0", {});
		});

		it("set filter with values yields IN clause", () => {
			service.applyFiltersToQuery(qb, {
				author: { filterType: "set", values: ["A", "B"] } as any,
			});
			const [sql] = qb.andWhere.mock.calls[0];
			expect(sql).toMatch(/IN \(:\.\.\./);
		});

		it("combined AND filter wraps with parentheses", () => {
			service.applyFiltersToQuery(qb, {
				calcName: {
					operator: "AND",
					condition1: { filterType: "text", type: "equals", filter: "a" },
					condition2: { filterType: "text", type: "equals", filter: "b" },
				} as any,
			});
			expect(qb.andWhere.mock.calls[0][0]).toMatch(/AND/);
		});

		it("combined OR filter wraps with OR", () => {
			service.applyFiltersToQuery(qb, {
				calcName: {
					operator: "OR",
					condition1: { filterType: "text", type: "equals", filter: "a" },
					condition2: { filterType: "text", type: "equals", filter: "b" },
				} as any,
			});
			expect(qb.andWhere.mock.calls[0][0]).toMatch(/OR/);
		});

		it("rethrows error for unsupported filter type", () => {
			expect(() =>
				service.applyFiltersToQuery(qb, {
					calcName: { filterType: "unknown" } as any,
				}),
			).toThrow();
		});

		it("rethrows error for unsupported text filter sub-type", () => {
			expect(() =>
				service.applyFiltersToQuery(qb, {
					calcName: { filterType: "text", type: "weird" } as any,
				}),
			).toThrow();
		});

		it("rethrows error for unsupported number filter sub-type", () => {
			expect(() =>
				service.applyFiltersToQuery(qb, {
					finalCoefficient: { filterType: "number", type: "weird" } as any,
				}),
			).toThrow();
		});

		it("rethrows error for unsupported date filter sub-type", () => {
			expect(() =>
				service.applyFiltersToQuery(qb, {
					createdAt: {
						filterType: "date",
						type: "weird",
						dateFrom: "x",
					} as any,
				}),
			).toThrow();
		});

		it("maps questionnaireData.* path to JSON expression with ->> on last segment", () => {
			service.applyFiltersToQuery(qb, {
				"questionnaireData.modelsCount": {
					filterType: "number",
					type: "equals",
					filter: 1,
				} as any,
			});
			const sql = qb.andWhere.mock.calls[0][0];
			expect(sql).toContain(`questionnaireData->>'modelsCount'`);
			// numeric cast for json field
			expect(sql).toContain("::numeric");
		});

		it("maps numeric segments in path to -> integer access", () => {
			service.applyFiltersToQuery(qb, {
				"questionnaireData.algorithmComplexity.0.algorithmType": {
					filterType: "text",
					type: "equals",
					filter: "x",
				} as any,
			});
			const sql = qb.andWhere.mock.calls[0][0];
			expect(sql).toMatch(
				/questionnaireData->'algorithmComplexity'->0->>'algorithmType'/,
			);
		});

		it("falls back to original column id when no mapping match", () => {
			service.applyFiltersToQuery(qb, {
				unknownField: {
					filterType: "text",
					type: "equals",
					filter: "x",
				} as any,
			});
			const sql = qb.andWhere.mock.calls[0][0];
			expect(sql).toContain("calculation.unknownField");
		});
	});

	describe("applySortToQuery", () => {
		it("falls back to default order when sortModel is empty", () => {
			service.applySortToQuery(qb, []);
			expect(qb.orderBy).toHaveBeenCalledWith("calculation.createdAt", "DESC");
		});

		it("falls back to default order when sortModel undefined", () => {
			service.applySortToQuery(qb);
			expect(qb.orderBy).toHaveBeenCalledWith("calculation.createdAt", "DESC");
		});

		it("calls orderBy for first item and addOrderBy for further", () => {
			service.applySortToQuery(qb, [
				{ colId: "calcName", sort: "asc" },
				{ colId: "author", sort: "desc" },
			]);
			expect(qb.orderBy).toHaveBeenCalledWith("calculation.calcName", "ASC");
			expect(qb.addOrderBy).toHaveBeenCalledWith("calculation.author", "DESC");
		});
	});
});
