import { describe, expect, it } from "vitest";
import type { V2TypicalWorkCardDto } from "./v2-typical-work.types";
import {
	dedupeLaborCoefficientsByStoredValue,
	mergeLaborParamGroupsByParamCode,
	reconcileTypicalWorkCardWithSchemaField,
} from "./v2-typical-work-schema-sync.util";

function card(): V2TypicalWorkCardDto {
	return {
		id: "work-1",
		name: "Работа",
		archComponentType: "Источник",
		workType: null,
		streamExecutor: "Источник",
		triggerStatus: "appears",
		norms: [],
		rules: [
			{
				id: "rule-1",
				streamExecutor: "Источник",
				schemaFieldUid: "field-1",
				paramCode: "old_code",
				paramName: "Старое имя",
				operator: "in",
				valueCode: null,
				valueLabel: null,
				values: [
					{ code: "keep", label: "Старое значение" },
					{ code: "drop", label: "Удалённое значение" },
				],
			},
		],
		laborParams: [
			{
				schemaFieldUid: "field-1",
				paramCode: "old_code",
				paramName: "Старое имя",
				kind: "by_value",
				coefficients: [
					{
						id: "coeff-1",
						streamExecutor: "Источник",
						paramCode: "old_code",
						paramName: "Старое имя",
						valueCode: "keep",
						valueLabel: "Старое значение",
						coefficient: 2,
					},
				],
			},
		],
		formula: {
			tokens: [
				{ kind: "norm" },
				{ kind: "operator", op: "*" },
				{ kind: "param_coeff", paramCode: "old_code" },
			],
			text: "N × коэф(old_code)",
		},
		rounding: { mode: "NONE", step: null },
	};
}

describe("reconcileTypicalWorkCardWithSchemaField", () => {
	it("preserves matching dictionary values and refreshes names and codes", () => {
		const result = reconcileTypicalWorkCardWithSchemaField(card(), {
			templateVersionId: "version-1",
			mode: "apply",
			operation: "upsert",
			field: {
				schemaFieldUid: "field-1",
				previousCode: "old_code",
				code: "new_code",
				name: "Новое имя",
				values: [
					{ code: "keep", label: "Новое значение" },
					{ code: "new", label: "Новое" },
				],
			},
		});

		expect(result.changed).toBe(true);
		expect(result.card.rules[0]).toMatchObject({
			paramCode: "new_code",
			paramName: "Новое имя @ new_code|old_code|старое_имя",
			values: [{ code: "keep", label: "Новое значение" }],
		});
		expect(result.card.laborParams[0]?.coefficients).toMatchObject([
			{ valueCode: "keep", coefficient: 2, valueLabel: "Новое значение" },
			{ valueCode: "new", coefficient: 1, valueLabel: "Новое" },
		]);
		expect(result.card.formula.tokens[2]).toMatchObject({
			kind: "param_coeff",
			paramCode: "new_code",
			paramName: "Новое имя @ new_code|old_code|старое_имя",
		});
	});

	it("preserves factory coefficients when schema labels add spaces", () => {
		const legacy = card();
		legacy.laborParams[0] = {
			...legacy.laborParams[0]!,
			paramName: "Количество сущностей (исходных таблиц)",
			coefficients: [
				{
					id: "coeff-point",
					streamExecutor: "Источники данных",
					paramCode: "количество_сущностей_исходных_таблиц",
					paramName: "Количество сущностей (исходных таблиц)",
					valueCode: "точечное_1_4",
					valueLabel: "Точечное(1-4)",
					coefficient: 0.5,
				},
				{
					id: "coeff-large",
					streamExecutor: "Источники данных",
					paramCode: "количество_сущностей_исходных_таблиц",
					paramName: "Количество сущностей (исходных таблиц)",
					valueCode: "масштабное_25",
					valueLabel: "Масштабное(25+)",
					coefficient: 1.75,
				},
			],
		};

		const result = reconcileTypicalWorkCardWithSchemaField(legacy, {
			templateVersionId: "version-1",
			mode: "apply",
			operation: "upsert",
			field: {
				schemaFieldUid: "field-1",
				previousCode: "old_code",
				code: "field_Y_K0Hy0e",
				name: "Количество сущностей (исходных таблиц)",
				values: [
					{ code: "Точечное (1-4)", label: "Точечное (1-4)" },
					{ code: "Масштабное (25+)", label: "Масштабное (25+)" },
				],
			},
		});

		expect(result.card.laborParams[0]?.coefficients).toMatchObject([
			{
				valueCode: "Точечное (1-4)",
				valueLabel: "Точечное (1-4)",
				coefficient: 0.5,
			},
			{
				valueCode: "Масштабное (25+)",
				valueLabel: "Масштабное (25+)",
				coefficient: 1.75,
			},
		]);
	});

	it("remaps legacy trigger value codes to schema enum codes", () => {
		const legacy = card();
		legacy.rules[0] = {
			...legacy.rules[0]!,
			operator: "=",
			valueCode: "keep",
			valueLabel: "Старое значение",
			values: undefined,
		};
		const result = reconcileTypicalWorkCardWithSchemaField(legacy, {
			templateVersionId: "version-1",
			mode: "apply",
			operation: "upsert",
			field: {
				schemaFieldUid: "field-1",
				previousCode: "old_code",
				code: "new_code",
				name: "Новое имя",
				values: [{ code: "KEEP", label: "Новое значение" }],
			},
		});
		expect(result.card.rules[0]).toMatchObject({
			valueCode: "KEEP",
			valueLabel: "Новое значение",
		});
	});

	it("removes field references and invalidates formula tokens", () => {
		const result = reconcileTypicalWorkCardWithSchemaField(card(), {
			templateVersionId: "version-1",
			mode: "apply",
			operation: "delete",
			field: {
				schemaFieldUid: "field-1",
				previousCode: "old_code",
			},
		});

		expect(result.card.rules).toEqual([]);
		expect(result.card.laborParams).toEqual([]);
		expect(result.card.formula.tokens[2]).toMatchObject({
			kind: "param_coeff",
			paramCode: "old_code",
			invalid: true,
		});
		expect(result.impact).toMatchObject({
			rulesRemoved: 1,
			laborParamsRemoved: 1,
			formulasInvalidated: 1,
		});
	});

	it("backfills legacy references only by the previous code", () => {
		const legacy = card();
		delete legacy.rules[0]!.schemaFieldUid;
		delete legacy.laborParams[0]!.schemaFieldUid;
		const result = reconcileTypicalWorkCardWithSchemaField(legacy, {
			templateVersionId: "version-1",
			mode: "apply",
			operation: "upsert",
			field: {
				schemaFieldUid: "field-1",
				previousCode: "old_code",
				code: "old_code",
				name: "Имя",
				values: [{ code: "keep", label: "Значение" }],
			},
		});
		expect(result.card.rules[0]?.schemaFieldUid).toBe("field-1");
		expect(result.card.laborParams[0]?.schemaFieldUid).toBe("field-1");
	});

	it("does not remap an already bound reference by a shared code or name", () => {
		const result = reconcileTypicalWorkCardWithSchemaField(card(), {
			templateVersionId: "version-1",
			mode: "apply",
			operation: "upsert",
			field: {
				schemaFieldUid: "field-2",
				previousCode: "old_code",
				code: "old_code",
				name: "Старое имя",
				values: [{ code: "keep", label: "Старое значение" }],
			},
		});

		expect(result.card.rules[0]?.schemaFieldUid).toBe("field-1");
		expect(result.card.laborParams[0]?.schemaFieldUid).toBe("field-1");
		expect(result.card.formula.tokens[2]).toMatchObject({
			kind: "param_coeff",
			paramCode: "old_code",
		});
	});

	it("matches legacy slug paramCode by field title without catalog entry", () => {
		const legacy = card();
		legacy.rules[0] = {
			...legacy.rules[0]!,
			schemaFieldUid: undefined,
			paramCode: "двусторонний_обмен_данными",
			paramName: "Двусторонний обмен данными",
		};
		legacy.laborParams[0] = {
			...legacy.laborParams[0]!,
			schemaFieldUid: undefined,
			paramCode: "двусторонний_обмен_данными",
			paramName: "Двусторонний обмен данными",
		};
		legacy.formula.tokens[2] = {
			kind: "param_coeff",
			paramCode: "двусторонний_обмен_данными",
			paramName: "Двусторонний обмен данными",
		};

		const result = reconcileTypicalWorkCardWithSchemaField(legacy, {
			templateVersionId: "version-1",
			mode: "apply",
			operation: "upsert",
			field: {
				schemaFieldUid: "field_9f1865ca-e9a1-4130-9ee7-d8dc37452bce",
				previousCode: "двусторонний_обмен_данными",
				code: "field_R3Lx-csF",
				name: "Двусторонний обмен данными",
				values: [
					{ code: "Да", label: "Да" },
					{ code: "Нет", label: "Нет" },
				],
			},
		});

		expect(result.changed).toBe(true);
		expect(result.card.rules[0]).toMatchObject({
			paramCode: "field_R3Lx-csF",
			schemaFieldUid: "field_9f1865ca-e9a1-4130-9ee7-d8dc37452bce",
		});
		expect(result.card.formula.tokens[2]).toMatchObject({
			kind: "param_coeff",
			paramCode: "field_R3Lx-csF",
		});
		expect(result.card.formula.tokens[2]).not.toHaveProperty("invalid", true);
	});

	it("marks orphan formula tokens invalid when labor param is absent", () => {
		const legacy = card();
		legacy.laborParams = [];
		legacy.formula.tokens[2] = {
			kind: "param_coeff",
			paramCode: "field_HuOLfL4K",
			paramName: "Поле",
		};

		const result = reconcileTypicalWorkCardWithSchemaField(legacy, {
			templateVersionId: "version-1",
			mode: "apply",
			operation: "upsert",
			field: {
				schemaFieldUid: "field-other",
				previousCode: "other_code",
				code: "other_code",
				name: "Другое поле",
			},
		});

		expect(result.card.formula.tokens[2]).toMatchObject({
			kind: "param_coeff",
			paramCode: "field_HuOLfL4K",
			invalid: true,
		});
		expect(result.impact.formulasInvalidated).toBe(1);
	});

	it("stores short valueCode for long schema enum labels", () => {
		const longValue =
			"3 — Проведение регулярной валидации Регулятором нормативно не установлено. Заказчик запрашивает проведение первичной валидации модели";
		const legacy = card();
		legacy.laborParams[0] = {
			...legacy.laborParams[0]!,
			paramCode: "complexity",
			paramName: "Сложность постановки",
			coefficients: [
				{
					id: "coef-3",
					streamExecutor: "Модельный стрим",
					paramCode: "complexity",
					paramName: "Сложность постановки",
					valueCode: "3",
					valueLabel: "3",
					coefficient: 1.5,
				},
			],
		};

		const result = reconcileTypicalWorkCardWithSchemaField(legacy, {
			templateVersionId: "version-1",
			mode: "apply",
			operation: "upsert",
			field: {
				schemaFieldUid: "field_61a51b98-b6a8-47c9-aa27-74ff2219513f",
				previousCode: "complexity",
				code: "complexity",
				name: "Регуляторные требования",
				values: [{ code: longValue, label: longValue }],
			},
		});

		expect(result.changed).toBe(true);
		expect(result.card.laborParams[0]?.coefficients[0]?.valueCode).toBe("3");
		expect(
			(result.card.laborParams[0]?.coefficients[0]?.valueLabel ?? "").length,
		).toBeLessThanOrEqual(255);
	});

	it("merges duplicate labor param groups after legacy and bound rows converge", () => {
		const legacy = card();
		legacy.laborParams = [
			{
				schemaFieldUid: "field_8cff1155-e458-4fea-a8c7-abad1260df8f",
				paramCode: "field_N9LFD6Hu",
				paramName: "Двусторонний обмен данными",
				kind: "by_value",
				coefficients: [],
			},
			{
				schemaFieldUid: undefined,
				paramCode: "двусторонний_обмен_данными",
				paramName: "Двусторонний обмен данными",
				kind: "by_value",
				coefficients: [
					{
						id: "coef-legacy",
						streamExecutor: "Источники данных",
						paramCode: "двусторонний_обмен_данными",
						paramName: "Двусторонний обмен данными",
						valueCode: "yes",
						valueLabel: "Да",
						coefficient: 1.2,
					},
				],
			},
		];

		const result = reconcileTypicalWorkCardWithSchemaField(legacy, {
			templateVersionId: "version-1",
			mode: "apply",
			operation: "upsert",
			field: {
				schemaFieldUid: "field_8cff1155-e458-4fea-a8c7-abad1260df8f",
				previousCode: "двусторонний_обмен_данными",
				aliasCodes: ["field_N9LFD6Hu"],
				code: "field_N9LFD6Hu",
				name: "Двусторонний обмен данными",
				values: [
					{ code: "yes", label: "Да" },
					{ code: "no", label: "Нет" },
				],
			},
		});

		expect(result.card.laborParams).toHaveLength(1);
		expect(result.card.laborParams[0]).toMatchObject({
			paramCode: "field_N9LFD6Hu",
			schemaFieldUid: "field_8cff1155-e458-4fea-a8c7-abad1260df8f",
		});
		expect(result.card.laborParams[0]?.coefficients).toHaveLength(2);
	});

	it("preserves admin coefficient rows that are not in the new schema values", () => {
		const legacy = card();
		legacy.laborParams = [
			{
				schemaFieldUid: "field-1",
				paramCode: "workType",
				paramName: "Тип работ",
				kind: "by_value",
				coefficients: [
					{
						id: "keep-custom",
						streamExecutor: "Источники данных",
						paramCode: "workType",
						paramName: "Тип работ",
						valueCode: "Разработка",
						valueLabel: "Разработка",
						coefficient: 2.5,
					},
					{
						id: "remap-me",
						streamExecutor: "Источники данных",
						paramCode: "workType",
						paramName: "Тип работ",
						valueCode: "Обучение",
						valueLabel: "Обучение",
						coefficient: 1.7,
					},
				],
			},
		];

		const result = reconcileTypicalWorkCardWithSchemaField(legacy, {
			templateVersionId: "version-1",
			mode: "apply",
			operation: "upsert",
			field: {
				schemaFieldUid: "field-1",
				previousCode: "workType",
				code: "workType",
				name: "Тип работ",
				values: [
					{ code: "обучение", label: "Обучение" },
					{ code: "калибровка", label: "Калибровка" },
				],
			},
		});

		const coeffs = result.card.laborParams[0]?.coefficients ?? [];
		expect(coeffs).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					valueCode: "обучение",
					valueLabel: "Обучение",
					coefficient: 1.7,
				}),
				expect.objectContaining({
					valueCode: "калибровка",
					valueLabel: "Калибровка",
					coefficient: 1,
				}),
				expect.objectContaining({
					valueCode: "Разработка",
					valueLabel: "Разработка",
					coefficient: 2.5,
				}),
			]),
		);
	});

	it("does not rebuild coefficients when field.values is omitted (bulk binding sync)", () => {
		const legacy = card();
		legacy.laborParams = [
			{
				schemaFieldUid: "field-1",
				paramCode: "workType",
				paramName: "Тип работ",
				kind: "by_value",
				coefficients: [
					{
						id: "admin-edit",
						streamExecutor: "Источники данных",
						paramCode: "workType",
						paramName: "Тип работ",
						valueCode: "custom",
						valueLabel: "Custom",
						coefficient: 9,
					},
				],
			},
		];

		const result = reconcileTypicalWorkCardWithSchemaField(legacy, {
			templateVersionId: "version-1",
			mode: "apply",
			operation: "upsert",
			field: {
				schemaFieldUid: "field-1",
				previousCode: "workType",
				code: "field_workType",
				name: "Тип работ",
			},
		});

		expect(result.card.laborParams[0]?.coefficients).toEqual([
			expect.objectContaining({
				valueCode: "custom",
				valueLabel: "Custom",
				coefficient: 9,
			}),
		]);
		expect(result.card.laborParams[0]?.paramCode).toBe("field_workType");
	});

	it("dedupes labor coefficients that normalize to the same stored value_code", () => {
		const rows = dedupeLaborCoefficientsByStoredValue([
			{
				id: "a",
				streamExecutor: "Источники данных",
				paramCode: "workType",
				paramName: "Тип работ",
				valueCode: "разработка",
				valueLabel: "Разработка",
				coefficient: 1,
			},
			{
				id: "b",
				streamExecutor: "Источники данных",
				paramCode: "тип_работ",
				paramName: "Тип работ",
				valueCode: "разработка",
				valueLabel: "Разработка",
				coefficient: 1.5,
			},
		]);

		expect(rows).toHaveLength(1);
		expect(rows[0]?.coefficient).toBe(1);
	});

	it("dedupes merged workType rows after legacy slug and bound field converge", () => {
		const legacy = card();
		legacy.laborParams = [
			{
				schemaFieldUid: "field-work-type",
				paramCode: "workType",
				paramName: "Тип работ",
				kind: "by_value",
				coefficients: [
					{
						id: "bound",
						streamExecutor: "Источники данных",
						paramCode: "workType",
						paramName: "Тип работ",
						valueCode: "разработка",
						valueLabel: "Разработка",
						coefficient: 1,
					},
				],
			},
			{
				schemaFieldUid: undefined,
				paramCode: "тип_работ",
				paramName: "Тип работ",
				kind: "by_value",
				coefficients: [
					{
						id: "legacy",
						streamExecutor: "Источники данных",
						paramCode: "тип_работ",
						paramName: "Тип работ",
						valueCode: "разработка",
						valueLabel: "Разработка",
						coefficient: 1.5,
					},
				],
			},
		];

		const result = reconcileTypicalWorkCardWithSchemaField(legacy, {
			templateVersionId: "version-1",
			mode: "apply",
			operation: "upsert",
			field: {
				schemaFieldUid: "field-work-type",
				previousCode: "тип_работ",
				aliasCodes: ["workType"],
				code: "workType",
				name: "Тип работ",
				values: [{ code: "разработка", label: "Разработка" }],
			},
		});

		expect(result.card.laborParams).toHaveLength(1);
		expect(result.card.laborParams[0]?.coefficients).toHaveLength(1);
		expect(result.card.laborParams[0]?.coefficients[0]).toMatchObject({
			valueCode: "разработка",
			coefficient: 1,
		});
	});
});
