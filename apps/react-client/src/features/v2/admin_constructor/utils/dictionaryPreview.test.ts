import type { RJSFSchema, UiSchema } from "@rjsf/utils";
import { describe, expect, it } from "vitest";
import {
	collectDictionaryFieldBindings,
	mergeDictionaryEnumsIntoPreviewSchema,
	mergeDictionaryOptionsIntoPreviewUiSchema,
	parseDictionaryJsonToEnumPair,
} from "./dictionaryPreview";

const ENUM_MAP = {
	"v2.test.dict": {
		enums: ["a", "b"],
		enumNames: ["Alpha", "Beta"],
	},
};

describe("dictionary preview merge", () => {
	it("merges enum into string field with dictionary binding", () => {
		const schema: RJSFSchema = {
			type: "object",
			properties: {
				field1: { type: "string", title: "Field" },
			},
		};
		const ui: UiSchema = {
			field1: {
				"ui:widget": "select",
				"ui:options": { dictionaryCode: "v2.test.dict" },
			},
		};

		const merged = mergeDictionaryEnumsIntoPreviewSchema(schema, ui, ENUM_MAP);
		expect(merged.properties?.field1).toMatchObject({
			type: "string",
			enum: ["a", "b"],
			enumNames: ["Alpha", "Beta"],
		});
	});

	it("merges enum into array items for multi dictionary", () => {
		const schema: RJSFSchema = {
			type: "object",
			properties: {
				field1: {
					type: "array",
					items: { type: "string" },
					uniqueItems: true,
				},
			},
		};
		const ui: UiSchema = {
			field1: {
				"ui:widget": "select",
				"ui:options": {
					dictionaryCode: "v2.test.dict",
					multiple: true,
				},
			},
		};

		const merged = mergeDictionaryEnumsIntoPreviewSchema(schema, ui, ENUM_MAP);
		expect(merged.properties?.field1).toMatchObject({
			type: "array",
			items: {
				type: "string",
				enum: ["a", "b"],
				enumNames: ["Alpha", "Beta"],
			},
		});
	});

	it("treats array+string dictionary as multi without explicit multiple flag", () => {
		const bindings = collectDictionaryFieldBindings(
			{
				field1: {
					"ui:options": { dictionaryCode: "v2.test.dict" },
				},
			} as UiSchema,
			{
				type: "object",
				properties: {
					field1: {
						type: "array",
						items: { type: "string" },
					},
				},
			},
		);

		expect(bindings).toEqual([
			{
				pointer: "/field1",
				dictionaryCode: "v2.test.dict",
				multiple: true,
			},
		]);
	});

	it("injects enumOptions into preview ui schema", () => {
		const previewUi: UiSchema = {
			field1: { "ui:widget": "select" },
		};
		const sourceUi: UiSchema = {
			field1: {
				"ui:widget": "select",
				"ui:options": { dictionaryCode: "v2.test.dict" },
			},
		};
		const schema: RJSFSchema = {
			type: "object",
			properties: { field1: { type: "string" } },
		};

		const merged = mergeDictionaryOptionsIntoPreviewUiSchema(
			previewUi,
			sourceUi,
			schema,
			ENUM_MAP,
		);

		expect(merged.field1).toMatchObject({
			"ui:options": {
				enumOptions: [
					{ value: "a", label: "Alpha" },
					{ value: "b", label: "Beta" },
				],
				enumNames: ["Alpha", "Beta"],
			},
		});
	});
});

describe("parseDictionaryJsonToEnumPair", () => {
	it("keeps legacy label-as-value for ordinary dictionaries", () => {
		expect(
			parseDictionaryJsonToEnumPair({
				code: "v2.test.dict",
				items: [
					{ code: "a", label: "Alpha" },
					{ code: "b", label: "Beta" },
				],
			}),
		).toEqual({
			enums: ["Alpha", "Beta"],
			enumNames: ["Alpha", "Beta"],
		});
	});

	it("stores codes for implementationStream dictionary 1:1 with items", () => {
		expect(
			parseDictionaryJsonToEnumPair(
				{
					items: [
						{
							code: "rb",
							label: "Моделирование РБ",
							payload: { storeCode: true },
						},
						{
							code: "rnd",
							label: "Моделирование RnD",
							payload: { storeCode: true },
						},
					],
				},
				"v2.generalInfo.implementationStream",
			),
		).toEqual({
			enums: ["rb", "rnd"],
			enumNames: ["Моделирование РБ", "Моделирование RnD"],
		});
	});
});
