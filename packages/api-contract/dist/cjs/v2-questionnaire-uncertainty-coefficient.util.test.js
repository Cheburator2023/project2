"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const v2_questionnaire_uncertainty_coefficient_util_1 = require("./v2-questionnaire-uncertainty-coefficient.util");
(0, vitest_1.describe)("resolveV2QuestionnaireUncertaintyCoefficient", () => {
    (0, vitest_1.it)("returns 1 when uncertainty is not calculated", () => {
        (0, vitest_1.expect)((0, v2_questionnaire_uncertainty_coefficient_util_1.resolveV2QuestionnaireUncertaintyCoefficient)({})).toEqual({ calculated: false, coefficient: 1 });
    });
    (0, vitest_1.it)("returns calculated coefficient from risk group and adjustment", () => {
        (0, vitest_1.expect)((0, v2_questionnaire_uncertainty_coefficient_util_1.resolveV2QuestionnaireUncertaintyCoefficient)({
            uncertaintyCalculation: {
                riskGroup: { sanctions: "Средний", techDebt: "Высокий" },
                uncertaintyAdjustment: 10,
            },
        })).toEqual({ calculated: true, coefficient: 1.22 });
    });
    (0, vitest_1.it)("treats adjustment-only input as calculated", () => {
        (0, vitest_1.expect)((0, v2_questionnaire_uncertainty_coefficient_util_1.resolveV2QuestionnaireUncertaintyCoefficient)({
            uncertaintyCalculation: { uncertaintyAdjustment: 5 },
        })).toEqual({ calculated: true, coefficient: 1.05 });
    });
});
(0, vitest_1.describe)("typical work overallUncertainty", () => {
    (0, vitest_1.it)("detects computed uncertainty param by code and label", () => {
        (0, vitest_1.expect)((0, v2_questionnaire_uncertainty_coefficient_util_1.isTypicalWorkComputedUncertaintyParam)("overallUncertainty")).toBe(true);
        (0, vitest_1.expect)((0, v2_questionnaire_uncertainty_coefficient_util_1.isTypicalWorkComputedUncertaintyParam)("other", "Общая неопределённость")).toBe(true);
        (0, vitest_1.expect)((0, v2_questionnaire_uncertainty_coefficient_util_1.isTypicalWorkComputedUncertaintyParam)("complexity")).toBe(false);
    });
    (0, vitest_1.it)("injects calculated coefficient and overrides configurator value", () => {
        const paramCoefficients = { overallUncertainty: 2.5, complexity: 1.5 };
        (0, v2_questionnaire_uncertainty_coefficient_util_1.applyComputedOverallUncertaintyToTypicalWorkParamCoefficients)({
            uncertaintyCalculation: {
                riskGroup: { sanctions: "Средний" },
                uncertaintyAdjustment: 10,
            },
        }, paramCoefficients, {
            formulaParamCodes: ["overallUncertainty"],
        });
        (0, vitest_1.expect)(paramCoefficients.overallUncertainty).toBe(1.15);
        (0, vitest_1.expect)(paramCoefficients.complexity).toBe(1.5);
    });
    (0, vitest_1.it)("defaults to 1 when uncertainty is not calculated", () => {
        const paramCoefficients = {};
        (0, v2_questionnaire_uncertainty_coefficient_util_1.applyComputedOverallUncertaintyToTypicalWorkParamCoefficients)({}, paramCoefficients, { formulaParamCodes: ["overallUncertainty"] });
        (0, vitest_1.expect)(paramCoefficients.overallUncertainty).toBe(1);
    });
    (0, vitest_1.it)("skips injection when formula does not use uncertainty", () => {
        const paramCoefficients = { complexity: 1.5 };
        (0, v2_questionnaire_uncertainty_coefficient_util_1.applyComputedOverallUncertaintyToTypicalWorkParamCoefficients)({
            uncertaintyCalculation: {
                riskGroup: { sanctions: "Высокий" },
            },
        }, paramCoefficients, { formulaParamCodes: ["complexity"] });
        (0, vitest_1.expect)(paramCoefficients.overallUncertainty).toBeUndefined();
    });
});
(0, vitest_1.describe)("syncAtypicalWorkCoefficientsInFormData", () => {
    const uiSchema = {
        detailInfo: {
            atypicalTasks: {
                "ui:options": { archComponent: "atypicalWork" },
            },
        },
    };
    (0, vitest_1.it)("updates coefficient on all atypical rows", () => {
        const result = (0, v2_questionnaire_uncertainty_coefficient_util_1.syncAtypicalWorkCoefficientsInFormData)({
            detailInfo: {
                atypicalTasks: [
                    { name: "A", coefficient: 1.5, estimateHoursPerDay: 2 },
                    { name: "B", coefficient: 1, estimateHoursPerDay: 3 },
                ],
            },
        }, uiSchema, 1.12);
        (0, vitest_1.expect)(result.changed).toBe(true);
        (0, vitest_1.expect)(result.updatedPaths).toEqual(["detailInfo.atypicalTasks"]);
        const rows = result.formData.detailInfo.atypicalTasks;
        (0, vitest_1.expect)(rows[0]?.coefficient).toBe(1.12);
        (0, vitest_1.expect)(rows[1]?.coefficient).toBe(1.12);
    });
});
