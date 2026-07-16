"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const v2_work_formula_util_1 = require("./v2-work-formula.util");
const v2_typical_work_types_1 = require("./v2-typical-work.types");
(0, vitest_1.describe)("v2-work-formula.util", () => {
    (0, vitest_1.it)("parses and evaluates arch_count_coeff token", () => {
        const token = {
            kind: "arch_count_coeff",
            archComponentKind: "model",
            steps: [
                { count: 1, coefficient: 2 },
                { count: 2, coefficient: 1.5 },
            ],
        };
        const text = (0, v2_work_formula_util_1.tokensToText)([token]);
        (0, vitest_1.expect)(text).toContain("архкоэф");
        const parsed = (0, v2_work_formula_util_1.parseWorkFormulaText)(text);
        (0, vitest_1.expect)(parsed.error).toBeNull();
        (0, vitest_1.expect)(parsed.tokens[0]).toMatchObject({
            kind: "arch_count_coeff",
            archComponentKind: "model",
        });
        const formula = {
            tokens: [token, { kind: "operator", op: "*" }, { kind: "norm" }],
            text,
        };
        const result = (0, v2_work_formula_util_1.evaluateWorkFormula)(formula, {
            norm: 10,
            paramCoefficients: {},
            formData: { detailInfo: { modelsList: [{ name: "A" }] } },
        });
        (0, vitest_1.expect)(result.value).toBe(20);
        (0, vitest_1.expect)(result.error).toBeNull();
    });
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
    (0, vitest_1.it)("parses norm word and coeff with spaces in param name", () => {
        const parsed = (0, v2_work_formula_util_1.parseWorkFormulaText)("норма × коэф(Сложность реализации)");
        (0, vitest_1.expect)(parsed.error).toBeNull();
        (0, vitest_1.expect)(parsed.tokens).toEqual([
            { kind: "norm" },
            { kind: "operator", op: "*" },
            {
                kind: "param_coeff",
                paramCode: "Сложность реализации",
                paramName: "Сложность реализации",
            },
        ]);
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
    (0, vitest_1.it)("parses subtraction with unicode minus from tokensToText", () => {
        const tokens = [
            { kind: "norm" },
            { kind: "operator", op: "-" },
            { kind: "number", value: 1 },
        ];
        const text = (0, v2_work_formula_util_1.tokensToText)(tokens);
        (0, vitest_1.expect)(text).toBe("N − 1");
        const parsed = (0, v2_work_formula_util_1.parseWorkFormulaText)(text);
        (0, vitest_1.expect)(parsed.error).toBeNull();
        (0, vitest_1.expect)(parsed.tokens).toEqual(tokens);
    });
    (0, vitest_1.it)("round-trips param names with parentheses in коэф()", () => {
        const tokens = [
            { kind: "norm" },
            { kind: "operator", op: "*" },
            {
                kind: "param_coeff",
                paramCode: "field_sphere",
                paramName: "Базовая оценка по стриму (СФЕРА)",
            },
        ];
        const text = (0, v2_work_formula_util_1.tokensToText)(tokens);
        (0, vitest_1.expect)(text).toContain('"Базовая оценка по стриму (СФЕРА)"');
        const parsed = (0, v2_work_formula_util_1.parseWorkFormulaText)(text);
        (0, vitest_1.expect)(parsed.error).toBeNull();
        (0, vitest_1.expect)(parsed.tokens).toEqual([
            { kind: "norm" },
            { kind: "operator", op: "*" },
            {
                kind: "param_coeff",
                paramCode: "Базовая оценка по стриму (СФЕРА)",
                paramName: "Базовая оценка по стриму (СФЕРА)",
            },
        ]);
        const laborParams = [
            {
                paramCode: "field_sphere",
                paramName: "Базовая оценка по стриму (СФЕРА)",
            },
        ];
        const normalized = (0, v2_work_formula_util_1.normalizeWorkFormulaLaborParamTokens)(parsed.tokens, laborParams);
        (0, vitest_1.expect)((0, v2_work_formula_util_1.validateWorkFormulaTokens)(normalized, {
            laborParams,
            allowInvalidParamRefs: true,
        })).toBeNull();
    });
    (0, vitest_1.it)("accepts labor param matched by display name, not only code", () => {
        const tokens = [
            { kind: "norm" },
            { kind: "operator", op: "*" },
            {
                kind: "param_coeff",
                paramCode: "field_sphere",
                paramName: "Базовая оценка по стриму (СФЕРА)",
            },
        ];
        (0, vitest_1.expect)((0, v2_work_formula_util_1.validateWorkFormulaTokens)(tokens, {
            laborParams: [
                {
                    paramCode: "field_sphere",
                    paramName: "Базовая оценка по стриму (СФЕРА)",
                },
            ],
            allowInvalidParamRefs: true,
        })).toBeNull();
    });
    (0, vitest_1.it)("reconciles schema field code with labor slug and drops invalid marker", () => {
        const tokens = [
            { kind: "norm" },
            { kind: "operator", op: "*" },
            {
                kind: "param_coeff",
                paramCode: "field_46LcNfWo",
                paramName: "field_46LcNfWo",
                invalid: true,
            },
        ];
        const laborParams = [
            {
                paramCode: "сложность_реализации",
                paramName: "Сложность реализации @ field_46LcNfWo|сложность_реализации",
            },
        ];
        const reconciled = (0, v2_work_formula_util_1.reconcileFormulaLaborParamTokens)(tokens, laborParams);
        (0, vitest_1.expect)((0, v2_work_formula_util_1.tokensToText)(reconciled)).toBe("N × коэф(сложность_реализации)");
        (0, vitest_1.expect)(reconciled[2]).not.toHaveProperty("invalid");
    });
    (0, vitest_1.it)("parses optional invalid marker after param ref", () => {
        const parsed = (0, v2_work_formula_util_1.parseWorkFormulaText)("N * коэф(field_x)?");
        (0, vitest_1.expect)(parsed.error).toBeNull();
        (0, vitest_1.expect)(parsed.tokens[2]).toEqual({
            kind: "param_coeff",
            paramCode: "field_x",
            paramName: "field_x",
            invalid: true,
        });
    });
    (0, vitest_1.it)("applyWorkRounding NONE keeps raw value", () => {
        (0, vitest_1.expect)((0, v2_work_formula_util_1.applyWorkRounding)(1.23, { mode: "NONE", step: null })).toBe(1.23);
    });
    (0, vitest_1.it)("applyWorkRounding clamps negative effort to zero", () => {
        (0, vitest_1.expect)((0, v2_work_formula_util_1.applyWorkRounding)(-5, { mode: "NONE", step: null })).toBe(0);
        (0, vitest_1.expect)((0, v2_work_formula_util_1.applyWorkRounding)(-5, { mode: "CEIL", step: 1 })).toBe(0);
        (0, vitest_1.expect)((0, v2_work_formula_util_1.applyWorkRounding)(20.55 - 30, { mode: "CEIL", step: 1 })).toBe(0);
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
    (0, vitest_1.it)("matches formula labor param by schema source key alias", () => {
        const laborParams = [
            {
                paramCode: "field_Hqtu1z5O",
                paramName: "Поле справочника @ field_Hqtu1z5O",
            },
        ];
        (0, vitest_1.expect)((0, v2_work_formula_util_1.isWorkFormulaLaborParamKnown)({
            kind: "param_anyof",
            paramCode: "field_Hqtu1z5O",
            paramName: "Поле справочника @ field_Hqtu1z5O",
        }, laborParams)).toBe(true);
    });
});
