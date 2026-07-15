"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const v2_work_arch_count_coeff_util_1 = require("./v2-work-arch-count-coeff.util");
(0, vitest_1.describe)("v2-work-arch-count-coeff.util", () => {
    (0, vitest_1.it)("resolves model count from modelsList", () => {
        (0, vitest_1.expect)((0, v2_work_arch_count_coeff_util_1.resolveWorkArchComponentCount)({
            detailInfo: {
                modelsList: [{ name: "A" }, { name: "B" }],
            },
        }, "model")).toBe(2);
    });
    (0, vitest_1.it)("resolves filled source systems count", () => {
        (0, vitest_1.expect)((0, v2_work_arch_count_coeff_util_1.resolveWorkArchComponentCount)({
            detailInfo: {
                sourceSystems: [{ name: "S1" }, {}, { name: "S2" }],
            },
        }, "sourceSystem")).toBe(2);
    });
    (0, vitest_1.it)("lookupArchCountCoefficient returns exact match only", () => {
        const steps = [
            { count: 1, coefficient: 2 },
            { count: 2, coefficient: 1.5 },
        ];
        (0, vitest_1.expect)((0, v2_work_arch_count_coeff_util_1.lookupArchCountCoefficient)(steps, 1)).toBe(2);
        (0, vitest_1.expect)((0, v2_work_arch_count_coeff_util_1.lookupArchCountCoefficient)(steps, 2)).toBe(1.5);
        (0, vitest_1.expect)((0, v2_work_arch_count_coeff_util_1.lookupArchCountCoefficient)(steps, 3)).toBeNull();
    });
    (0, vitest_1.it)("resolveArchCountCoeffFromToken falls back to 1", () => {
        (0, vitest_1.expect)((0, v2_work_arch_count_coeff_util_1.resolveArchCountCoeffFromToken)({ detailInfo: { modelsList: [{}, {}, {}] } }, "model", [{ count: 1, coefficient: 2 }])).toBe(1);
    });
    (0, vitest_1.it)("validateArchCountCoeffSteps enforces model range 1-99", () => {
        (0, vitest_1.expect)((0, v2_work_arch_count_coeff_util_1.validateArchCountCoeffSteps)("model", [{ count: 100, coefficient: 1 }])).toMatch(/1.*99/);
    });
    (0, vitest_1.it)("parseArchCountCoeffSteps and format round-trip", () => {
        const raw = "1=2; 2=1.5";
        const steps = (0, v2_work_arch_count_coeff_util_1.parseArchCountCoeffSteps)(raw);
        (0, vitest_1.expect)(steps).toEqual([
            { count: 1, coefficient: 2 },
            { count: 2, coefficient: 1.5 },
        ]);
        (0, vitest_1.expect)((0, v2_work_arch_count_coeff_util_1.formatArchCountCoeffSteps)(steps)).toBe("1=2; 2=1,5");
    });
    (0, vitest_1.it)("parseWorkArchCountKindLabel accepts Russian labels", () => {
        (0, vitest_1.expect)((0, v2_work_arch_count_coeff_util_1.parseWorkArchCountKindLabel)("Модели")).toBe("model");
        (0, vitest_1.expect)((0, v2_work_arch_count_coeff_util_1.parseWorkArchCountKindLabel)("Система-источник")).toBe("sourceSystem");
    });
});
