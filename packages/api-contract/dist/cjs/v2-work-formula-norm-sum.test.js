"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const v2_typical_work_jsonlogic_util_1 = require("./v2-typical-work-jsonlogic.util");
const v2_typical_work_types_1 = require("./v2-typical-work.types");
const v2_work_formula_util_1 = require("./v2-work-formula.util");
const v2_work_terms_formula_util_1 = require("./v2-work-terms-formula.util");
const formulaText = "N * коэф(field_UEzs5Q87) + N * архкоэф(Система-источник; 1=1; 2=1; 3=1; 4=1; 5=1; 6=1,2; 7=1,4; 8=1,6; 9=1,8; 10=2,0; 11=2,2; 12=2,4; 13=2,6; 14=2,8; 15=3,0; 16=3,2; 17=3,4; 18=3,6; 19=3,8; 20=4,0)";
(0, vitest_1.describe)("Этап 211 formula N*P + N*arch", () => {
    const formData = {
        detailInfo: {
            sourceSystems: [{ name: "A", controlType: "x" }],
        },
    };
    (0, vitest_1.it)("token engine evaluates to 44 when both coefficients are 1", () => {
        const parsed = (0, v2_work_formula_util_1.parseWorkFormulaText)(formulaText);
        (0, vitest_1.expect)(parsed.error).toBeNull();
        const evaled = (0, v2_work_formula_util_1.evaluateWorkFormula)({ tokens: parsed.tokens, text: formulaText }, {
            norm: 22,
            paramCoefficients: { field_UEzs5Q87: 1 },
            formData,
        });
        (0, vitest_1.expect)(evaled.value).toBe(44);
    });
    (0, vitest_1.it)("terms model keeps N×arch (not +1) and evaluates to 44", () => {
        const parsed = (0, v2_work_formula_util_1.parseWorkFormulaText)(formulaText);
        const terms = (0, v2_work_terms_formula_util_1.tokensToTermsFormula)({
            tokens: parsed.tokens,
            text: formulaText,
        });
        const additive = terms.terms.find((t) => t.kind === "additive");
        (0, vitest_1.expect)(additive?.scaleByNorm).toBe(true);
        (0, vitest_1.expect)(additive?.coeffTokens?.some((t) => t.kind === "arch_count_coeff")).toBe(true);
        const termsVal = (0, v2_work_terms_formula_util_1.evaluateTermsFormula)({
            terms: terms.terms,
            baseNorm: 22,
            resolveFactorCoeff: () => 1,
            formData,
        });
        (0, vitest_1.expect)(termsVal).toBe(44);
    });
    (0, vitest_1.it)("computeTypicalWorkFormulaTotal fills missing paramCoefficients via resolver", () => {
        const parsed = (0, v2_work_formula_util_1.parseWorkFormulaText)(formulaText);
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
            norm: 22,
            paramCoefficients: {},
            formData,
            resolveFactorCoeff: () => 1,
        });
        (0, vitest_1.expect)(total).toBe(44);
        const preview = (0, v2_typical_work_jsonlogic_util_1.previewTypicalWorkCalculation)(null, {
            formula: { tokens: parsed.tokens, text: formulaText },
            rounding: (0, v2_typical_work_types_1.defaultWorkRounding)(),
        }, {
            norm: 22,
            paramCoefficients: { field_UEzs5Q87: 1 },
            formData,
        });
        (0, vitest_1.expect)(preview.value).toBe(44);
        (0, vitest_1.expect)(preview.expanded).toContain("22");
    });
});
