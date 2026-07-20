import type { UiSchema } from "@rjsf/utils";
import { describe, expect, it } from "vitest";
import {
	buildQuestionnaireCopyCalcName,
	buildQuestionnaireVersionCalcName,
	hideQuestionnaireCalcNameInUiSchema,
	isQuestionnaireCalcNameValid,
	stripQuestionnaireCalcNameFromFormData,
} from "./anketaQuestionnaireMeta.util";

describe("anketaQuestionnaireMeta.util", () => {
	it("strips calcName from generalInfo", () => {
		expect(
			stripQuestionnaireCalcNameFromFormData({
				generalInfo: {
					calcName: "Тест",
					businessCustomer: "Банк",
				},
			}),
		).toEqual({
			generalInfo: {
				businessCustomer: "Банк",
			},
		});
	});

	it("hides calcName branch in uiSchema", () => {
		const ui: UiSchema = {
			generalInfo: {
				calcName: { "ui:widget": "text" },
				businessCustomer: { "ui:widget": "select" },
			},
		};

		const next = hideQuestionnaireCalcNameInUiSchema(ui);
		expect(next.generalInfo).toMatchObject({
			calcName: {
				"ui:widget": "hidden",
				"ui:options": { hidden: true },
			},
		});
	});

	it("validates calcName length", () => {
		expect(isQuestionnaireCalcNameValid("")).toBe(false);
		expect(isQuestionnaireCalcNameValid("  Аналитика  ")).toBe(true);
		expect(isQuestionnaireCalcNameValid("x".repeat(256))).toBe(false);
	});

	it("builds copy calcName with suffix", () => {
		expect(buildQuestionnaireCopyCalcName("Проект А")).toBe("Проект А (копия)");
		expect(buildQuestionnaireCopyCalcName("  x  ")).toBe("x (копия)");
		expect(buildQuestionnaireCopyCalcName("x".repeat(260)).length).toBeLessThanOrEqual(
			255,
		);
	});

	it("builds version calcName with suffix", () => {
		expect(buildQuestionnaireVersionCalcName("Проект А", 3)).toBe(
			"Проект А (версия 3)",
		);
		expect(buildQuestionnaireVersionCalcName("x".repeat(260), 12).length).toBeLessThanOrEqual(
			255,
		);
	});
});
