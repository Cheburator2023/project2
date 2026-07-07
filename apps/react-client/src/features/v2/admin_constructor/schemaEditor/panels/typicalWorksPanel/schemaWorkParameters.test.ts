import { describe, expect, it } from "vitest";
import type { RJSFSchema } from "@rjsf/utils";
import type { V2TypicalWorkParameterDto } from "@smart-anketa/api-contract";
import {
	buildSchemaWorkParameters,
	resolveSchemaParamForTriggerRule,
	triggerRuleGroupKey,
	excludeRulesByGroupKey,
} from "./schemaWorkParameters";
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

		const typeParam = params.find((p) => p.code === "type");
		expect(typeParam).toBeDefined();
		expect(typeParam?.name).toBe("Тип системы-источника");
		expect(typeParam?.values.map((v) => v.label)).toEqual([
			"Внутренний",
			"Внешний",
		]);
	});

	it("includes fields from all arch components even when work arch type is passed", () => {
		const extendedSchema = {
			...jsonSchema,
			properties: {
				...jsonSchema.properties,
				other: {
					type: "array",
					items: {
						type: "object",
						properties: {
							flag: { type: "boolean", title: "Чужой блок" },
						},
					},
				},
			},
		} as RJSFSchema;
		const enumMapByCode = {
			"v2.detailInfo.sourceSystems.items.type": {
				enums: ["internal", "external"],
				enumNames: ["Внутренний", "Внешний"],
			},
		};

		const params = buildSchemaWorkParameters({
			archComponentType: "Система-источник",
			fieldPathHints: hints,
			uiSchema,
			jsonSchema: extendedSchema,
			enumMapByCode,
		});

		expect(params.some((p) => p.code === "type")).toBe(true);
		expect(params.some((p) => p.code === "flag")).toBe(true);
	});

	it("includes fields from all arch components when filter is omitted", () => {
		const params = buildSchemaWorkParameters({
			fieldPathHints: hints,
			uiSchema,
			jsonSchema: {
				...jsonSchema,
				properties: {
					...jsonSchema.properties,
					other: {
						type: "array",
						items: {
							type: "object",
							properties: {
								flag: { type: "boolean", title: "Чужой блок" },
							},
						},
					},
				},
			} as RJSFSchema,
			enumMapByCode: {
				"v2.detailInfo.sourceSystems.items.type": {
					enums: ["internal", "external"],
					enumNames: ["Внутренний", "Внешний"],
				},
			},
		});

		expect(params.some((p) => p.code === "type")).toBe(true);
		expect(params.some((p) => p.code === "flag")).toBe(true);
	});

	it("includes numeric schema fields without enum values", () => {
		const numericHints: FieldPathHint[] = [
			{
				pointer: "/detailInfo/dataMart/metricsCount",
				key: "metricsCount",
				title: "Количество метрик",
				varPath: "detailInfo.dataMart.metricsCount",
				dictionaryCode: null,
				codesPreview: null,
			},
		];

		const params = buildSchemaWorkParameters({
			fieldPathHints: numericHints,
			uiSchema: {
				detailInfo: {
					dataMart: {
						"ui:options": { archComponent: "dataMart" },
					},
				},
			},
			jsonSchema: {
				type: "object",
				properties: {
					detailInfo: {
						type: "object",
						properties: {
							dataMart: {
								type: "object",
								properties: {
									metricsCount: {
										type: "number",
										title: "Количество метрик",
									},
								},
							},
						},
					},
				},
			} as RJSFSchema,
			enumMapByCode: {},
		});

		const metrics = params.find((p) => p.code === "metricsCount");
		expect(metrics).toBeDefined();
		expect(metrics?.numeric).toBe(true);
		expect(metrics?.values).toEqual([]);
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

	it("includes dictionary-bound fields without inline enum when dictionary is not loaded", () => {
		const hints: FieldPathHint[] = [
			{
				pointer: "/detailInfo/sourceSystems/items/field_wuYlhnu0",
				key: "field_wuYlhnu0",
				title: "Сложность настройки шаблона",
				varPath: "detailInfo.sourceSystems[].field_wuYlhnu0",
				dictionaryCode: "v2.detailInfo.sourceSystems.items.field_wuYlhnu0",
				codesPreview: null,
			},
		];

		const params = buildSchemaWorkParameters({
			fieldPathHints: hints,
			uiSchema: {
				detailInfo: {
					sourceSystems: {
						items: {
							field_wuYlhnu0: {
								"ui:options": {
									dictionaryCode:
										"v2.detailInfo.sourceSystems.items.field_wuYlhnu0",
								},
							},
						},
					},
				},
			},
			jsonSchema: {
				type: "object",
				properties: {
					detailInfo: {
						type: "object",
						properties: {
							sourceSystems: {
								type: "array",
								items: {
									type: "object",
									properties: {
										field_wuYlhnu0: {
											type: "string",
											title: "Сложность настройки шаблона",
										},
									},
								},
							},
						},
					},
				},
			} as RJSFSchema,
			enumMapByCode: {},
		});

		const param = params.find((p) => p.code === "field_wuYlhnu0");
		expect(param).toBeDefined();
		expect(param?.dictionaryCode).toBe(
			"v2.detailInfo.sourceSystems.items.field_wuYlhnu0",
		);
		expect(param?.values).toEqual([]);
	});
});

describe("resolveSchemaParamForTriggerRule", () => {
	const schemaParams: V2TypicalWorkParameterDto[] = [
		{
			id: "schema:type",
			code: "type",
			name: "Тип системы-источника",
			description: "streamDataSources.sourceSystems[].type",
			values: [
				{
					id: "v1",
					code: "internal",
					label: "Внутренний",
					coefficient: null,
					sortOrder: 0,
					validFrom: "2025-01-01",
					validTo: null,
				},
				{
					id: "v2",
					code: "external",
					label: "Внешний",
					coefficient: null,
					sortOrder: 1,
					validFrom: "2025-01-01",
					validTo: null,
				},
			],
		},
	];

	it("maps CSV source-type trigger alias to schema `type` field", () => {
		const param = resolveSchemaParamForTriggerRule(
			{
				paramCode: "тип_источника_внешний",
				paramName: "Тип источника (внешний)",
			},
			schemaParams,
		);
		expect(param?.code).toBe("type");
	});

	it("maps «Тип системы-источника» legacy slug to schema `type` field", () => {
		const param = resolveSchemaParamForTriggerRule(
			{
				paramCode: slugFromName("Тип системы-источника"),
				paramName: "Тип системы-источника",
			},
			schemaParams,
		);
		expect(param?.code).toBe("type");
	});
});

describe("triggerRuleGroupKey", () => {
	const schemaParams: V2TypicalWorkParameterDto[] = [
		{
			id: "schema:type",
			code: "type",
			name: "Тип системы-источника",
			description: null,
			values: [
				{
					id: "v1",
					code: "internal",
					label: "Внутренний",
					coefficient: null,
					sortOrder: 0,
					validFrom: "2025-01-01",
					validTo: null,
				},
				{
					id: "v2",
					code: "external",
					label: "Внешний",
					coefficient: null,
					sortOrder: 1,
					validFrom: "2025-01-01",
					validTo: null,
				},
			],
		},
	];

	it("merges legacy and schema param codes into one group", () => {
		const legacy = {
			paramCode: "тип_системы_источника",
			paramName: "Тип системы-источника",
		};
		const schema = { paramCode: "type", paramName: "Тип системы-источника" };
		expect(triggerRuleGroupKey(legacy, schemaParams)).toBe("type");
		expect(triggerRuleGroupKey(schema, schemaParams)).toBe("type");
	});

	it("excludeRulesByGroupKey removes all aliases in the group", () => {
		const rules = [
			{
				paramCode: "type",
				paramName: "Тип системы-источника",
				valueCode: "external",
				valueLabel: "Внешний",
			},
			{
				paramCode: "тип_системы_источника",
				paramName: "Тип системы-источника",
				valueCode: "internal",
				valueLabel: "Внутренний",
			},
		];
		const next = excludeRulesByGroupKey(rules, "type", schemaParams);
		expect(next).toHaveLength(0);
	});
});

function slugFromName(name: string): string {
	return name
		.toLowerCase()
		.replace(/[^\wа-я]+/gi, "_")
		.replace(/^_+|_+$/g, "");
}
