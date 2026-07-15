import { describe, expect, it } from "vitest";
import {
	resolveV2QuestionnaireUncertaintyCoefficient,
	syncAtypicalWorkCoefficientsInFormData,
} from "./v2-questionnaire-uncertainty-coefficient.util";

describe("resolveV2QuestionnaireUncertaintyCoefficient", () => {
	it("returns 1 when uncertainty is not calculated", () => {
		expect(
			resolveV2QuestionnaireUncertaintyCoefficient({}),
		).toEqual({ calculated: false, coefficient: 1 });
	});

	it("returns calculated coefficient from risk group and adjustment", () => {
		expect(
			resolveV2QuestionnaireUncertaintyCoefficient({
				uncertaintyCalculation: {
					riskGroup: { sanctions: "Средний", techDebt: "Высокий" },
					uncertaintyAdjustment: 10,
				},
			}),
		).toEqual({ calculated: true, coefficient: 1.22 });
	});

	it("treats adjustment-only input as calculated", () => {
		expect(
			resolveV2QuestionnaireUncertaintyCoefficient({
				uncertaintyCalculation: { uncertaintyAdjustment: 5 },
			}),
		).toEqual({ calculated: true, coefficient: 1.05 });
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
		const result = syncAtypicalWorkCoefficientsInFormData(
			{
				detailInfo: {
					atypicalTasks: [
						{ name: "A", coefficient: 1.5, estimateHoursPerDay: 2 },
						{ name: "B", coefficient: 1, estimateHoursPerDay: 3 },
					],
				},
			},
			uiSchema,
			1.12,
		);

		expect(result.changed).toBe(true);
		expect(result.updatedPaths).toEqual(["detailInfo.atypicalTasks"]);
		const rows = (
			result.formData.detailInfo as { atypicalTasks: { coefficient: number }[] }
		).atypicalTasks;
		expect(rows[0]?.coefficient).toBe(1.12);
		expect(rows[1]?.coefficient).toBe(1.12);
	});
});
