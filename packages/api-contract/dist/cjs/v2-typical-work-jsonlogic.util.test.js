"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const v2_typical_work_jsonlogic_util_1 = require("./v2-typical-work-jsonlogic.util");
const v2_typical_work_types_1 = require("./v2-typical-work.types");
const v2_work_terms_formula_util_1 = require("./v2-work-terms-formula.util");
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
    (0, vitest_1.it)("compiles arch-count-only trigger without false param AND", () => {
        const jl = (0, v2_typical_work_jsonlogic_util_1.compileTypicalWorkTriggerRulesToJsonLogic)([], {
            kind: "modelService",
            steps: [{ count: 1, coefficient: 1 }],
            combinator: "and",
        });
        (0, vitest_1.expect)(jl).toEqual({
            archCountTrigger: ["modelService", [{ count: 1, coefficient: 1 }]],
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
    (0, vitest_1.it)("computeTypicalWorkFormulaTotal prefers token formula over simplified terms", () => {
        const parsed = (0, v2_work_formula_util_1.parseWorkFormulaText)("(N + 5) × коэф(p1)");
        (0, vitest_1.expect)(parsed.error).toBeNull();
        const calculationLogic = (0, v2_typical_work_jsonlogic_util_1.compileStoredTypicalWorkResultLogic)({ tokens: parsed.tokens, text: "(N + 5) × коэф(p1)" }, (0, v2_typical_work_types_1.defaultWorkRounding)());
        const brokenTerms = {
            version: 2,
            terms: [(0, v2_work_terms_formula_util_1.defaultBaseNormTerm)()],
            text: "H",
        };
        const total = (0, v2_typical_work_jsonlogic_util_1.computeTypicalWorkFormulaTotal)({
            calculationLogic,
            formula: brokenTerms,
            formulaText: "(N + 5) × коэф(p1)",
            terms: brokenTerms,
            rounding: (0, v2_typical_work_types_1.defaultWorkRounding)(),
            norm: 20,
            paramCoefficients: { p1: 1 },
            resolveFactorCoeff: (code) => (code === "p1" ? 1 : 1),
        });
        (0, vitest_1.expect)(total).toBe(25);
    });
    (0, vitest_1.it)("compileCalculationLogicFromVersionConfig uses formulaText when formula is terms v2", () => {
        const brokenTerms = {
            version: 2,
            terms: [(0, v2_work_terms_formula_util_1.defaultBaseNormTerm)()],
            text: "H",
        };
        const compiled = (0, v2_typical_work_jsonlogic_util_1.compileCalculationLogicFromVersionConfig)({
            formula: brokenTerms,
            formulaText: "(N + 5) × коэф(p1)",
            roundingMode: "NONE",
            roundingStep: null,
        });
        (0, vitest_1.expect)(compiled?.version).toBe(1);
        const result = (0, v2_typical_work_jsonlogic_util_1.evaluateTypicalWorkResultJsonLogic)(compiled, { norm: 20, paramCoefficients: { p1: 1 } }, "(N + 5) × коэф(p1)");
        (0, vitest_1.expect)(result.value).toBe(25);
    });
    (0, vitest_1.it)("computeTypicalWorkFormulaTotal ignores stale norm-only calculationLogic", () => {
        const staleLogic = (0, v2_typical_work_jsonlogic_util_1.compileStoredTypicalWorkResultLogic)((0, v2_typical_work_types_1.defaultWorkFormula)(), (0, v2_typical_work_types_1.defaultWorkRounding)());
        const brokenTerms = {
            version: 2,
            terms: [(0, v2_work_terms_formula_util_1.defaultBaseNormTerm)()],
            text: "H",
        };
        const total = (0, v2_typical_work_jsonlogic_util_1.computeTypicalWorkFormulaTotal)({
            calculationLogic: staleLogic,
            formula: brokenTerms,
            formulaText: "(N + 5) × коэф(p1)",
            terms: brokenTerms,
            rounding: (0, v2_typical_work_types_1.defaultWorkRounding)(),
            norm: 20,
            paramCoefficients: { p1: 1 },
            resolveFactorCoeff: (code) => (code === "p1" ? 1 : 1),
        });
        (0, vitest_1.expect)(total).toBe(25);
    });
    (0, vitest_1.it)("computeTypicalWorkFormulaTotal evaluates ((N + c) × param) + constant", () => {
        const formulaText = "((N + 5) × коэф(p1)) + 11";
        const parsed = (0, v2_work_formula_util_1.parseWorkFormulaText)(formulaText);
        (0, vitest_1.expect)(parsed.error).toBeNull();
        const terms = (0, v2_work_terms_formula_util_1.tokensToTermsFormula)({
            tokens: parsed.tokens,
            text: formulaText,
        });
        const total = (0, v2_typical_work_jsonlogic_util_1.computeTypicalWorkFormulaTotal)({
            calculationLogic: null,
            formula: terms,
            formulaText,
            terms,
            rounding: (0, v2_typical_work_types_1.defaultWorkRounding)(),
            norm: 20,
            paramCoefficients: { p1: 1 },
            resolveFactorCoeff: (code) => (code === "p1" ? 1 : 1),
        });
        (0, vitest_1.expect)(total).toBe(36);
    });
    (0, vitest_1.it)("buildTypicalWorkFormulaBreakdown lists real coefficient values", () => {
        const formulaText = "N × коэф(p1)";
        const parsed = (0, v2_work_formula_util_1.parseWorkFormulaText)(formulaText);
        (0, vitest_1.expect)(parsed.error).toBeNull();
        const terms = (0, v2_work_terms_formula_util_1.tokensToTermsFormula)({
            tokens: parsed.tokens,
            text: formulaText,
        });
        const breakdown = (0, v2_typical_work_jsonlogic_util_1.buildTypicalWorkFormulaBreakdown)({
            formula: terms,
            formulaText,
            terms,
            rounding: (0, v2_typical_work_types_1.defaultWorkRounding)(),
            norm: 40,
            paramCoefficients: { p1: 1.5 },
            paramNames: {
                p1: "Сложность реализации @ field_46LcNfWo|сложность_реализации",
            },
            resolveFactorCoeff: (code) => (code === "p1" ? 1.5 : 1),
            coefficient: 1.5,
            total: 60,
        });
        (0, vitest_1.expect)(breakdown.symbolic).toBe("N × Сложность реализации");
        (0, vitest_1.expect)(breakdown.expanded).toBe("40 × 1.5 = 60");
        (0, vitest_1.expect)(breakdown.factors).toEqual([
            { paramCode: "p1", paramName: "Сложность реализации", value: 1.5 },
        ]);
        (0, vitest_1.expect)(breakdown.total).toBe(60);
    });
    (0, vitest_1.it)("buildTypicalWorkFormulaBreakdown expands multi-arch max coefficients", () => {
        const formulaText = "N × коэф(readyPromReports)";
        const parsed = (0, v2_work_formula_util_1.parseWorkFormulaText)(formulaText);
        (0, vitest_1.expect)(parsed.error).toBeNull();
        const terms = (0, v2_work_terms_formula_util_1.tokensToTermsFormula)({
            tokens: parsed.tokens,
            text: formulaText,
        });
        const breakdown = (0, v2_typical_work_jsonlogic_util_1.buildTypicalWorkFormulaBreakdown)({
            formula: terms,
            formulaText,
            terms,
            rounding: (0, v2_typical_work_types_1.defaultWorkRounding)(),
            norm: 33,
            paramCoefficients: { readyPromReports: 1 },
            paramNames: {
                readyPromReports: "Наличие готовых промышленных витрин",
            },
            resolveFactorCoeff: (code) => (code === "readyPromReports" ? 1 : 1),
            coefficient: 1.5,
            total: 49.5,
            instanceBreakdown: [
                {
                    sourceLabel: "вава",
                    index: 0,
                    expanded: "33 × 0.5 = 16.5",
                    total: 16.5,
                },
                {
                    sourceLabel: "выавыавы",
                    index: 1,
                    expanded: "33 × 1 = 33",
                    total: 33,
                },
            ],
            expandedOverride: "16.5 (вава) + 33 (выавыавы) = 49.5",
        });
        (0, vitest_1.expect)(breakdown.expanded).toBe("16.5 (вава) + 33 (выавыавы) = 49.5");
        (0, vitest_1.expect)(breakdown.instanceBreakdown).toHaveLength(2);
        (0, vitest_1.expect)(breakdown.total).toBe(49.5);
    });
});
