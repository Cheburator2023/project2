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
});
