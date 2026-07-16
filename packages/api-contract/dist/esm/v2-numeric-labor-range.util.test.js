import { describe, expect, it } from "vitest";
import { buildProductionAdditionalVitrinsLaborRows, isNumericLaborByValueParam, resolveNumericLaborPresetRows, } from "./v2-numeric-labor-range.util";
describe("v2-numeric-labor-range.util", () => {
    it("returns metrics range preset", () => {
        const rows = resolveNumericLaborPresetRows("Количество метрик");
        expect(rows?.map((row) => row.valueLabel)).toEqual([
            "до 20 метрик",
            "20–50 метрик",
            ">50 метрик",
        ]);
    });
    it("builds production vitrins rows with legacy coefficients", () => {
        const rows = buildProductionAdditionalVitrinsLaborRows();
        expect(rows.find((row) => row.valueLabel === "Не требуется")?.coefficient).toBe(0);
        expect(rows.find((row) => row.valueLabel === "1")?.coefficient).toBe(1);
        expect(rows.find((row) => row.valueLabel === "3")?.coefficient).toBe(2.5);
    });
    it("treats numeric schema fields without enum as by-value labor params", () => {
        expect(isNumericLaborByValueParam({
            numeric: true,
            values: [],
            name: "Произвольное число",
        })).toBe(true);
        expect(isNumericLaborByValueParam({
            numeric: true,
            values: [{ code: "a", label: "A" }],
            name: "Справочник",
        })).toBe(false);
    });
});
