import { describe, expect, it } from "vitest";
import {
	buildWorkSchemaParamsFromTemplate,
	collectTypicalWorkSchemaConsistencyIssues,
	findCatalogPreviousCodeForSchemaParam,
	schemaEnumValueMatchesRule,
} from "./v2-template-work-schema-params.util";
import {
	resolveTypicalWorkRulesForSourceMatch,
	typicalWorkRulesMatchSourceWithSchema,
} from "./v2-work-schema-params-match.util";
import { typicalWorkRulesMatchSource } from "./v2-works-catalog-match.util";

describe("typicalWorkRulesMatchSourceWithSchema", () => {
	const schemaParams = [
		{
			code: "field_metrics",
			name: "Количество метрик",
			values: [],
		},
		{
			code: "type",
			name: "Тип системы-источника",
			values: [
				{ code: "Внутренний", label: "Внутренний" },
				{ code: "Внешний", label: "Внешний" },
			],
		},
	];

	it("matches legacy slug trigger against schema field key in source", () => {
		const rules = [
			{
				paramCode: "количество_метрик",
				paramName: "Количество метрик",
				operator: ">=",
				valueCode: "10",
				valueLabel: "10",
			},
		];
		expect(typicalWorkRulesMatchSource(rules, { field_metrics: 12 })).toBe(
			false,
		);
		expect(
			typicalWorkRulesMatchSourceWithSchema(rules, { field_metrics: 12 }, [
				...schemaParams,
			]),
		).toBe(true);
	});

	it("rewrites rule paramCode for downstream matching", () => {
		const rules = [
			{
				paramCode: "тип_системы_источника",
				paramName: "Тип системы-источника",
				operator: "=",
				valueCode: "внутренний",
				valueLabel: "Внутренний",
			},
		];
		const resolved = resolveTypicalWorkRulesForSourceMatch(rules, schemaParams);
		expect(resolved[0]?.paramCode).toBe("type");
		expect(
			typicalWorkRulesMatchSourceWithSchema(rules, { type: "Внутренний" }, [
				...schemaParams,
			]),
		).toBe(true);
	});
});

describe("buildWorkSchemaParamsFromTemplate", () => {
	it("collects leaf fields from nested schema", () => {
		const params = buildWorkSchemaParamsFromTemplate({
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
										type: {
											type: "string",
											title: "Тип системы-источника",
											enum: ["Внутренний", "Внешний"],
										},
										field_metric: {
											type: "number",
											title: "Количество метрик",
										},
									},
								},
							},
						},
					},
				},
			},
			uiSchema: {
				streamDataSources: {
					sourceSystems: {
						items: {
							type: {
								"ui:options": { schemaFieldUid: "uid-type" },
							},
							field_metric: {
								"ui:options": { schemaFieldUid: "uid-metric" },
							},
						},
					},
				},
			},
		});
		expect(params.some((p) => p.code === "type")).toBe(true);
		expect(params.find((p) => p.code === "type")?.schemaFieldUid).toBe(
			"uid-type",
		);
		expect(params.some((p) => p.code === "field_metric")).toBe(true);
	});
});

describe("collectTypicalWorkSchemaConsistencyIssues", () => {
	it("reports orphan trigger and schema-linked labor params", () => {
		const issues = collectTypicalWorkSchemaConsistencyIssues({
			schemaParams: [{ code: "type", name: "Тип системы-источника", values: [] }],
			rules: [
				{
					paramCode: "missing",
					paramName: "Missing",
					operator: "=",
					valueCode: "x",
					valueLabel: "x",
				},
			],
			laborParamCodes: [
				{ paramCode: "orphan", paramName: "Orphan", schemaFieldUid: "uid-1" },
			],
		});
		expect(issues.some((issue) => issue.kind === "trigger")).toBe(true);
		expect(issues.some((issue) => issue.kind === "labor")).toBe(true);
	});

	it("ignores methodology-only labor params without schemaFieldUid", () => {
		const issues = collectTypicalWorkSchemaConsistencyIssues({
			schemaParams: [{ code: "type", name: "Тип системы-источника", values: [] }],
			rules: [],
			laborParamCodes: [
				{ paramCode: "пилот_первичный", paramName: "? Пилот (первичный" },
			],
		});
		expect(issues).toEqual([]);
	});

	it("reports broken pilot trigger split as schema/catalog mismatch", () => {
		const issues = collectTypicalWorkSchemaConsistencyIssues({
			schemaParams: [{ code: "type", name: "Тип системы-источника", values: [] }],
			rules: [
				{
					paramCode: "пилот_первичный",
					paramName: "Пилот (первичный",
					operator: "=",
					valueCode: null,
					valueLabel: null,
				},
			],
			laborParamCodes: [],
		});
		expect(issues.some((issue) => issue.paramCode === "пилот_первичный")).toBe(
			true,
		);
	});

	it("accepts pilot works bound to methodology catalog param", () => {
		const issues = collectTypicalWorkSchemaConsistencyIssues({
			schemaParams: [{ code: "type", name: "Тип системы-источника", values: [] }],
			rules: [
				{
					paramCode: "тип_пилота_разовой_загрузки",
					paramName: "Тип пилота / разовой загрузки",
					operator: "=",
					valueCode: null,
					valueLabel: null,
				},
			],
			laborParamCodes: [],
			methodologyParams: [
				{
					code: "тип_пилота_разовой_загрузки",
					name: "Тип пилота / разовой загрузки",
				},
			],
		});
		expect(issues).toEqual([]);
	});

	it("resolves control type trigger to вид контроля field, not unrelated schema fields", () => {
		const issues = collectTypicalWorkSchemaConsistencyIssues({
			schemaParams: [
				{
					code: "field_adjacent",
					name: "Негативное влияние смежных проектов на показатели проекта",
					values: [{ code: "low", label: "Низкий" }],
				},
				{
					code: "field_control",
					name: "Вид контроля",
					values: [
						{ code: "ок", label: "ОК — Оперативный контроль" },
						{ code: "кд", label: "КД — Качество модельных данных" },
					],
				},
			],
			rules: [
				{
					paramCode: "вид_контроля_ок",
					paramName: "Вид контроля: ОК",
					operator: "=",
					valueCode: "ок",
					valueLabel: "ОК",
				},
			],
			laborParamCodes: [],
		});
		expect(issues).toEqual([]);
	});

	it("matches trigger enum values case-insensitively", () => {
		const issues = collectTypicalWorkSchemaConsistencyIssues({
			schemaParams: [
				{
					code: "type",
					name: "Тип системы-источника",
					sourceKeys: ["type", "тип_системы_источника"],
					values: [
						{ code: "Внутренний", label: "Внутренний" },
						{ code: "Внешний", label: "Внешний" },
					],
				},
			],
			rules: [
				{
					paramCode: "тип_системы_источника",
					paramName: "Тип системы-источника",
					operator: "=",
					valueCode: "внутренний",
					valueLabel: "Внутренний",
				},
			],
			laborParamCodes: [],
		});
		expect(issues).toEqual([]);
	});
});

describe("findCatalogPreviousCodeForSchemaParam", () => {
	it("matches catalog item by normalized title", () => {
		const code = findCatalogPreviousCodeForSchemaParam(
			[{ code: "тип_системы_источника", name: "Тип системы-источника" }],
			{ code: "type", name: "Тип системы-источника" },
		);
		expect(code).toBe("тип_системы_источника");
	});

	it("falls back to slug when catalog has no dedicated item", () => {
		const code = findCatalogPreviousCodeForSchemaParam(
			[],
			{ code: "field_R3Lx-csF", name: "Двусторонний обмен данными" },
		);
		expect(code).toBe("двусторонний_обмен_данными");
	});
});

describe("schemaEnumValueMatchesRule", () => {
	it("matches legacy lowercase trigger codes to schema enum labels", () => {
		expect(
			schemaEnumValueMatchesRule(
				{ code: "Внутренний", label: "Внутренний" },
				{ valueCode: "внутренний", valueLabel: "Внутренний" },
			),
		).toBe(true);
	});
});
