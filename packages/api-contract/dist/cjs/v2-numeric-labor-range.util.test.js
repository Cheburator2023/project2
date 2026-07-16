"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const v2_numeric_labor_range_util_1 = require("./v2-numeric-labor-range.util");
(0, vitest_1.describe)("v2-numeric-labor-range.util", () => {
    (0, vitest_1.it)("returns metrics range preset", () => {
        const rows = (0, v2_numeric_labor_range_util_1.resolveNumericLaborPresetRows)("Количество метрик");
        (0, vitest_1.expect)(rows?.map((row) => row.valueLabel)).toEqual([
            "до 20 метрик",
            "20–50 метрик",
            ">50 метрик",
        ]);
    });
    (0, vitest_1.it)("builds production vitrins rows with legacy coefficients", () => {
        const rows = (0, v2_numeric_labor_range_util_1.buildProductionAdditionalVitrinsLaborRows)();
        (0, vitest_1.expect)(rows.find((row) => row.valueLabel === "Не требуется")?.coefficient).toBe(0);
        (0, vitest_1.expect)(rows.find((row) => row.valueLabel === "1")?.coefficient).toBe(1);
        (0, vitest_1.expect)(rows.find((row) => row.valueLabel === "3")?.coefficient).toBe(2.5);
    });
    (0, vitest_1.it)("treats numeric schema fields without enum as by-value labor params", () => {
        (0, vitest_1.expect)((0, v2_numeric_labor_range_util_1.isNumericLaborByValueParam)({
            numeric: true,
            values: [],
            name: "Произвольное число",
        })).toBe(true);
        (0, vitest_1.expect)((0, v2_numeric_labor_range_util_1.isNumericLaborByValueParam)({
            numeric: true,
            values: [{ code: "a", label: "A" }],
            name: "Справочник",
        })).toBe(false);
    });
});
