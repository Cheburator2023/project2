import { describe, expect, it } from "vitest";
import { applyWorkRounding, evaluateWorkFormula, formatWorkFormulaGeneralSummary, isParamUsedInFormula, isWorkFormulaLaborParamKnown, markFormulaParamInvalid, normalizeWorkFormulaLaborParamTokens, parseWorkFormulaText, previewWorkFormula, reconcileFormulaLaborParamTokens, tokensToText, validateWorkFormulaTokens, } from "./v2-work-formula.util";
import { defaultWorkFormula, defaultWorkRounding } from "./v2-typical-work.types";
describe("v2-work-formula.util", () => {
    it("parses H × P[param]", () => {
        const parsed = parseWorkFormulaText("H × P[Сложность]");
        expect(parsed.error).toBeNull();
        expect(parsed.tokens).toHaveLength(3);
    });
    it("parses legacy N × P[param]", () => {
        const parsed = parseWorkFormulaText("N × P[Сложность]");
        expect(parsed.error).toBeNull();
        expect(parsed.tokens).toHaveLength(3);
    });
    it("parses norm word and coeff with spaces in param name", () => {
        const parsed = parseWorkFormulaText("норма × коэф(Сложность реализации)");
        expect(parsed.error).toBeNull();
        expect(parsed.tokens).toEqual([
            { kind: "norm" },
            { kind: "operator", op: "*" },
            {
                kind: "param_coeff",
                paramCode: "Сложность реализации",
                paramName: "Сложность реализации",
            },
        ]);
    });
    it("formats general summary with Кэф-П indices", () => {
        const tokens = parseWorkFormulaText("N * P[a]").tokens;
        expect(formatWorkFormulaGeneralSummary(tokens, ["a"])).toBe("N * Кэф-П1");
    });
    it("evaluates norm only", () => {
        const formula = defaultWorkFormula();
        const result = evaluateWorkFormula(formula, { norm: 2, paramCoefficients: {} });
        expect(result.value).toBe(2);
        expect(result.error).toBeNull();
    });
    it("evaluates N × coeff with rounding up", () => {
        const parsed = parseWorkFormulaText("N × P[x]");
        const result = previewWorkFormula({ tokens: parsed.tokens, text: "N × P[x]" }, defaultWorkRounding(), { norm: 1.25, paramCoefficients: { x: 0.5 } });
        expect(result.value).toBeCloseTo(0.7, 5);
        expect(result.error).toBeNull();
    });
    it("rejects unbalanced parens", () => {
        const parsed = parseWorkFormulaText("( N × 2");
        expect(parsed.error).toMatch(/скобк/i);
    });
    it("parses subtraction with unicode minus from tokensToText", () => {
        const tokens = [
            { kind: "norm" },
            { kind: "operator", op: "-" },
            { kind: "number", value: 1 },
        ];
        const text = tokensToText(tokens);
        expect(text).toBe("N − 1");
        const parsed = parseWorkFormulaText(text);
        expect(parsed.error).toBeNull();
        expect(parsed.tokens).toEqual(tokens);
    });
    it("round-trips param names with parentheses in коэф()", () => {
        const tokens = [
            { kind: "norm" },
            { kind: "operator", op: "*" },
            {
                kind: "param_coeff",
                paramCode: "field_sphere",
                paramName: "Базовая оценка по стриму (СФЕРА)",
            },
        ];
        const text = tokensToText(tokens);
        expect(text).toContain('"Базовая оценка по стриму (СФЕРА)"');
        const parsed = parseWorkFormulaText(text);
        expect(parsed.error).toBeNull();
        expect(parsed.tokens).toEqual([
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
        const normalized = normalizeWorkFormulaLaborParamTokens(parsed.tokens, laborParams);
        expect(validateWorkFormulaTokens(normalized, {
            laborParams,
            allowInvalidParamRefs: true,
        })).toBeNull();
    });
    it("accepts labor param matched by display name, not only code", () => {
        const tokens = [
            { kind: "norm" },
            { kind: "operator", op: "*" },
            {
                kind: "param_coeff",
                paramCode: "field_sphere",
                paramName: "Базовая оценка по стриму (СФЕРА)",
            },
        ];
        expect(validateWorkFormulaTokens(tokens, {
            laborParams: [
                {
                    paramCode: "field_sphere",
                    paramName: "Базовая оценка по стриму (СФЕРА)",
                },
            ],
            allowInvalidParamRefs: true,
        })).toBeNull();
    });
    it("reconciles schema field code with labor slug and drops invalid marker", () => {
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
        const reconciled = reconcileFormulaLaborParamTokens(tokens, laborParams);
        expect(tokensToText(reconciled)).toBe("N × коэф(сложность_реализации)");
        expect(reconciled[2]).not.toHaveProperty("invalid");
    });
    it("parses optional invalid marker after param ref", () => {
        const parsed = parseWorkFormulaText("N * коэф(field_x)?");
        expect(parsed.error).toBeNull();
        expect(parsed.tokens[2]).toEqual({
            kind: "param_coeff",
            paramCode: "field_x",
            paramName: "field_x",
            invalid: true,
        });
    });
    it("applyWorkRounding NONE keeps raw value", () => {
        expect(applyWorkRounding(1.23, { mode: "NONE", step: null })).toBe(1.23);
    });
    it("applyWorkRounding clamps negative effort to zero", () => {
        expect(applyWorkRounding(-5, { mode: "NONE", step: null })).toBe(0);
        expect(applyWorkRounding(-5, { mode: "CEIL", step: 1 })).toBe(0);
        expect(applyWorkRounding(20.55 - 30, { mode: "CEIL", step: 1 })).toBe(0);
    });
    it("validateWorkFormulaTokens catches double operator", () => {
        const err = validateWorkFormulaTokens([
            { kind: "norm" },
            { kind: "operator", op: "+" },
            { kind: "operator", op: "+" },
            { kind: "number", value: 1 },
        ]);
        expect(err).toMatch(/оператор/i);
    });
    it("marks removed labor param invalid and blocks preview", () => {
        const tokens = markFormulaParamInvalid([
            { kind: "norm" },
            { kind: "operator", op: "*" },
            { kind: "param_coeff", paramCode: "x", paramName: "Сложность" },
        ], "x");
        expect(isParamUsedInFormula(tokens, "x")).toBe(false);
        expect(validateWorkFormulaTokens(tokens, {
            allowedParamCodes: new Set(),
            allowInvalidParamRefs: true,
        })).toBeNull();
        const result = evaluateWorkFormula({ tokens, text: "N × P[Сложность]?" }, { norm: 1, paramCoefficients: {} });
        expect(result.error).toMatch(/удалён/i);
    });
    it("matches formula labor param by schema source key alias", () => {
        const laborParams = [
            {
                paramCode: "field_Hqtu1z5O",
                paramName: "Поле справочника @ field_Hqtu1z5O",
            },
        ];
        expect(isWorkFormulaLaborParamKnown({
            kind: "param_anyof",
            paramCode: "field_Hqtu1z5O",
            paramName: "Поле справочника @ field_Hqtu1z5O",
        }, laborParams)).toBe(true);
    });
});
