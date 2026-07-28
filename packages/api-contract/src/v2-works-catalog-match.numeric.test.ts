import { describe, expect, it } from "vitest";
import {
	buildLaborCoefficientLookupSource,
	coerceNumericLaborActual,
	findFieldValueInFormData,
	flattenSourceContextValue,
	laborValueMatches,
	remapTriggerRulesToSchemaParams,
	resolveByValueLaborParamCoefficients,
	typicalWorkRulesMatchSource,
} from "./v2-works-catalog-match.util";

describe("numeric labor coefficient ranges", () => {
	it("coerces string numbers for matching", () => {
		expect(coerceNumericLaborActual("7")).toBe(7);
		expect(laborValueMatches("7", "7", "7")).toBe(true);
		expect(laborValueMatches("Не требуется", null, "Не требуется")).toBe(true);
	});

	it("matches regulatory enum prefix against short labor labels", () => {
		expect(
			laborValueMatches(
				"4 — Банком не планируется предоставление Модели Регулятору, но регулярная валидация установлена Регулятором",
				"4",
				"4",
			),
		).toBe(true);
		expect(
			laborValueMatches(
				"1 — Проведение регулярной валидации Регулятором нормативно не установлено",
				null,
				"1",
			),
		).toBe(true);
		expect(laborValueMatches("4 — …", null, "5")).toBe(false);
	});

	it("matches enum prefix when only valueCode is set", () => {
		expect(
			laborValueMatches(
				"4 — Банком не планируется предоставление Модели Регулятору",
				"4",
				null,
			),
		).toBe(true);
	});

	it("matches non-digit short codes with enum prefix", () => {
		expect(laborValueMatches("ОК — Оперативный контроль", "ОК", "ОК")).toBe(
			true,
		);
		expect(laborValueMatches("КД — Качество данных", null, "КД")).toBe(true);
	});

	it("matches boolean productivization Да/Нет labels", () => {
		expect(laborValueMatches(true, null, "Да")).toBe(true);
		expect(laborValueMatches(false, null, "Нет")).toBe(true);
		expect(laborValueMatches("Да", null, "Да")).toBe(true);
		expect(laborValueMatches("Нет", null, "Нет")).toBe(true);
		expect(laborValueMatches(true, null, "Нет")).toBe(false);
	});

	it("matches labor values against array answers", () => {
		expect(laborValueMatches(["Низкая", "Высокая"], "Высокая", "Высокая")).toBe(
			true,
		);
		expect(laborValueMatches(["Нет", "Иногда"], "Да", "Да")).toBe(false);
	});

	it("resolves complexity and readyPromReports coefficients from form answers", () => {
		const coeffs = resolveByValueLaborParamCoefficients(
			{
				complexity:
					"4 — Банком не планируется предоставление Модели Регулятору, но регулярная валидация установлена Регулятором",
				readyPromReports: true,
			},
			[
				{
					paramCode: "complexity",
					paramName: "Сложность постановки",
					valueCode: "4",
					valueLabel: "4",
					coefficient: 1.75,
				},
				{
					paramCode: "readyPromReports",
					paramName: "Наличие готовых промышленных витрин",
					valueCode: "Да",
					valueLabel: "Да",
					coefficient: 0.5,
				},
			],
		);
		expect(coeffs).toEqual({
			complexity: 1.75,
			readyPromReports: 0.5,
		});
	});

	it("matches non-overlapping Russian range labels", () => {
		expect(laborValueMatches(20, "do_20", "до 20 метрик")).toBe(true);
		expect(laborValueMatches(35, "20_50", "20–50 метрик")).toBe(true);
		expect(laborValueMatches(51, "over_50", ">50 метрик")).toBe(true);
		expect(laborValueMatches(20, "20_50", "20–50 метрик")).toBe(false);
	});

	it("resolves metric count into the imported coefficient", () => {
		const rows = [
			{
				paramCode: "kolichestvo_metrik",
				paramName: "Количество метрик",
				valueCode: "do_20",
				valueLabel: "до 20 метрик",
				coefficient: 1,
			},
			{
				paramCode: "kolichestvo_metrik",
				paramName: "Количество метрик",
				valueCode: "20_50",
				valueLabel: "20–50 метрик",
				coefficient: 1.2,
			},
			{
				paramCode: "kolichestvo_metrik",
				paramName: "Количество метрик",
				valueCode: "over_50",
				valueLabel: ">50 метрик",
				coefficient: 1.4,
			},
		];

		expect(
			resolveByValueLaborParamCoefficients({ kolichestvo_metrik: 42 }, rows),
		).toEqual({ kolichestvo_metrik: 1.2 });
	});

	it("reads generalInfo numeric params from formData when absent on arch row", () => {
		const rows = [
			{
				paramCode: "assessedInitiativesCount",
				paramName: "Количество оцениваемых инициатив",
				valueCode: "to_99",
				valueLabel: "до 99",
				coefficient: 1.5,
			},
		];
		const source = { name: "Витрина 1", field_28IPlEQu: 10 };
		const formData = {
			generalInfo: { assessedInitiativesCount: 4 },
			detailInfo: { dataMart: source },
		};
		const lookup = buildLaborCoefficientLookupSource(
			source,
			formData,
			[
				{
					code: "assessedInitiativesCount",
					schemaPointer: "/generalInfo/assessedInitiativesCount",
				},
			],
			["assessedInitiativesCount"],
		);
		expect(lookup.assessedInitiativesCount).toBe(4);
		expect(resolveByValueLaborParamCoefficients(lookup, rows)).toEqual({
			assessedInitiativesCount: 1.5,
		});
	});

	it("falls back to same-titled field on source when formula code points elsewhere", () => {
		const source = {
			name: "Источник 1",
			field_L1lRlgf1: "Высокая",
		};
		const lookup = buildLaborCoefficientLookupSource(
			source,
			{ detailInfo: { dataProcess: {}, sourceSystems: [source] } },
			[
				{
					code: "field_UEzs5Q87",
					name: "Сложность реализации",
					schemaPointer: "/detailInfo/dataProcess/field_UEzs5Q87",
				},
				{
					code: "field_L1lRlgf1",
					name: "Сложность реализации",
					schemaPointer:
						"/detailInfo/sourceSystems/items/field_L1lRlgf1",
				},
			],
			["field_UEzs5Q87"],
		);
		expect(lookup.field_UEzs5Q87).toBe("Высокая");
		expect(
			resolveByValueLaborParamCoefficients(lookup, [
				{
					paramCode: "field_UEzs5Q87",
					paramName: "Сложность реализации",
					valueCode: "Высокая",
					valueLabel: "Высокая",
					coefficient: 1.2,
				},
				{
					paramCode: "field_UEzs5Q87",
					paramName: "Сложность реализации",
					valueCode: "Средняя",
					valueLabel: "Средняя",
					coefficient: 0.8,
				},
			]),
		).toEqual({ field_UEzs5Q87: 1.2 });
	});

	it("reads boolean checkbox from array-shaped dataProcess without schemaParams", () => {
		const formData = {
			detailInfo: {
				dataProcess: [
					{
						name: "Процесс 1",
						field_qMxSfHk1: true,
						field_yJ51GkCR: "Разработка",
					},
				],
			},
		};
		const lookup = buildLaborCoefficientLookupSource(
			{ name: "Источник 1", type: "Внутренний" },
			formData,
			[],
			["field_qMxSfHk1", "field_yJ51GkCR"],
		);
		expect(lookup.field_qMxSfHk1).toBe(true);
		expect(lookup.field_yJ51GkCR).toBe("Разработка");
		expect(
			resolveByValueLaborParamCoefficients(lookup, [
				{
					paramCode: "field_qMxSfHk1",
					paramName: "Требуется интеграция",
					valueCode: "Да",
					valueLabel: "Да",
					coefficient: 1.5,
				},
				{
					paramCode: "field_qMxSfHk1",
					paramName: "Требуется интеграция",
					valueCode: "Нет",
					valueLabel: "Нет",
					coefficient: 1,
				},
			]),
		).toEqual({ field_qMxSfHk1: 1.5 });
	});

	it("collects all matching field values from multiple arch components", () => {
		const formData = {
			detailInfo: {
				dataProcess: [
					{ field_archComplexity: "Низкая" },
					{ field_archComplexity: "Высокая" },
				],
			},
		};
		expect(findFieldValueInFormData(formData, "field_archComplexity")).toEqual([
			"Низкая",
			"Высокая",
		]);
	});

	it("uses first matching coefficient for array answers (per-instance uses scalars)", () => {
		const coeffs = resolveByValueLaborParamCoefficients(
			{
				complexity: ["Низкая", "Высокая"],
			},
			[
				{
					paramCode: "complexity",
					paramName: "Сложность",
					valueCode: "Низкая",
					valueLabel: "Низкая",
					coefficient: 0.8,
				},
				{
					paramCode: "complexity",
					paramName: "Сложность",
					valueCode: "Высокая",
					valueLabel: "Высокая",
					coefficient: 1.4,
				},
			],
		);
		expect(coeffs).toEqual({ complexity: 0.8 });
	});

	it("resolves readyPromReports from a single model source context", () => {
		const coeffs = resolveByValueLaborParamCoefficients(
			{ name: "вава", readyPromReports: true },
			[
				{
					paramCode: "readyPromReports",
					paramName: "Наличие готовых промышленных витрин",
					valueCode: "Да",
					valueLabel: "Да",
					coefficient: 0.5,
				},
				{
					paramCode: "readyPromReports",
					paramName: "Наличие готовых промышленных витрин",
					valueCode: "Нет",
					valueLabel: "Нет",
					coefficient: 1,
				},
			],
		);
		expect(coeffs).toEqual({ readyPromReports: 0.5 });
	});

	it("flattenSourceContextValue unwraps arch-object arrays", () => {
		expect(
			flattenSourceContextValue([{ field_qMxSfHk1: true, a: 1 }]),
		).toEqual({ field_qMxSfHk1: true, a: 1 });
		expect(flattenSourceContextValue({ field_qMxSfHk1: false })).toEqual({
			field_qMxSfHk1: false,
		});
		expect(flattenSourceContextValue([])).toEqual({});
	});

	it("remaps stale trigger paramCode to schema field by name", () => {
		const remapped = remapTriggerRulesToSchemaParams(
			[
				{
					paramCode: "field_Ad1msOl7",
					paramName: "Необходима продуктивизация",
					operator: "=",
					valueCode: "Да",
					valueLabel: "Да",
				},
			],
			[
				{
					code: "field_x-1d7wUh",
					name: "Необходима продуктивизация",
				},
			],
		);
		expect(remapped[0]?.paramCode).toBe("field_x-1d7wUh");

		expect(
			typicalWorkRulesMatchSource(
				[
					{
						paramCode: "field_Ad1msOl7",
						paramName: "Необходима продуктивизация",
						operator: "=",
						valueCode: "Да",
						valueLabel: "Да",
					},
				],
				{},
				{ detailInfo: { dataMart: { "field_x-1d7wUh": true } } },
				null,
				{
					schemaParams: [
						{
							code: "field_x-1d7wUh",
							name: "Необходима продуктивизация",
							schemaPointer: "/detailInfo/dataMart/field_x-1d7wUh",
						},
					],
				},
			),
		).toBe(true);
	});
});
