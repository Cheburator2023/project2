import type { UiSchema } from "@rjsf/utils";
import { describe, expect, it } from "vitest";
import {
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
});
