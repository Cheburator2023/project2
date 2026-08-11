import { describe, expect, it } from "vitest";
import {
	buildProductionAdditionalVitrinsLaborRows,
	isNumericLaborByValueParam,
	resolveNumericLaborPresetRows,
} from "./v2-numeric-labor-range.util";

describe("v2-numeric-labor-range.util", () => {
	it("returns metrics range preset as surcharge (+0 / +0.2 / +0.4)", () => {
		const rows = resolveNumericLaborPresetRows("Количество метрик");
		expect(rows).toEqual([
			{ valueCode: "do_20", valueLabel: "до 20 метрик", coefficient: 0 },
			{ valueCode: "20_50", valueLabel: "20–50 метрик", coefficient: 0.2 },
			{ valueCode: "over_50", valueLabel: ">50 метрик", coefficient: 0.4 },
		]);
	});

	it("builds production vitrins rows with legacy coefficients", () => {
		const rows = buildProductionAdditionalVitrinsLaborRows();
		expect(rows.find((row) => row.valueLabel === "Не требуется")?.coefficient).toBe(
			0,
		);
		expect(rows.find((row) => row.valueLabel === "1")?.coefficient).toBe(1);
		expect(rows.find((row) => row.valueLabel === "3")?.coefficient).toBe(2.5);
	});

	it("treats numeric schema fields without enum as by-value labor params", () => {
		expect(
			isNumericLaborByValueParam({
				numeric: true,
				values: [],
				name: "Произвольное число",
			}),
		).toBe(true);
		expect(
			isNumericLaborByValueParam({
				numeric: true,
				values: [{ code: "a", label: "A" }],
				name: "Справочник",
			}),
		).toBe(false);
	});
});
