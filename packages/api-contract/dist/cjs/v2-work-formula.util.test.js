"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const v2_work_formula_util_1 = require("./v2-work-formula.util");
const v2_typical_work_types_1 = require("./v2-typical-work.types");
(0, vitest_1.describe)("v2-work-formula.util", () => {
    (0, vitest_1.it)("parses H × P[param]", () => {
        const parsed = (0, v2_work_formula_util_1.parseWorkFormulaText)("H × P[Сложность]");
        (0, vitest_1.expect)(parsed.error).toBeNull();
        (0, vitest_1.expect)(parsed.tokens).toHaveLength(3);
    });
    (0, vitest_1.it)("parses legacy N × P[param]", () => {
        const parsed = (0, v2_work_formula_util_1.parseWorkFormulaText)("N × P[Сложность]");
        (0, vitest_1.expect)(parsed.error).toBeNull();
        (0, vitest_1.expect)(parsed.tokens).toHaveLength(3);
    });
    (0, vitest_1.it)("formats general summary with Кэф-П indices", () => {
        const tokens = (0, v2_work_formula_util_1.parseWorkFormulaText)("N * P[a]").tokens;
        (0, vitest_1.expect)((0, v2_work_formula_util_1.formatWorkFormulaGeneralSummary)(tokens, ["a"])).toBe("N * Кэф-П1");
    });
    (0, vitest_1.it)("evaluates norm only", () => {
        const formula = (0, v2_typical_work_types_1.defaultWorkFormula)();
        const result = (0, v2_work_formula_util_1.evaluateWorkFormula)(formula, { norm: 2, paramCoefficients: {} });
        (0, vitest_1.expect)(result.value).toBe(2);
        (0, vitest_1.expect)(result.error).toBeNull();
    });
    (0, vitest_1.it)("evaluates N × coeff with rounding up", () => {
        const parsed = (0, v2_work_formula_util_1.parseWorkFormulaText)("N × P[x]");
        const result = (0, v2_work_formula_util_1.previewWorkFormula)({ tokens: parsed.tokens, text: "N × P[x]" }, (0, v2_typical_work_types_1.defaultWorkRounding)(), { norm: 1.25, paramCoefficients: { x: 0.5 } });
        (0, vitest_1.expect)(result.value).toBeCloseTo(0.7, 5);
        (0, vitest_1.expect)(result.error).toBeNull();
    });
    (0, vitest_1.it)("rejects unbalanced parens", () => {
        const parsed = (0, v2_work_formula_util_1.parseWorkFormulaText)("( N × 2");
        (0, vitest_1.expect)(parsed.error).toMatch(/скобк/i);
    });
    (0, vitest_1.it)("applyWorkRounding NONE keeps raw value", () => {
        (0, vitest_1.expect)((0, v2_work_formula_util_1.applyWorkRounding)(1.23, { mode: "NONE", step: null })).toBe(1.23);
    });
    (0, vitest_1.it)("validateWorkFormulaTokens catches double operator", () => {
        const err = (0, v2_work_formula_util_1.validateWorkFormulaTokens)([
            { kind: "norm" },
            { kind: "operator", op: "+" },
            { kind: "operator", op: "+" },
            { kind: "number", value: 1 },
        ]);
        (0, vitest_1.expect)(err).toMatch(/оператор/i);
    });
    (0, vitest_1.it)("marks removed labor param invalid and blocks preview", () => {
        const tokens = (0, v2_work_formula_util_1.markFormulaParamInvalid)([
            { kind: "norm" },
            { kind: "operator", op: "*" },
            { kind: "param_coeff", paramCode: "x", paramName: "Сложность" },
        ], "x");
        (0, vitest_1.expect)((0, v2_work_formula_util_1.isParamUsedInFormula)(tokens, "x")).toBe(false);
        (0, vitest_1.expect)((0, v2_work_formula_util_1.validateWorkFormulaTokens)(tokens, {
            allowedParamCodes: new Set(),
            allowInvalidParamRefs: true,
        })).toBeNull();
        const result = (0, v2_work_formula_util_1.evaluateWorkFormula)({ tokens, text: "N × P[Сложность]?" }, { norm: 1, paramCoefficients: {} });
        (0, vitest_1.expect)(result.error).toMatch(/удалён/i);
    });
});
