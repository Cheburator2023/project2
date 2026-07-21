import { describe, expect, it } from "vitest";
import {
	applyComputedOverallUncertaintyToTypicalWorkParamCoefficients,
	isTypicalWorkComputedUncertaintyParam,
	resolveV2QuestionnaireUncertaintyCoefficient,
	syncAtypicalWorkCoefficientsInFormData,
} from "./v2-questionnaire-uncertainty-coefficient.util";
import { createDefaultOverallUncertaintyConfig } from "./v2-overall-uncertainty-config.util";
import { INFLUENCE_VALUES, PROBABILITY_VALUES } from "./calculation.constants";

describe("resolveV2QuestionnaireUncertaintyCoefficient", () => {
	it("returns 1 when uncertainty is not calculated", () => {
		expect(resolveV2QuestionnaireUncertaintyCoefficient({})).toEqual({
			calculated: false,
			coefficient: 1,
		});
	});

	it("keeps legacy Σ + adjustment for group-name risk strings", () => {
		expect(
			resolveV2QuestionnaireUncertaintyCoefficient({
				uncertaintyCalculation: {
					riskGroup: { sanctions: "Средний", techDebt: "Высокий" },
					uncertaintyAdjustment: 10,
				},
			}),
		).toEqual({ calculated: true, coefficient: 1.22 });
	});

	it("uses configurator methodology for structured risks", () => {
		const config = createDefaultOverallUncertaintyConfig();
		const result = resolveV2QuestionnaireUncertaintyCoefficient(
			{
				uncertaintyCalculation: {
					initiativeTimeline: config.severityLevels[0]!.timelineLabel,
					initiativeCost: config.severityLevels[0]!.costLabel,
					riskGroup: {
						sanctions: {
							probability: PROBABILITY_VALUES[4],
							goals: INFLUENCE_VALUES[0],
						},
					},
				},
			},
			{ config },
		);
		// base sev 0 × very high prob → medium 0.05; count 1 → ×1; coef 1.05
		expect(result.calculated).toBe(true);
		expect(result.coefficient).toBe(1.05);
	});

	it("manual adjustment fully overrides auto for structured risks", () => {
		const config = createDefaultOverallUncertaintyConfig();
		expect(
			resolveV2QuestionnaireUncertaintyCoefficient(
				{
					uncertaintyCalculation: {
						initiativeTimeline: config.severityLevels[4]!.timelineLabel,
						initiativeCost: config.severityLevels[4]!.costLabel,
						uncertaintyAdjustment: 10,
						riskGroup: {
							sanctions: {
								probability: PROBABILITY_VALUES[4],
								goals: INFLUENCE_VALUES[4],
							},
						},
					},
				},
				{ config },
			),
		).toEqual({ calculated: true, coefficient: 1.1 });
	});

	it("treats adjustment-only input as calculated", () => {
		expect(
			resolveV2QuestionnaireUncertaintyCoefficient({
				uncertaintyCalculation: { uncertaintyAdjustment: 5 },
			}),
		).toEqual({ calculated: true, coefficient: 1.05 });
	});
});

describe("typical work overallUncertainty", () => {
	it("detects computed uncertainty param by code and label", () => {
		expect(isTypicalWorkComputedUncertaintyParam("overallUncertainty")).toBe(
			true,
		);
		expect(
			isTypicalWorkComputedUncertaintyParam("other", "Общая неопределённость"),
		).toBe(true);
		expect(isTypicalWorkComputedUncertaintyParam("complexity")).toBe(false);
	});

	it("injects calculated coefficient and overrides configurator value", () => {
		const paramCoefficients = { overallUncertainty: 2.5, complexity: 1.5 };
		applyComputedOverallUncertaintyToTypicalWorkParamCoefficients(
			{
				uncertaintyCalculation: {
					riskGroup: { sanctions: "Средний" },
					uncertaintyAdjustment: 10,
				},
			},
			paramCoefficients,
			{
				formulaParamCodes: ["overallUncertainty"],
			},
		);
		expect(paramCoefficients.overallUncertainty).toBe(1.15);
		expect(paramCoefficients.complexity).toBe(1.5);
	});

	it("defaults to 1 when uncertainty is not calculated", () => {
		const paramCoefficients: Record<string, number> = {};
		applyComputedOverallUncertaintyToTypicalWorkParamCoefficients(
			{},
			paramCoefficients,
			{ formulaParamCodes: ["overallUncertainty"] },
		);
		expect(paramCoefficients.overallUncertainty).toBe(1);
	});

	it("skips injection when formula does not use uncertainty", () => {
		const paramCoefficients: Record<string, number> = { complexity: 1.5 };
		applyComputedOverallUncertaintyToTypicalWorkParamCoefficients(
			{
				uncertaintyCalculation: {
					riskGroup: { sanctions: "Высокий" },
				},
			},
			paramCoefficients,
			{ formulaParamCodes: ["complexity"] },
		);
		expect(paramCoefficients.complexity).toBe(1.5);
		expect(paramCoefficients.overallUncertainty).toBeUndefined();
	});
});

describe("syncAtypicalWorkCoefficientsInFormData", () => {
	it("updates atypical rows", () => {
		const synced = syncAtypicalWorkCoefficientsInFormData(
			{
				detailInfo: {
					atypical: [{ name: "A", coefficient: 1 }],
				},
			},
			{
				detailInfo: {
					atypical: {
						"ui:options": { archComponent: "atypicalWork" },
					},
				},
			},
			1.15,
		);
		expect(synced.changed).toBe(true);
		expect(
			(
				(synced.formData.detailInfo as Record<string, unknown>)
					.atypical as Array<Record<string, unknown>>
			)[0]?.coefficient,
		).toBe(1.15);
	});
});
