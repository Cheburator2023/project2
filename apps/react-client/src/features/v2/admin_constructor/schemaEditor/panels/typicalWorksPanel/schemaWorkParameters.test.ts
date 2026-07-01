import { describe, expect, it } from "vitest";
import type { RJSFSchema } from "@rjsf/utils";
import { buildSchemaWorkParameters } from "./schemaWorkParameters";
import type { FieldPathHint } from "../../types";

describe("buildSchemaWorkParameters", () => {
	const hints: FieldPathHint[] = [
		{
			pointer: "/streamDataSources/sourceSystems/items/type",
			key: "type",
			title: "Тип системы-источника",
			varPath: "streamDataSources.sourceSystems[].type",
			dictionaryCode: "v2.detailInfo.sourceSystems.items.type",
			codesPreview: ["Внутренний", "Внешний"],
		},
		{
			pointer: "/streamDataSources/sourceSystems/items/name",
			key: "name",
			title: "Название источника",
			varPath: "streamDataSources.sourceSystems[].name",
			dictionaryCode: null,
			codesPreview: null,
		},
		{
			pointer: "/other/items/flag",
			key: "flag",
			title: "Чужой блок",
			varPath: "other[].flag",
			dictionaryCode: null,
			codesPreview: null,
		},
	];

	const uiSchema = {
		streamDataSources: {
			sourceSystems: {
				"ui:options": { archComponent: "sourceSystem" },
				items: {
					type: {
						"ui:options": {
							dictionaryCode: "v2.detailInfo.sourceSystems.items.type",
						},
					},
				},
			},
		},
	};

	const jsonSchema = {
		type: "object",
		properties: {
			streamDataSources: {
				type: "object",
				properties: {
					sourceSystems: {
						type: "array",
						items: {
							type: "object",
							properties: {
								type: { type: "string", title: "Тип системы-источника" },
								name: { type: "string", title: "Название источника" },
							},
						},
					},
				},
			},
		},
	} as RJSFSchema;

	it("returns schema fields for matching arch component with dictionary values", () => {
		const params = buildSchemaWorkParameters({
			archComponentType: "Система-источник",
			fieldPathHints: hints,
			uiSchema,
			jsonSchema,
			enumMapByCode: {
				"v2.detailInfo.sourceSystems.items.type": {
					enums: ["internal", "external"],
					enumNames: ["Внутренний", "Внешний"],
				},
			},
		});

		expect(params).toHaveLength(1);
		expect(params[0]?.code).toBe("type");
		expect(params[0]?.name).toBe("Тип системы-источника");
		expect(params[0]?.values.map((v) => v.label)).toEqual([
			"Внутренний",
			"Внешний",
		]);
	});

	it("includes object arch-component fields without /items/ path", () => {
		const modelHints: FieldPathHint[] = [
			{
				pointer: "/generalInfo/modelService/workType",
				key: "workType",
				title: "Тип работ",
				varPath: "generalInfo.modelService.workType",
				dictionaryCode: "v2.generalInfo.modelService.workType",
				codesPreview: ["Разработка", "Доработка"],
			},
		];

		const params = buildSchemaWorkParameters({
			archComponentType: "Модельный сервис",
			fieldPathHints: modelHints,
			uiSchema: {
				generalInfo: {
					modelService: {
						"ui:options": { archComponent: "modelService" },
						workType: {
							"ui:options": {
								dictionaryCode: "v2.generalInfo.modelService.workType",
							},
						},
					},
				},
			},
			jsonSchema: {
				type: "object",
				properties: {
					generalInfo: {
						type: "object",
						properties: {
							modelService: {
								type: "object",
								properties: {
									workType: { type: "string", title: "Тип работ" },
								},
							},
						},
					},
				},
			} as RJSFSchema,
			enumMapByCode: {},
		});

		expect(params).toHaveLength(1);
		expect(params[0]?.code).toBe("workType");
		expect(params[0]?.values.map((v) => v.label)).toEqual([
			"Разработка",
			"Доработка",
		]);
	});
});
