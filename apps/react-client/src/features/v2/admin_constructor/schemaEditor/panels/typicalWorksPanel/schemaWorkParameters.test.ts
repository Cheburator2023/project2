import { describe, expect, it } from "vitest";
import type { RJSFSchema } from "@rjsf/utils";
import type { V2TypicalWorkParameterDto } from "@smart-anketa/api-contract";
import {
	buildSchemaWorkParameters,
	isSchemaLaborParamCandidate,
	jsonPointerToLogicVarPath,
	resolveSchemaParamFieldRef,
	schemaParamIdFromPointer,
	schemaLaborParamPickerCaption,
	resolveSchemaParamForTriggerRule,
	triggerRuleGroupKey,
	excludeRulesByGroupKey,
	resolveWorkParameterOption,
} from "./schemaWorkParameters";
import type { FieldPathHint } from "../../types";

describe("jsonPointerToLogicVarPath", () => {
	it("marks array item segments with []", () => {
		expect(
			jsonPointerToLogicVarPath("/streamDataSources/sourceSystems/items/type"),
		).toBe("streamDataSources.sourceSystems[].type");
		expect(jsonPointerToLogicVarPath("/detailInfo/dataMart/metricsCount")).toBe(
			"detailInfo.dataMart.metricsCount",
		);
	});
});

describe("schemaParamIdFromPointer", () => {
	it("prefixes json pointer with schema:", () => {
		expect(schemaParamIdFromPointer("/generalInfo/pilotNeed")).toBe(
			"schema:/generalInfo/pilotNeed",
		);
	});
});

describe("resolveSchemaParamFieldRef", () => {
	it("extracts pointer, varPath and field key from schema param id", () => {
		const [param] = buildSchemaWorkParameters({
			fieldPathHints: [
				{
					pointer: "/streamDataSources/sourceSystems/items/type",
					key: "type",
					title: "Тип системы-источника",
					varPath: "streamDataSources.sourceSystems[].type",
					schemaFieldUid: "field-stable",
					dictionaryCode: null,
					codesPreview: null,
				},
			],
			uiSchema: {},
			jsonSchema: {
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
										type: { type: "string", enum: ["A", "B"] },
									},
								},
							},
						},
					},
				},
			},
			enumMapByCode: {},
		});
		expect(resolveSchemaParamFieldRef(param)).toEqual({
			pointer: "/streamDataSources/sourceSystems/items/type",
			varPath: "streamDataSources.sourceSystems[].type",
			fieldKey: "type",
		});
		expect(param?.id).toBe("schema:field-stable");
		expect(param?.schemaFieldUid).toBe("field-stable");
	});
});

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
		expect(param?.textual).not.toBe(true);
		expect(isSchemaLaborParamCandidate(param!)).toBe(true);
	});

	it("includes multi-select dictionary fields (array of string) as labor params", () => {
		const dictCode = "v2.detailInfo.dataMart.tags";
		const hints: FieldPathHint[] = [
			{
				pointer: "/detailInfo/dataMart/tags",
				key: "tags",
				title: "Теги витрины",
				varPath: "detailInfo.dataMart.tags",
				dictionaryCode: dictCode,
				codesPreview: null,
			},
		];

		const params = buildSchemaWorkParameters({
			fieldPathHints: hints,
			uiSchema: {
				detailInfo: {
					dataMart: {
						"ui:options": { archComponent: "dataMart" },
						tags: {
							"ui:options": {
								dictionaryCode: dictCode,
								multiple: true,
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
							dataMart: {
								type: "object",
								properties: {
									tags: {
										type: "array",
										title: "Теги витрины",
										items: { type: "string" },
									},
								},
							},
						},
					},
				},
			} as RJSFSchema,
			enumMapByCode: {
				[dictCode]: {
					enums: ["simple", "complex"],
					enumNames: ["Простой", "Сложный"],
				},
			},
		});

		const param = params.find((p) => p.code === "tags");
		expect(param).toBeDefined();
		expect(param?.dictionaryCode).toBe(dictCode);
		expect(param?.values.map((v) => v.code)).toEqual(["simple", "complex"]);
		expect(isSchemaLaborParamCandidate(param!)).toBe(true);
	});

	it("still excludes plain object arrays without dictionary binding", () => {
		const hints: FieldPathHint[] = [
			{
				pointer: "/detailInfo/sourceSystems",
				key: "sourceSystems",
				title: "Системы-источники",
				varPath: "detailInfo.sourceSystems",
				dictionaryCode: null,
				codesPreview: null,
			},
		];

		const params = buildSchemaWorkParameters({
			fieldPathHints: hints,
			uiSchema: {
				detailInfo: {
					sourceSystems: {
						"ui:options": { archComponent: "sourceSystem" },
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
								title: "Системы-источники",
								items: {
									type: "object",
									properties: {
										name: { type: "string", title: "Название" },
									},
								},
							},
						},
					},
				},
			} as RJSFSchema,
			enumMapByCode: {},
		});

		expect(params.find((p) => p.code === "sourceSystems")).toBeUndefined();
	});

	it("includes plain string schema fields without enum or dictionary", () => {
		const stringHints: FieldPathHint[] = [
			{
				pointer: "/detailInfo/dataMart/description",
				key: "description",
				title: "Описание витрины",
				varPath: "detailInfo.dataMart.description",
				dictionaryCode: null,
				codesPreview: null,
			},
		];

		const params = buildSchemaWorkParameters({
			fieldPathHints: stringHints,
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
									description: {
										type: "string",
										title: "Описание витрины",
									},
								},
							},
						},
					},
				},
			} as RJSFSchema,
			enumMapByCode: {},
		});

		const description = params.find((p) => p.code === "description");
		expect(description).toBeDefined();
		expect(description?.textual).toBe(true);
		expect(description?.values).toEqual([]);
		expect(isSchemaLaborParamCandidate(description!)).toBe(true);
	});

	it("keeps same-named «Тип работ» fields on different paths as separate params", () => {
		const hints: FieldPathHint[] = [
			{
				pointer: "/detailInfo/model/workType",
				key: "workType",
				title: "Тип работ",
				varPath: "detailInfo.model.workType",
				dictionaryCode: null,
				codesPreview: ["Разработка", "Доработка", "Настройка"],
			},
			{
				pointer: "/detailInfo/dataMart/items/workType",
				key: "field_yJ5IGkCR",
				title: "Тип работ",
				varPath: "detailInfo.dataMart[].workType",
				dictionaryCode: null,
				codesPreview: ["Разработка", "Доработка"],
			},
			{
				pointer: "/generalInfo/modelService/workType",
				key: "workType",
				title: "Тип работ",
				varPath: "generalInfo.modelService.workType",
				dictionaryCode: null,
				codesPreview: ["Разработка", "Доработка", "Настройка", "Сопровождение"],
			},
		];

		const params = buildSchemaWorkParameters({
			fieldPathHints: hints,
			uiSchema: {},
			jsonSchema: {
				type: "object",
				properties: {
					detailInfo: {
						type: "object",
						properties: {
							model: {
								type: "object",
								properties: {
									workType: { type: "string", title: "Тип работ" },
								},
							},
							dataMart: {
								type: "array",
								items: {
									type: "object",
									properties: {
										workType: { type: "string", title: "Тип работ" },
									},
								},
							},
						},
					},
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

		const workTypes = params.filter((p) => p.name === "Тип работ");
		expect(workTypes).toHaveLength(3);
		const codes = workTypes.map((p) => p.code);
		expect(new Set(codes).size).toBe(3);
		expect(codes).toContain("field_yJ5IGkCR");
	});

	it("excludes system scaffold fields (meta/summary/workflow/…)", () => {
		const scaffoldHints: FieldPathHint[] = [
			{
				pointer: "/summary/total",
				key: "total",
				title: "Итоговая оценка трудоёмкости (Total), ч/д",
				varPath: "summary.total",
				dictionaryCode: null,
				codesPreview: null,
			},
			{
				pointer: "/meta/version",
				key: "version",
				title: "Версия",
				varPath: "meta.version",
				dictionaryCode: null,
				codesPreview: null,
			},
			{
				pointer: "/uncertaintyCalculation/riskGroup/sanctions",
				key: "sanctions",
				title: "Введение санкционных мер",
				varPath: "uncertaintyCalculation.riskGroup.sanctions",
				dictionaryCode: null,
				codesPreview: null,
			},
			{
				pointer: "/detailInfo/dataMart/description",
				key: "description",
				title: "Описание витрины",
				varPath: "detailInfo.dataMart.description",
				dictionaryCode: null,
				codesPreview: null,
			},
		];

		const params = buildSchemaWorkParameters({
			fieldPathHints: scaffoldHints,
			uiSchema: {},
			jsonSchema: {
				type: "object",
				properties: {
					summary: {
						type: "object",
						properties: { total: { type: "number", title: "Total" } },
					},
					meta: {
						type: "object",
						properties: { version: { type: "string", title: "Версия" } },
					},
					uncertaintyCalculation: {
						type: "object",
						properties: {
							riskGroup: {
								type: "object",
								properties: {
									sanctions: { type: "boolean", title: "Санкции" },
								},
							},
						},
					},
					detailInfo: {
						type: "object",
						properties: {
							dataMart: {
								type: "object",
								properties: {
									description: {
										type: "string",
										title: "Описание витрины",
									},
								},
							},
						},
					},
				},
			} as RJSFSchema,
			enumMapByCode: {},
		});

		expect(params.some((p) => p.code === "total")).toBe(false);
		expect(params.some((p) => p.code === "version")).toBe(false);
		expect(params.some((p) => p.code === "sanctions")).toBe(false);
		// Обычные поля схемы остаются доступными.
		expect(params.some((p) => p.code === "description")).toBe(true);
	});

	it("excludes fields inside typical/atypical work result blocks", () => {
		const workBlockHints: FieldPathHint[] = [
			{
				pointer:
					"/streamDataSources/sourceTypicalTasks/items/estimateHoursPerDay",
				key: "estimateHoursPerDay",
				title: "Базовая оценка (ч/д)",
				varPath: "streamDataSources.sourceTypicalTasks[].estimateHoursPerDay",
				dictionaryCode: null,
				codesPreview: null,
			},
			{
				pointer: "/detailInfo/sourceSystems/items/entityVolume",
				key: "entityVolume",
				title: "Объём по сущностям",
				varPath: "detailInfo.sourceSystems[].entityVolume",
				dictionaryCode: null,
				codesPreview: null,
			},
		];

		const params = buildSchemaWorkParameters({
			fieldPathHints: workBlockHints,
			uiSchema: {
				streamDataSources: {
					sourceTypicalTasks: {
						"ui:options": { archComponent: "typicalWork" },
					},
				},
				detailInfo: {
					sourceSystems: {
						"ui:options": { archComponent: "sourceSystem" },
					},
				},
			},
			jsonSchema: {
				type: "object",
				properties: {
					streamDataSources: {
						type: "object",
						properties: {
							sourceTypicalTasks: {
								type: "array",
								items: {
									type: "object",
									properties: {
										estimateHoursPerDay: {
											type: "number",
											title: "Базовая оценка (ч/д)",
										},
									},
								},
							},
						},
					},
					detailInfo: {
						type: "object",
						properties: {
							sourceSystems: {
								type: "array",
								items: {
									type: "object",
									properties: {
										entityVolume: {
											type: "number",
											title: "Объём по сущностям",
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

		expect(params.some((p) => p.code === "estimateHoursPerDay")).toBe(false);
		expect(params.some((p) => p.code === "entityVolume")).toBe(true);
	});

	it("excludes legacy typical work output arrays without archComponent", () => {
		const legacyHints: FieldPathHint[] = [
			{
				pointer: "/detailInfo/detailTypicalTasks/items/estimateHoursPerDay",
				key: "estimateHoursPerDay",
				title: "Базовая оценка (ч/д)",
				varPath: "detailInfo.detailTypicalTasks[].estimateHoursPerDay",
				dictionaryCode: null,
				codesPreview: null,
			},
			{
				pointer: "/field_aJEu5ziT/sourceTypicalTasks/items/estimateHoursPerDay",
				key: "estimateHoursPerDay",
				title: "Базовая оценка (ч/д)",
				varPath: "field_aJEu5ziT.sourceTypicalTasks[].estimateHoursPerDay",
				dictionaryCode: null,
				codesPreview: null,
			},
		];

		const params = buildSchemaWorkParameters({
			fieldPathHints: legacyHints,
			uiSchema: {
				detailInfo: {
					detailTypicalTasks: {
						"ui:options": { addable: false },
						"ui:readonly": true,
					},
				},
				field_aJEu5ziT: {
					sourceTypicalTasks: {
						"ui:options": { addable: false },
						"ui:readonly": true,
					},
				},
			},
			jsonSchema: {
				type: "object",
				properties: {
					detailInfo: {
						type: "object",
						properties: {
							detailTypicalTasks: {
								type: "array",
								items: {
									type: "object",
									properties: {
										estimateHoursPerDay: {
											type: "number",
											title: "Базовая оценка (ч/д)",
										},
									},
								},
							},
						},
					},
					field_aJEu5ziT: {
						type: "object",
						properties: {
							sourceTypicalTasks: {
								type: "array",
								items: {
									type: "object",
									properties: {
										estimateHoursPerDay: {
											type: "number",
											title: "Базовая оценка (ч/д)",
										},
									},
								},
							},
						},
					},
				},
			},
			enumMapByCode: {},
		});

		expect(params).toHaveLength(0);
	});
});

describe("schemaLaborParamPickerCaption", () => {
	it("warns that any-of is useless for plain string fields", () => {
		expect(
			schemaLaborParamPickerCaption({
				id: "1",
				code: "note",
				name: "Заметка",
				description: null,
				textual: true,
				values: [],
			}),
		).toMatch(/Any-of без справочника обычно бесполезен/i);
	});

	it("warns that any-of is useless for numeric fields without dictionary", () => {
		expect(
			schemaLaborParamPickerCaption({
				id: "2",
				code: "count",
				name: "Количество",
				description: null,
				numeric: true,
				values: [],
			}),
		).toMatch(/Any-of обычно бесполезен/i);
	});

	it("notes dictionary fields work for both modes", () => {
		expect(
			schemaLaborParamPickerCaption({
				id: "3",
				code: "type",
				name: "Тип",
				description: null,
				values: [
					{
						id: "v1",
						code: "a",
						label: "A",
						coefficient: null,
						sortOrder: 0,
						validFrom: "2025-01-01",
						validTo: null,
					},
					{
						id: "v2",
						code: "b",
						label: "B",
						coefficient: null,
						sortOrder: 1,
						validFrom: "2025-01-01",
						validTo: null,
					},
				],
			}),
		).toMatch(/2 значения.*По значениям.*Any-of/i);
	});

	it("includes schema field path before mode hint", () => {
		expect(
			schemaLaborParamPickerCaption({
				id: "schema:field",
				code: "field_8pFvwc-v",
				name: "Наличие реплики в DAPP",
				description: "streamDataSources.sourceSystems[].field_8pFvwc-v",
				values: [
					{
						id: "v-true",
						code: "true",
						label: "Да",
						coefficient: null,
						sortOrder: 0,
						validFrom: "2025-01-01",
						validTo: null,
					},
				],
			}),
		).toBe(
			"streamDataSources.sourceSystems[].field_8pFvwc-v · 1 значение · подходит «По значениям» и Any-of",
		);
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

describe("resolveWorkParameterOption", () => {
	const schemaParams: V2TypicalWorkParameterDto[] = [
		{
			id: "schema:type",
			code: "type",
			name: "Тип системы-источника",
			description: null,
			schemaPointer: "/streamDataSources/sourceSystems/items/type",
			values: [],
		},
	];
	const methodologyCatalog: V2TypicalWorkParameterDto[] = [
		{
			id: "cat-legacy",
			code: "тип_системы_источника",
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
			],
		},
	];

	it("prefers schema param over methodology catalog", () => {
		expect(
			resolveWorkParameterOption(
				"type",
				"Тип системы-источника",
				schemaParams,
				methodologyCatalog,
			)?.code,
		).toBe("type");
	});

	it("bridges legacy catalog code to schema field", () => {
		expect(
			resolveWorkParameterOption(
				"тип_системы_источника",
				"Тип системы-источника",
				schemaParams,
				methodologyCatalog,
			)?.code,
		).toBe("type");
	});

	it("falls back to methodology catalog when schema has no match", () => {
		expect(
			resolveWorkParameterOption(
				"тип_системы_источника",
				"Тип системы-источника",
				[],
				methodologyCatalog,
			)?.code,
		).toBe("тип_системы_источника");
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
