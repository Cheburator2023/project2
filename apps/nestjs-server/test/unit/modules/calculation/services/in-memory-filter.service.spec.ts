import { InMemoryFilterService } from "../../../../../src/modules/calculation/services/in-memory-filter.service";
import { Calculation } from "../../../../../src/modules/calculation/entities/calculation.entity";

const baseCalc = (overrides: Partial<Calculation> = {}): Calculation =>
	({
		id: "550e8400-e29b-41d4-a716-446655440000",
		calcName: "Calc 1",
		rfd: "RFD",
		streamExecutor: "Stream",
		department: ["Dep"],
		customerName: "Cust",
		comment: "Cmnt",
		status: "Активная" as any,
		version: "1",
		seriesId: "11111111",
		parentCalcId: null,
		readableId: "Calc-11111111-version-1",
		finalCoefficient: 1.5,
		createdAt: new Date("2025-01-15T10:00:00Z"),
		author: "John Doe",
		questionnaireData: {
			calcName: "Calc 1",
			modelsCount: 2,
			algorithmComplexity: [
				{ algorithmType: "Табличные данные" },
				{ algorithmType: "Текстовая аналитика_LLM" },
			],
			generalUncertainty: {
				sanctionsRisk: { probability: "P", influence: "I" },
			},
			calculationResult: [{ score: 5, offset: 1 }, { score: 7 }],
		} as any,
		...overrides,
	}) as Calculation;

describe("InMemoryFilterService", () => {
	let service: InMemoryFilterService;

	beforeEach(() => {
		service = new InMemoryFilterService();
	});

	describe("applyFiltersAndSort", () => {
		it("returns all when no filter and no sort", () => {
			const calcs = [baseCalc(), baseCalc({ id: "2" } as any)];
			expect(service.applyFiltersAndSort(calcs)).toHaveLength(2);
		});

		it("applies text equals filter on direct field", () => {
			const a = baseCalc({ calcName: "alpha" });
			const b = baseCalc({ calcName: "beta", id: "id2" } as any);
			const result = service.applyFiltersAndSort([a, b], {
				calcName: {
					filterType: "text",
					type: "equals",
					filter: "alpha",
				} as any,
			});
			expect(result).toEqual([a]);
		});

		it("supports text contains/notContains/startsWith/endsWith/blank/notBlank/notEqual", () => {
			const a = baseCalc({ calcName: "Hello world" });
			const b = baseCalc({ calcName: "" } as any);
			const cases = [
				[{ filterType: "text", type: "contains", filter: "world" }, [a]],
				[{ filterType: "text", type: "notContains", filter: "world" }, [b]],
				[{ filterType: "text", type: "startsWith", filter: "Hello" }, [a]],
				[{ filterType: "text", type: "endsWith", filter: "world" }, [a]],
				[{ filterType: "text", type: "blank" }, [b]],
				[{ filterType: "text", type: "notBlank" }, [a]],
				[{ filterType: "text", type: "notEqual", filter: "Hello world" }, [b]],
			];
			for (const [filter, expected] of cases as any[]) {
				expect(
					service.applyFiltersAndSort([a, b], { calcName: filter }),
				).toEqual(expected);
			}
		});

		it("applies number filter set (equals, ranges, blank)", () => {
			const low = baseCalc({ finalCoefficient: 0.5 });
			const high = baseCalc({ finalCoefficient: 5 } as any);
			expect(
				service.applyFiltersAndSort([low, high], {
					finalCoefficient: {
						filterType: "number",
						type: "lessThan",
						filter: 1,
					} as any,
				}),
			).toEqual([low]);
			expect(
				service.applyFiltersAndSort([low, high], {
					finalCoefficient: {
						filterType: "number",
						type: "inRange",
						filter: 1,
						filterTo: 10,
					} as any,
				}),
			).toEqual([high]);
			expect(
				service.applyFiltersAndSort([low, high], {
					finalCoefficient: {
						filterType: "number",
						type: "greaterThanOrEqual",
						filter: 5,
					} as any,
				}),
			).toEqual([high]);
			expect(
				service.applyFiltersAndSort([low, high], {
					finalCoefficient: { filterType: "number", type: "notBlank" } as any,
				}),
			).toEqual([low, high]);
		});

		it("applies date filter (equals on same day, range, lessThan, greaterThan)", () => {
			const a = baseCalc({ createdAt: new Date("2025-01-15T10:00:00Z") });
			const b = baseCalc({ createdAt: new Date("2025-02-15T10:00:00Z") });
			expect(
				service.applyFiltersAndSort([a, b], {
					createdAt: {
						filterType: "date",
						type: "equals",
						dateFrom: "2025-01-15T00:00:00Z",
					} as any,
				}),
			).toEqual([a]);
			expect(
				service.applyFiltersAndSort([a, b], {
					createdAt: {
						filterType: "date",
						type: "inRange",
						dateFrom: "2025-01-01T00:00:00Z",
						dateTo: "2025-01-31T23:59:59Z",
					} as any,
				}),
			).toEqual([a]);
		});

		it("applies set filter", () => {
			const a = baseCalc({ author: "Alice" });
			const b = baseCalc({ author: "Bob" });
			expect(
				service.applyFiltersAndSort([a, b], {
					author: { filterType: "set", values: ["Alice"] } as any,
				}),
			).toEqual([a]);
			expect(
				service.applyFiltersAndSort([a, b], {
					author: { filterType: "set", values: [] } as any,
				}),
			).toEqual([]);
		});

		it("supports combined AND/OR filters", () => {
			const a = baseCalc({ calcName: "abc" });
			const b = baseCalc({ calcName: "xyz" });
			const orFilter: any = {
				operator: "OR",
				condition1: { filterType: "text", type: "equals", filter: "abc" },
				condition2: { filterType: "text", type: "equals", filter: "xyz" },
			};
			expect(
				service.applyFiltersAndSort([a, b], { calcName: orFilter }),
			).toEqual([a, b]);

			const andFilter: any = {
				operator: "AND",
				condition1: { filterType: "text", type: "contains", filter: "a" },
				condition2: { filterType: "text", type: "contains", filter: "b" },
			};
			expect(
				service.applyFiltersAndSort([a, b], { calcName: andFilter }),
			).toEqual([a]);
		});

		it("warns and passes through for unsupported filter type", () => {
			const a = baseCalc();
			const result = service.applyFiltersAndSort([a], {
				calcName: { filterType: "weird" } as any,
			});
			expect(result).toEqual([a]);
		});
	});

	describe("getValueFromCalculation (via filter)", () => {
		it("extracts nested questionnaireData.* path", () => {
			const a = baseCalc({
				questionnaireData: {
					...baseCalc().questionnaireData,
					modelsCount: 7,
				} as any,
			});
			const b = baseCalc({
				questionnaireData: {
					...baseCalc().questionnaireData,
					modelsCount: 1,
				} as any,
			});
			const result = service.applyFiltersAndSort([a, b], {
				"questionnaireData.modelsCount": {
					filterType: "number",
					type: "equals",
					filter: 7,
				} as any,
			});
			expect(result).toEqual([a]);
		});

		it("computes generalUncertainty count", () => {
			const a = baseCalc();
			const result = service.applyFiltersAndSort([a], {
				"questionnaireData.generalUncertainty": {
					filterType: "number",
					type: "equals",
					filter: 1,
				} as any,
			});
			expect(result).toEqual([a]);
		});

		it("computes algorithmComplexity textual aggregate", () => {
			const a = baseCalc();
			const result = service.applyFiltersAndSort([a], {
				"questionnaireData.algorithmComplexity": {
					filterType: "text",
					type: "contains",
					filter: "из 2",
				} as any,
			});
			expect(result).toEqual([a]);
		});

		it("checks algorithmType.<idx> presence as boolean", () => {
			const a = baseCalc();
			expect(
				service.applyFiltersAndSort([a], {
					"questionnaireData.algorithmType.0.": {
						filterType: "set",
						values: ["true"],
					} as any,
				}),
			).toEqual([a]);
		});

		it("extracts calculationResult.<idx>.score as number", () => {
			const a = baseCalc();
			expect(
				service.applyFiltersAndSort([a], {
					"questionnaireData.calculationResult.0.": {
						filterType: "number",
						type: "equals",
						filter: 5,
					} as any,
				}),
			).toEqual([a]);
		});
	});

	describe("applySort", () => {
		it("sorts ascending and descending by string", () => {
			const a = baseCalc({ calcName: "B" });
			const b = baseCalc({ calcName: "A" });
			const asc = service.applyFiltersAndSort([a, b], undefined, [
				{ colId: "calcName", sort: "asc" },
			]);
			expect(asc.map((c) => c.calcName)).toEqual(["A", "B"]);

			const desc = service.applyFiltersAndSort([a, b], undefined, [
				{ colId: "calcName", sort: "desc" },
			]);
			expect(desc.map((c) => c.calcName)).toEqual(["B", "A"]);
		});

		it("sorts by number", () => {
			const a = baseCalc({ finalCoefficient: 5 });
			const b = baseCalc({ finalCoefficient: 1 });
			const result = service.applyFiltersAndSort([a, b], undefined, [
				{ colId: "finalCoefficient", sort: "asc" },
			]);
			expect(result.map((c) => c.finalCoefficient)).toEqual([1, 5]);
		});

		it("sorts by date", () => {
			const a = baseCalc({ createdAt: new Date("2025-03-01T00:00:00Z") });
			const b = baseCalc({ createdAt: new Date("2025-01-01T00:00:00Z") });
			const result = service.applyFiltersAndSort([a, b], undefined, [
				{ colId: "createdAt", sort: "asc" },
			]);
			expect(result[0]).toBe(b);
		});

		it("treats null/undefined as smallest", () => {
			const a = baseCalc({ author: null as any });
			const b = baseCalc({ author: "Z" });
			const result = service.applyFiltersAndSort([a, b], undefined, [
				{ colId: "author", sort: "asc" },
			]);
			expect(result[0]).toBe(a);
		});

		it("treats null on the right side as larger", () => {
			const a = baseCalc({ author: "A" });
			const b = baseCalc({ author: null as any });
			const result = service.applyFiltersAndSort([a, b], undefined, [
				{ colId: "author", sort: "asc" },
			]);
			expect(result[0]).toBe(b);
		});
	});

	describe("edge cases", () => {
		it("number filter returns false when value is null and type != blank", () => {
			const a = baseCalc({ finalCoefficient: undefined as any });
			expect(
				service.applyFiltersAndSort([a], {
					finalCoefficient: {
						filterType: "number",
						type: "equals",
						filter: 0,
					} as any,
				}),
			).toEqual([]);
		});

		it("number filter returns true for blank when value is null", () => {
			const a = baseCalc({ finalCoefficient: undefined as any });
			expect(
				service.applyFiltersAndSort([a], {
					finalCoefficient: { filterType: "number", type: "blank" } as any,
				}),
			).toEqual([a]);
		});

		it("number filter unknown subtype falls back to true", () => {
			const a = baseCalc({ finalCoefficient: 1 });
			expect(
				service.applyFiltersAndSort([a], {
					finalCoefficient: { filterType: "number", type: "weird" } as any,
				}),
			).toEqual([a]);
		});

		it("text filter unknown subtype falls back to true", () => {
			const a = baseCalc({ calcName: "x" });
			expect(
				service.applyFiltersAndSort([a], {
					calcName: { filterType: "text", type: "weird" } as any,
				}),
			).toEqual([a]);
		});

		it("date filter handles invalid date as blank", () => {
			const a = baseCalc({ createdAt: "not-a-date" as any });
			expect(
				service.applyFiltersAndSort([a], {
					createdAt: {
						filterType: "date",
						type: "blank",
						dateFrom: "2025-01-01",
					} as any,
				}),
			).toEqual([a]);
		});

		it("date inRange returns false when no dateTo provided", () => {
			const a = baseCalc({ createdAt: new Date("2025-01-15") });
			expect(
				service.applyFiltersAndSort([a], {
					createdAt: {
						filterType: "date",
						type: "inRange",
						dateFrom: "2025-01-01",
					} as any,
				}),
			).toEqual([]);
		});

		it("date filter unknown subtype falls back to true", () => {
			const a = baseCalc();
			expect(
				service.applyFiltersAndSort([a], {
					createdAt: {
						filterType: "date",
						type: "weird",
						dateFrom: "2025-01-01",
					} as any,
				}),
			).toEqual([a]);
		});

		it("set filter notEqual via empty values returns []", () => {
			const a = baseCalc();
			expect(
				service.applyFiltersAndSort([a], {
					author: { filterType: "set", values: [] } as any,
				}),
			).toEqual([]);
		});

		it("calculationResult value extractor returns null when array missing", () => {
			const a = baseCalc({
				questionnaireData: {
					...baseCalc().questionnaireData,
					calculationResult: undefined,
				} as any,
			});
			expect(
				service.applyFiltersAndSort([a], {
					"questionnaireData.calculationResult.0.": {
						filterType: "number",
						type: "blank",
					} as any,
				}),
			).toEqual([a]);
		});

		it("algorithmType returns false for out-of-range index", () => {
			const a = baseCalc();
			expect(
				service.applyFiltersAndSort([a], {
					"questionnaireData.algorithmType.99.": {
						filterType: "set",
						values: ["false"],
					} as any,
				}),
			).toEqual([a]);
		});

		it("getNestedValue returns undefined for non-object intermediate", () => {
			const a = baseCalc({
				questionnaireData: {
					...baseCalc().questionnaireData,
					modelsCount: 5,
				} as any,
			});
			// Try to descend into a primitive: questionnaireData.modelsCount.foo
			expect(
				service.applyFiltersAndSort([a], {
					"questionnaireData.modelsCount.foo": {
						filterType: "text",
						type: "blank",
					} as any,
				}),
			).toEqual([a]);
		});
	});
});
