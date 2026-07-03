"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const v2_typical_work_jsonlogic_util_1 = require("./v2-typical-work-jsonlogic.util");
const v2_typical_work_types_1 = require("./v2-typical-work.types");
const v2_work_formula_util_1 = require("./v2-work-formula.util");
(0, vitest_1.describe)("v2-typical-work-jsonlogic.util", () => {
    (0, vitest_1.it)("compiles N × P[x] to JsonLogic", () => {
        const parsed = (0, v2_work_formula_util_1.parseWorkFormulaText)("N × P[Сложность]");
        const jl = (0, v2_typical_work_jsonlogic_util_1.compileWorkFormulaTokensToJsonLogic)(parsed.tokens);
        (0, vitest_1.expect)(jl).toEqual({
            "*": [{ var: "norm" }, { var: "coeff.Сложность" }],
        });
    });
    (0, vitest_1.it)("compiles triggers to and-chain", () => {
        const jl = (0, v2_typical_work_jsonlogic_util_1.compileTypicalWorkTriggerRulesToJsonLogic)([
            {
                paramCode: "type",
                paramName: "Тип источника",
                operator: "=",
                valueCode: null,
                valueLabel: "Внутренний",
            },
            {
                paramCode: "count",
                paramName: "Количество",
                operator: ">=",
                valueCode: null,
                valueLabel: "3",
            },
        ]);
        (0, vitest_1.expect)(jl).toEqual({
            and: [
                {
                    "==": [{ typicalWorkField: ["type", "Тип источника"] }, "Внутренний"],
                },
                { ">=": [{ typicalWorkField: ["count", "Количество"] }, "3"] },
            ],
        });
    });
    (0, vitest_1.it)("evaluates result JsonLogic with roundStep like token engine", () => {
        const parsed = (0, v2_work_formula_util_1.parseWorkFormulaText)("N × P[x]");
        const logic = (0, v2_typical_work_jsonlogic_util_1.compileTypicalWorkCalculationLogic)({
            formula: { tokens: parsed.tokens, text: "N × P[x]" },
            rounding: (0, v2_typical_work_types_1.defaultWorkRounding)(),
            rules: [],
        });
        (0, vitest_1.expect)(logic).not.toBeNull();
        const viaJsonLogic = (0, v2_typical_work_jsonlogic_util_1.evaluateTypicalWorkResultJsonLogic)(logic, { norm: 1.25, paramCoefficients: { x: 0.5 } }, "N × P[x]");
        const viaTokens = (0, v2_work_formula_util_1.previewWorkFormula)({ tokens: parsed.tokens, text: "N × P[x]" }, (0, v2_typical_work_types_1.defaultWorkRounding)(), { norm: 1.25, paramCoefficients: { x: 0.5 } });
        (0, vitest_1.expect)(viaJsonLogic.error).toBeNull();
        (0, vitest_1.expect)(viaJsonLogic.value).toBeCloseTo(viaTokens.value ?? 0, 5);
    });
    (0, vitest_1.it)("previewTypicalWorkCalculation falls back without stored logic", () => {
        const formula = (0, v2_typical_work_types_1.defaultWorkFormula)();
        const result = (0, v2_typical_work_jsonlogic_util_1.previewTypicalWorkCalculation)(null, {
            formula,
            rounding: (0, v2_typical_work_types_1.defaultWorkRounding)(),
        }, { norm: 2, paramCoefficients: {} });
        (0, vitest_1.expect)(result.value).toBe(2);
    });
    (0, vitest_1.it)("runtime include rejects when triggers do not match", () => {
        const rules = [
            {
                paramCode: "type",
                paramName: "Тип",
                operator: "=",
                valueCode: null,
                valueLabel: "Внутренний",
            },
        ];
        const logic = (0, v2_typical_work_jsonlogic_util_1.compileTypicalWorkCalculationLogic)({
            formula: (0, v2_typical_work_types_1.defaultWorkFormula)(),
            rounding: (0, v2_typical_work_types_1.defaultWorkRounding)(),
            rules,
        });
        (0, vitest_1.expect)(logic).not.toBeNull();
        const out = (0, v2_typical_work_jsonlogic_util_1.evaluateTypicalWorkCalculation)({
            logic: logic,
            rules,
            source: { type: "Внешний" },
            norm: 1,
            paramCoefficients: {},
            rounding: (0, v2_typical_work_types_1.defaultWorkRounding)(),
        });
        (0, vitest_1.expect)(out.included).toBe(false);
    });
    (0, vitest_1.it)("evaluates roundStep op", () => {
        const result = (0, v2_typical_work_jsonlogic_util_1.evaluateTypicalWorkJsonLogicValue)({ roundStep: [{ var: "norm" }, "CEIL", 0.1] }, { norm: 1.25 });
        (0, vitest_1.expect)(result).toBeCloseTo(1.3, 5);
    });
    (0, vitest_1.it)("compiles version_config formula when calculationLogic is missing", () => {
        const formula = (0, v2_typical_work_types_1.defaultWorkFormula)();
        const compiled = (0, v2_typical_work_jsonlogic_util_1.compileCalculationLogicFromVersionConfig)({
            formula: formula.tokens,
            formulaText: formula.text,
            roundingMode: "NONE",
            roundingStep: null,
        });
        (0, vitest_1.expect)(compiled?.version).toBe(1);
        (0, vitest_1.expect)(compiled?.result).toBeTruthy();
        (0, vitest_1.expect)((0, v2_typical_work_jsonlogic_util_1.needsCalculationLogicBackfill)(null)).toBe(true);
        (0, vitest_1.expect)((0, v2_typical_work_jsonlogic_util_1.needsCalculationLogicBackfill)(compiled)).toBe(false);
    });
});
