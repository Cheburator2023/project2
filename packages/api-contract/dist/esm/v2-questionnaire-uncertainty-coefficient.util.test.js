import { describe, expect, it } from "vitest";
import { applyComputedOverallUncertaintyToTypicalWorkParamCoefficients, isTypicalWorkComputedUncertaintyParam, resolveV2QuestionnaireUncertaintyCoefficient, syncAtypicalWorkCoefficientsInFormData, } from "./v2-questionnaire-uncertainty-coefficient.util";
describe("resolveV2QuestionnaireUncertaintyCoefficient", () => {
    it("returns 1 when uncertainty is not calculated", () => {
        expect(resolveV2QuestionnaireUncertaintyCoefficient({})).toEqual({ calculated: false, coefficient: 1 });
    });
    it("returns calculated coefficient from risk group and adjustment", () => {
        expect(resolveV2QuestionnaireUncertaintyCoefficient({
            uncertaintyCalculation: {
                riskGroup: { sanctions: "Средний", techDebt: "Высокий" },
                uncertaintyAdjustment: 10,
            },
        })).toEqual({ calculated: true, coefficient: 1.22 });
    });
    it("treats adjustment-only input as calculated", () => {
        expect(resolveV2QuestionnaireUncertaintyCoefficient({
            uncertaintyCalculation: { uncertaintyAdjustment: 5 },
        })).toEqual({ calculated: true, coefficient: 1.05 });
    });
});
describe("typical work overallUncertainty", () => {
    it("detects computed uncertainty param by code and label", () => {
        expect(isTypicalWorkComputedUncertaintyParam("overallUncertainty")).toBe(true);
        expect(isTypicalWorkComputedUncertaintyParam("other", "Общая неопределённость")).toBe(true);
        expect(isTypicalWorkComputedUncertaintyParam("complexity")).toBe(false);
    });
    it("injects calculated coefficient and overrides configurator value", () => {
        const paramCoefficients = { overallUncertainty: 2.5, complexity: 1.5 };
        applyComputedOverallUncertaintyToTypicalWorkParamCoefficients({
            uncertaintyCalculation: {
                riskGroup: { sanctions: "Средний" },
                uncertaintyAdjustment: 10,
            },
        }, paramCoefficients, {
            formulaParamCodes: ["overallUncertainty"],
        });
        expect(paramCoefficients.overallUncertainty).toBe(1.15);
        expect(paramCoefficients.complexity).toBe(1.5);
    });
    it("defaults to 1 when uncertainty is not calculated", () => {
        const paramCoefficients = {};
        applyComputedOverallUncertaintyToTypicalWorkParamCoefficients({}, paramCoefficients, { formulaParamCodes: ["overallUncertainty"] });
        expect(paramCoefficients.overallUncertainty).toBe(1);
    });
    it("skips injection when formula does not use uncertainty", () => {
        const paramCoefficients = { complexity: 1.5 };
        applyComputedOverallUncertaintyToTypicalWorkParamCoefficients({
            uncertaintyCalculation: {
                riskGroup: { sanctions: "Высокий" },
            },
        }, paramCoefficients, { formulaParamCodes: ["complexity"] });
        expect(paramCoefficients.overallUncertainty).toBeUndefined();
    });
});
describe("syncAtypicalWorkCoefficientsInFormData", () => {
    const uiSchema = {
        detailInfo: {
            atypicalTasks: {
                "ui:options": { archComponent: "atypicalWork" },
            },
        },
    };
    it("updates coefficient on all atypical rows", () => {
        const result = syncAtypicalWorkCoefficientsInFormData({
            detailInfo: {
                atypicalTasks: [
                    { name: "A", coefficient: 1.5, estimateHoursPerDay: 2 },
                    { name: "B", coefficient: 1, estimateHoursPerDay: 3 },
                ],
            },
        }, uiSchema, 1.12);
        expect(result.changed).toBe(true);
        expect(result.updatedPaths).toEqual(["detailInfo.atypicalTasks"]);
        const rows = result.formData.detailInfo.atypicalTasks;
        expect(rows[0]?.coefficient).toBe(1.12);
        expect(rows[1]?.coefficient).toBe(1.12);
    });
});
