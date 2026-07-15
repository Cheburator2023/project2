import { describe, expect, it } from "vitest";
import {
	stripQuestionnaireCalcNameFromJsonSchema,
	stripQuestionnaireCalcNameFromTemplateSnapshot,
	stripQuestionnaireCalcNameFromUiSchema,
} from "./v2-questionnaire-calc-name.util";

describe("stripQuestionnaireCalcNameFromTemplateSnapshot", () => {
	it("removes calcName from jsonSchema and uiSchema", () => {
		const snapshot = stripQuestionnaireCalcNameFromTemplateSnapshot({
			jsonSchema: {
				type: "object",
				properties: {
					generalInfo: {
						type: "object",
						required: ["calcName", "businessCustomer"],
						properties: {
							calcName: { type: "string", title: "Название анкеты" },
							businessCustomer: { type: "string", title: "Заказчик" },
						},
					},
				},
			},
			uiSchema: {
				generalInfo: {
					"ui:order": ["calcName", "businessCustomer"],
					calcName: { "ui:widget": "text" },
					businessCustomer: { "ui:widget": "text" },
				},
			},
		});

		const generalInfoProps = (
			snapshot.jsonSchema.properties?.generalInfo as {
				properties?: Record<string, unknown>;
				required?: string[];
			}
		).properties;
		expect(generalInfoProps?.calcName).toBeUndefined();
		expect(generalInfoProps?.businessCustomer).toBeDefined();
		expect(
			(snapshot.jsonSchema.properties?.generalInfo as { required?: string[] })
				.required,
		).toEqual(["businessCustomer"]);

		const uiGeneralInfo = snapshot.uiSchema.generalInfo as Record<
			string,
			unknown
		>;
		expect(uiGeneralInfo.calcName).toBeUndefined();
		expect(uiGeneralInfo["ui:order"]).toEqual(["businessCustomer"]);
	});

	it("is idempotent", () => {
		const once = stripQuestionnaireCalcNameFromJsonSchema({
			type: "object",
			properties: {
				generalInfo: {
					type: "object",
					properties: {
						calcName: { type: "string" },
					},
				},
			},
		});
		const twice = stripQuestionnaireCalcNameFromJsonSchema(once);
		expect(twice).toEqual(once);
	});

	it("leaves schema unchanged when calcName is absent", () => {
		const jsonSchema = {
			type: "object" as const,
			properties: {
				generalInfo: {
					type: "object" as const,
					properties: {
						businessCustomer: { type: "string" as const },
					},
				},
			},
		};
		const uiSchema = {
			generalInfo: {
				businessCustomer: { "ui:widget": "text" as const },
			},
		};

		expect(stripQuestionnaireCalcNameFromJsonSchema(jsonSchema)).toEqual(
			jsonSchema,
		);
		expect(stripQuestionnaireCalcNameFromUiSchema(uiSchema)).toEqual(uiSchema);
	});
});
