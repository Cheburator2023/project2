"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const v2_questionnaire_uncertainty_coefficient_util_1 = require("./v2-questionnaire-uncertainty-coefficient.util");
const v2_overall_uncertainty_config_util_1 = require("./v2-overall-uncertainty-config.util");
const calculation_constants_1 = require("./calculation.constants");
(0, vitest_1.describe)("resolveV2QuestionnaireUncertaintyCoefficient", () => {
    (0, vitest_1.it)("returns 1 when uncertainty is not calculated", () => {
        (0, vitest_1.expect)((0, v2_questionnaire_uncertainty_coefficient_util_1.resolveV2QuestionnaireUncertaintyCoefficient)({})).toEqual({
            calculated: false,
            coefficient: 1,
        });
    });
    (0, vitest_1.it)("keeps legacy Σ + adjustment for group-name risk strings", () => {
        (0, vitest_1.expect)((0, v2_questionnaire_uncertainty_coefficient_util_1.resolveV2QuestionnaireUncertaintyCoefficient)({
            uncertaintyCalculation: {
                riskGroup: { sanctions: "Средний", techDebt: "Высокий" },
                uncertaintyAdjustment: 10,
            },
        })).toEqual({ calculated: true, coefficient: 1.22 });
    });
    (0, vitest_1.it)("uses configurator methodology for structured risks", () => {
        const config = (0, v2_overall_uncertainty_config_util_1.createDefaultOverallUncertaintyConfig)();
        const result = (0, v2_questionnaire_uncertainty_coefficient_util_1.resolveV2QuestionnaireUncertaintyCoefficient)({
            uncertaintyCalculation: {
                initiativeTimeline: config.severityLevels[0].timelineLabel,
                initiativeCost: config.severityLevels[0].costLabel,
                riskGroup: {
                    sanctions: {
                        probability: calculation_constants_1.PROBABILITY_VALUES[4],
                        goals: calculation_constants_1.INFLUENCE_VALUES[0],
                    },
                },
            },
        }, { config });
        // base sev 0 × very high prob → medium 0.05; count 1 → ×1; coef 1.05
        (0, vitest_1.expect)(result.calculated).toBe(true);
        (0, vitest_1.expect)(result.coefficient).toBe(1.05);
    });
    (0, vitest_1.it)("manual adjustment fully overrides auto for structured risks", () => {
        const config = (0, v2_overall_uncertainty_config_util_1.createDefaultOverallUncertaintyConfig)();
        (0, vitest_1.expect)((0, v2_questionnaire_uncertainty_coefficient_util_1.resolveV2QuestionnaireUncertaintyCoefficient)({
            uncertaintyCalculation: {
                initiativeTimeline: config.severityLevels[4].timelineLabel,
                initiativeCost: config.severityLevels[4].costLabel,
                uncertaintyAdjustment: 10,
                riskGroup: {
                    sanctions: {
                        probability: calculation_constants_1.PROBABILITY_VALUES[4],
                        goals: calculation_constants_1.INFLUENCE_VALUES[4],
                    },
                },
            },
        }, { config })).toEqual({ calculated: true, coefficient: 1.1 });
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
        (0, vitest_1.expect)(paramCoefficients.complexity).toBe(1.5);
        (0, vitest_1.expect)(paramCoefficients.overallUncertainty).toBeUndefined();
    });
});
(0, vitest_1.describe)("syncAtypicalWorkCoefficientsInFormData", () => {
    (0, vitest_1.it)("updates atypical rows", () => {
        const synced = (0, v2_questionnaire_uncertainty_coefficient_util_1.syncAtypicalWorkCoefficientsInFormData)({
            detailInfo: {
                atypical: [{ name: "A", coefficient: 1 }],
            },
        }, {
            detailInfo: {
                atypical: {
                    "ui:options": { archComponent: "atypicalWork" },
                },
            },
        }, 1.15);
        (0, vitest_1.expect)(synced.changed).toBe(true);
        (0, vitest_1.expect)(synced.formData.detailInfo
            .atypical[0]?.coefficient).toBe(1.15);
    });
});
