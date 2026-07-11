"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const v2_work_terms_formula_util_1 = require("./v2-work-terms-formula.util");
(0, vitest_1.describe)("v2-work-terms-formula", () => {
    (0, vitest_1.it)("requires exactly one base norm term", () => {
        (0, vitest_1.expect)((0, v2_work_terms_formula_util_1.validateTermsFormula)([])).toMatch(/базовый/i);
        (0, vitest_1.expect)((0, v2_work_terms_formula_util_1.validateTermsFormula)((0, v2_work_terms_formula_util_1.defaultTermsFormula)().terms)).toBeNull();
    });
    (0, vitest_1.it)("converts legacy token formula to terms", () => {
        const terms = (0, v2_work_terms_formula_util_1.tokensToTermsFormula)({
            tokens: [{ kind: "norm" }, { kind: "param_coeff", paramCode: "p1", paramName: "P1" }],
            text: "H × P1",
        });
        (0, vitest_1.expect)(terms.terms).toHaveLength(2);
        (0, vitest_1.expect)((0, v2_work_terms_formula_util_1.computeFormulaBadge)(terms.terms)).toBe("multiplier");
    });
    (0, vitest_1.it)("evaluates multiplier terms", () => {
        const terms = (0, v2_work_terms_formula_util_1.tokensToTermsFormula)({
            tokens: [{ kind: "norm" }, { kind: "param_coeff", paramCode: "p1" }],
            text: "H",
        });
        const value = (0, v2_work_terms_formula_util_1.evaluateTermsFormula)({
            terms: terms.terms,
            baseNorm: 10,
            resolveFactorCoeff: (code) => (code === "p1" ? 2 : 1),
        });
        (0, vitest_1.expect)(value).toBe(20);
    });
    (0, vitest_1.it)("formats simple coefficient as number and complex as resolved formula", () => {
        const simple = (0, v2_work_terms_formula_util_1.defaultTermsFormula)().terms;
        (0, vitest_1.expect)((0, v2_work_terms_formula_util_1.shouldShowTypicalWorkCoefficientBreakdown)(simple)).toBe(false);
        (0, vitest_1.expect)((0, v2_work_terms_formula_util_1.formatTypicalWorkCoefficientDisplay)({
            terms: simple,
            baseNorm: 5,
            paramCoefficients: {},
            coefficient: 1.25,
        })).toBe("1.25");
        const withParam = (0, v2_work_terms_formula_util_1.tokensToTermsFormula)({
            tokens: [
                { kind: "norm" },
                { kind: "param_coeff", paramCode: "p1", paramName: "Сложность" },
            ],
            text: "H × P1",
        }).terms;
        (0, vitest_1.expect)((0, v2_work_terms_formula_util_1.shouldShowTypicalWorkCoefficientBreakdown)(withParam)).toBe(true);
        (0, vitest_1.expect)((0, v2_work_terms_formula_util_1.formatTypicalWorkCoefficientDisplay)({
            terms: withParam,
            baseNorm: 5,
            paramCoefficients: { p1: 1.2 },
            coefficient: 1.2,
        })).toBe("5 × 1.2");
    });
    (0, vitest_1.it)("converts N + constant to additive term and round-trips tokens", () => {
        const source = {
            tokens: [
                { kind: "norm" },
                { kind: "operator", op: "+" },
                { kind: "number", value: 2.5 },
            ],
            text: "N + 2.5",
        };
        const terms = (0, v2_work_terms_formula_util_1.tokensToTermsFormula)(source);
        (0, vitest_1.expect)(terms.terms).toHaveLength(2);
        (0, vitest_1.expect)(terms.terms[1]?.kind).toBe("additive");
        (0, vitest_1.expect)(terms.terms[1]?.baseValue).toBe(2.5);
        const roundTrip = (0, v2_work_terms_formula_util_1.termsToTokenFormula)(terms);
        (0, vitest_1.expect)(roundTrip.tokens).toEqual(source.tokens);
        const synced = (0, v2_work_terms_formula_util_1.syncTermsFromTokenFormula)(source);
        (0, vitest_1.expect)(synced.terms[1]?.baseValue).toBe(2.5);
    });
    (0, vitest_1.it)("unwraps parenthesized (N + c) × param into additive and multiplier terms", () => {
        const terms = (0, v2_work_terms_formula_util_1.tokensToTermsFormula)({
            tokens: [
                { kind: "paren_open" },
                { kind: "norm" },
                { kind: "operator", op: "+" },
                { kind: "number", value: 5 },
                { kind: "paren_close" },
                { kind: "operator", op: "*" },
                { kind: "param_coeff", paramCode: "p1", paramName: "P1" },
            ],
            text: "(N + 5) × P1",
        });
        (0, vitest_1.expect)(terms.terms.length).toBeGreaterThan(1);
        (0, vitest_1.expect)(terms.terms.some((t) => t.kind === "additive")).toBe(true);
    });
});
