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
    (0, vitest_1.it)("does not double-count sourceSystems mirrored into streamDataSources", () => {
        const sources = [
            { name: "S1", type: "Внутренний" },
            { name: "S2", type: "Внутренний" },
            { name: "S3", type: "Внутренний" },
            { name: "S4", type: "Внутренний" },
            { name: "S5", type: "Внутренний" },
            { name: "S6", type: "Внутренний" },
        ];
        (0, vitest_1.expect)((0, v2_work_arch_count_coeff_util_1.resolveWorkArchComponentCount)({
            detailInfo: { sourceSystems: sources },
            streamDataSources: { sourceSystems: sources },
        }, "sourceSystem")).toBe(6);
        (0, vitest_1.expect)((0, v2_work_arch_count_coeff_util_1.resolveArchCountCoeffFromToken)({
            detailInfo: { sourceSystems: sources },
            streamDataSources: { sourceSystems: sources },
        }, "sourceSystem", [
            { count: 5, coefficient: 1, operator: "<=" },
            {
                count: 5,
                coefficient: 1,
                operator: ">",
                coefficientFormula: "N/5",
            },
        ])).toBe(1.2);
    });
    (0, vitest_1.it)("lookupArchCountCoefficient returns exact match for legacy steps", () => {
        const steps = [
            { count: 1, coefficient: 2 },
            { count: 2, coefficient: 1.5 },
        ];
        (0, vitest_1.expect)((0, v2_work_arch_count_coeff_util_1.lookupArchCountCoefficient)(steps, 1)).toBe(2);
        (0, vitest_1.expect)((0, v2_work_arch_count_coeff_util_1.lookupArchCountCoefficient)(steps, 2)).toBe(1.5);
        (0, vitest_1.expect)((0, v2_work_arch_count_coeff_util_1.lookupArchCountCoefficient)(steps, 3)).toBeNull();
    });
    (0, vitest_1.it)("lookupArchCountCoefficient supports ranges and N formulas", () => {
        const steps = [
            { count: 5, coefficient: 1, operator: "<=" },
            {
                count: 5,
                coefficient: 1,
                operator: ">",
                coefficientFormula: "N/5",
            },
        ];
        (0, vitest_1.expect)((0, v2_work_arch_count_coeff_util_1.lookupArchCountCoefficient)(steps, 3)).toBe(1);
        (0, vitest_1.expect)((0, v2_work_arch_count_coeff_util_1.lookupArchCountCoefficient)(steps, 5)).toBe(1);
        (0, vitest_1.expect)((0, v2_work_arch_count_coeff_util_1.lookupArchCountCoefficient)(steps, 10)).toBe(2);
    });
    (0, vitest_1.it)("lookupArchCountCoefficient uses first matching step by order", () => {
        const steps = [
            {
                count: 1,
                coefficient: 9,
                operator: ">=",
                coefficientFormula: null,
            },
            { count: 5, coefficient: 1, operator: "<=" },
        ];
        (0, vitest_1.expect)((0, v2_work_arch_count_coeff_util_1.lookupArchCountCoefficient)(steps, 3)).toBe(9);
    });
    (0, vitest_1.it)("evalArchCountCoefficientFormula evaluates safe expressions", () => {
        (0, vitest_1.expect)((0, v2_work_arch_count_coeff_util_1.evalArchCountCoefficientFormula)("N/5", 10)).toBe(2);
        (0, vitest_1.expect)((0, v2_work_arch_count_coeff_util_1.evalArchCountCoefficientFormula)("1+(N-1)*0.75", 5)).toBe(4);
        (0, vitest_1.expect)((0, v2_work_arch_count_coeff_util_1.evalArchCountCoefficientFormula)("N/0", 5)).toBeNull();
        (0, vitest_1.expect)((0, v2_work_arch_count_coeff_util_1.evalArchCountCoefficientFormula)("Math.max(N,1)", 5)).toBeNull();
        (0, vitest_1.expect)((0, v2_work_arch_count_coeff_util_1.evalArchCountCoefficientFormula)("alert(1)", 5)).toBeNull();
        (0, vitest_1.expect)((0, v2_work_arch_count_coeff_util_1.evalArchCountCoefficientFormula)("", 5)).toBeNull();
    });
    (0, vitest_1.it)("validateArchCountCoeffSteps accepts formulas and rejects duplicates", () => {
        (0, vitest_1.expect)((0, v2_work_arch_count_coeff_util_1.validateArchCountCoeffSteps)("sourceSystem", [
            { count: 5, coefficient: 1, operator: "<=", coefficientFormula: null },
            {
                count: 5,
                coefficient: 1,
                operator: ">",
                coefficientFormula: "N/5",
            },
        ])).toBeNull();
        (0, vitest_1.expect)((0, v2_work_arch_count_coeff_util_1.validateArchCountCoeffSteps)("sourceSystem", [
            { count: 5, coefficient: 1, operator: "<=" },
            { count: 5, coefficient: 2, operator: "<=" },
        ])).toMatch(/Повторяющееся/);
        (0, vitest_1.expect)((0, v2_work_arch_count_coeff_util_1.validateArchCountCoeffSteps)("sourceSystem", [
            { count: 5, coefficient: 1, coefficientFormula: "N/" },
        ])).toMatch(/Формула/);
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
    (0, vitest_1.it)("formatLaborArchCountStepLabel uses operators and formulas", () => {
        (0, vitest_1.expect)((0, v2_work_arch_count_coeff_util_1.formatLaborArchCountStepLabel)({
            count: 5,
            coefficient: 1,
            operator: "<=",
        })).toBe("≤5 → 1");
        (0, vitest_1.expect)((0, v2_work_arch_count_coeff_util_1.formatLaborArchCountStepLabel)({
            count: 5,
            coefficient: 1,
            operator: ">",
            coefficientFormula: "N/5",
        })).toBe(">5 → N/5");
    });
    (0, vitest_1.it)("parseWorkArchCountKindLabel accepts Russian labels", () => {
        (0, vitest_1.expect)((0, v2_work_arch_count_coeff_util_1.parseWorkArchCountKindLabel)("Модели")).toBe("model");
        (0, vitest_1.expect)((0, v2_work_arch_count_coeff_util_1.parseWorkArchCountKindLabel)("Система-источник")).toBe("sourceSystem");
    });
    (0, vitest_1.it)("archCountTriggerMatches supports comparison operators", () => {
        const formWithTwoModels = {
            detailInfo: { modelsList: [{ id: 1 }, { id: 2 }] },
        };
        (0, vitest_1.expect)((0, v2_work_arch_count_coeff_util_1.archCountTriggerMatches)(formWithTwoModels, "model", (0, v2_work_arch_count_coeff_util_1.encodeTriggerArchCountSteps)(">=", 2))).toBe(true);
        (0, vitest_1.expect)((0, v2_work_arch_count_coeff_util_1.archCountTriggerMatches)(formWithTwoModels, "model", (0, v2_work_arch_count_coeff_util_1.encodeTriggerArchCountSteps)("=", 2))).toBe(true);
        (0, vitest_1.expect)((0, v2_work_arch_count_coeff_util_1.archCountTriggerMatches)(formWithTwoModels, "model", (0, v2_work_arch_count_coeff_util_1.encodeTriggerArchCountSteps)("=", 3))).toBe(false);
        (0, vitest_1.expect)((0, v2_work_arch_count_coeff_util_1.archCountTriggerMatches)(formWithTwoModels, "model", (0, v2_work_arch_count_coeff_util_1.encodeTriggerArchCountSteps)(">", 2))).toBe(false);
        (0, vitest_1.expect)((0, v2_work_arch_count_coeff_util_1.archCountTriggerMatches)(formWithTwoModels, "model", (0, v2_work_arch_count_coeff_util_1.encodeTriggerArchCountSteps)("<=", 2))).toBe(true);
    });
    (0, vitest_1.it)("trigger encode/decode ignores labor-only fields", () => {
        const steps = (0, v2_work_arch_count_coeff_util_1.encodeTriggerArchCountSteps)("<=", 5);
        (0, vitest_1.expect)(steps).toEqual([{ count: 5, coefficient: -2 }]);
        (0, vitest_1.expect)((0, v2_work_arch_count_coeff_util_1.decodeTriggerArchCountCondition)(steps)).toEqual({
            operator: "<=",
            threshold: 5,
        });
        (0, vitest_1.expect)((0, v2_work_arch_count_coeff_util_1.decodeTriggerArchCountCondition)([
            {
                count: 5,
                coefficient: -2,
                operator: ">",
                coefficientFormula: "N/5",
            },
        ])).toEqual({ operator: "<=", threshold: 5 });
    });
    (0, vitest_1.it)("archCountTriggerMatches requires count >= min step (legacy)", () => {
        (0, vitest_1.expect)((0, v2_work_arch_count_coeff_util_1.archCountTriggerMatches)({}, "model", [{ count: 2, coefficient: 1 }])).toBe(false);
    });
});
