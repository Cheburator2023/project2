import { describe, expect, it } from "vitest";
import {
	catalogValueMatchesTriggerRule,
	isSourceTypeTriggerParam,
	resolveLaborAnyOfCoefficient,
	resolveStreamFromSourceType,
	resolveStreamsFromSourceSystems,
	resolveTriggerStatusCatalogParam,
	triggerRuleCatalogGroupKey,
	typicalWorkRulesMatchSource,
	V2_SOURCE_STREAM,
} from "./v2-works-catalog-match.util";

describe("v2-works-catalog-match.util", () => {
	it("resolves the unified source stream for any source row", () => {
		// Разделение внутр/внеш убрано: любой источник → единый стрим.
		expect(resolveStreamFromSourceType({ type: "Внутренний" })).toBe(
			V2_SOURCE_STREAM,
		);
		expect(resolveStreamFromSourceType({ type: "Внешний" })).toBe(
			V2_SOURCE_STREAM,
		);
		expect(resolveStreamFromSourceType({})).toBe(V2_SOURCE_STREAM);
	});

	it("collects the unified source stream from source systems", () => {
		expect(
			resolveStreamsFromSourceSystems({
				streamDataSources: {
					sourceSystems: [{ type: "Внутренний" }, { type: "Внешний" }],
				},
			}),
		).toEqual([V2_SOURCE_STREAM]);
	});

	it("matches control type by bracket label", () => {
		const rules = [
			{
				paramCode: "вид_контроля_кд",
				paramName: "Вид контроля: КД",
				operator: "=",
				valueCode: null,
				valueLabel: "КД",
			},
		];
		expect(
			typicalWorkRulesMatchSource(rules, {
				value: "Качество модельных данных [КД]",
			}),
		).toBe(true);
		expect(typicalWorkRulesMatchSource(rules, { value: "Технический [ТМ]" })).toBe(
			false,
		);
	});

	it("matches source type trigger by value code", () => {
		const rules = [
			{
				paramCode: "type",
				paramName: "Тип системы-источника",
				operator: "=",
				valueCode: "external",
				valueLabel: "Внешний",
			},
		];
		expect(typicalWorkRulesMatchSource(rules, { type: "external" })).toBe(true);
		expect(typicalWorkRulesMatchSource(rules, { type: "Внешний" })).toBe(true);
		expect(typicalWorkRulesMatchSource(rules, { type: "internal" })).toBe(false);
	});

	it("reads source field from encoded paramName aliases", () => {
		const rules = [
			{
				paramCode: "field_primary",
				paramName: "Сложность @ field_alt|field_other",
				operator: "=",
				valueCode: "high",
				valueLabel: "Высокая",
			},
		];
		expect(
			typicalWorkRulesMatchSource(rules, {
				field_alt: "high",
			}),
		).toBe(true);
	});

	it("matches schema field trigger by label when rule stores dictionary code", () => {
		const rules = [
			{
				paramCode: "field_nE73kPQl",
				paramName: "Детализация и ясность запроса постановки задачи",
				operator: "=",
				valueCode: "Точечное",
				valueLabel: "Точечное",
			},
		];
		expect(
			typicalWorkRulesMatchSource(rules, {
				field_nE73kPQl: "Точечное",
			}),
		).toBe(true);
		expect(
			typicalWorkRulesMatchSource(rules, {
				field_nE73kPQl: "Масштабное",
			}),
		).toBe(false);
	});

	it("matches source type trigger", () => {
		const rules = [
			{
				paramCode: "тип_источника_внутренний",
				paramName: "Тип источника (внутренний)",
				operator: "=",
				valueCode: null,
				valueLabel: "Внутренний",
			},
		];
		expect(typicalWorkRulesMatchSource(rules, { type: "Внутренний" })).toBe(true);
	});

	it("does not match works without triggers", () => {
		expect(typicalWorkRulesMatchSource([], { type: "Внутренний" })).toBe(false);
	});

	it("matches numeric comparison operators", () => {
		const rule = {
			paramCode: "metric_count",
			paramName: "Количество метрик",
			operator: ">=",
			valueCode: "10",
			valueLabel: "10",
		};

		expect(typicalWorkRulesMatchSource([rule], { metric_count: 12 })).toBe(true);
		expect(typicalWorkRulesMatchSource([rule], { metric_count: 8 })).toBe(false);
	});

	it("matches in / not_in operators with value sets", () => {
		const rule = {
			paramCode: "region",
			paramName: "Регион",
			operator: "in",
			valueCode: null,
			valueLabel: null,
			values: [
				{ code: "eu", label: "Европа" },
				{ code: "us", label: "США" },
			],
		};

		expect(typicalWorkRulesMatchSource([rule], { region: "eu" })).toBe(true);
		expect(typicalWorkRulesMatchSource([rule], { region: "Европа" })).toBe(true);
		expect(typicalWorkRulesMatchSource([rule], { region: "asia" })).toBe(false);

		const notIn = { ...rule, operator: "not_in" };
		expect(typicalWorkRulesMatchSource([notIn], { region: "asia" })).toBe(true);
		expect(typicalWorkRulesMatchSource([notIn], { region: "eu" })).toBe(false);
	});

	it("resolves labor any-of coefficient", () => {
		expect(
			resolveLaborAnyOfCoefficient(
				{ flag: "yes" },
				"flag",
				{
					valueCodes: ["yes"],
					valueLabels: ["Да"],
					coeffOn: 2,
					coeffOff: 0.5,
				},
			),
		).toBe(2);
		expect(
			resolveLaborAnyOfCoefficient(
				{ flag: "no" },
				"flag",
				{
					valueCodes: ["yes"],
					valueLabels: ["Да"],
					coeffOn: 2,
					coeffOff: 0.5,
				},
			),
		).toBe(0.5);
	});

	it("resolves labor any-of coefficient for boolean checkbox", () => {
		const anyOf = {
			valueCodes: ["true"],
			valueLabels: ["Да"],
			coeffOn: 1.5,
			coeffOff: 0.5,
		};
		expect(
			resolveLaborAnyOfCoefficient(
				{ field_checkbox: true },
				"field_checkbox",
				anyOf,
				"Чекбокс @ field_checkbox",
			),
		).toBe(1.5);
		expect(
			resolveLaborAnyOfCoefficient(
				{ field_checkbox: false },
				"field_checkbox",
				anyOf,
				"Чекбокс @ field_checkbox",
			),
		).toBe(0.5);
	});

	it("matches boolean checkbox trigger by label and code", () => {
		const rules = [
			{
				paramCode: "field_cb",
				paramName: "Чекбокс @ field_cb",
				operator: "=",
				valueCode: "true",
				valueLabel: "Да",
			},
		];
		expect(typicalWorkRulesMatchSource(rules, { field_cb: true })).toBe(true);
		expect(typicalWorkRulesMatchSource(rules, { field_cb: false })).toBe(false);
		expect(
			typicalWorkRulesMatchSource(
				[{ ...rules[0], operator: "!=" }],
				{ field_cb: false },
			),
		).toBe(true);
	});

	it("resolves CSV trigger aliases to catalog params", () => {
		const catalog = [
			{
				code: "тип_источника_данных",
				values: [
					{ code: "внутренний", label: "Внутренний" },
					{ code: "внешний", label: "Внешний" },
				],
			},
			{
				code: "вид_контроля",
				values: [
					{ code: "кд", label: "КД — Качество модельных данных" },
				],
			},
		];

		expect(
			resolveTriggerStatusCatalogParam(
				{
					paramCode: "тип_источника_внутренний",
					paramName: "Тип источника (внутренний)",
				},
				catalog,
			)?.code,
		).toBe("тип_источника_данных");

		expect(
			resolveTriggerStatusCatalogParam(
				{
					paramCode: "вид_контроля_кд",
					paramName: "Вид контроля: КД",
				},
				catalog,
			)?.code,
		).toBe("вид_контроля");
	});

	it("resolves schema `type` catalog for «Тип системы-источника» trigger", () => {
		const schemaCatalog = [
			{
				code: "type",
				values: [
					{ code: "internal", label: "Внутренний" },
					{ code: "external", label: "Внешний" },
				],
			},
		];

		expect(
			isSourceTypeTriggerParam("тип_системы_источника", "Тип системы-источника"),
		).toBe(true);

		expect(
			resolveTriggerStatusCatalogParam(
				{
					paramCode: "тип_системы_источника",
					paramName: "Тип системы-источника",
				},
				schemaCatalog,
			)?.code,
		).toBe("type");

		expect(
			triggerRuleCatalogGroupKey(
				{
					paramCode: "тип_системы_источника",
					paramName: "Тип системы-источника",
				},
				schemaCatalog,
			),
		).toBe("type");
	});

	it("matches control catalog labels by short code", () => {
		expect(
			catalogValueMatchesTriggerRule(
				{ code: "кд", label: "КД — Качество модельных данных" },
				{
					paramCode: "вид_контроля_кд",
					paramName: "Вид контроля: КД",
					valueCode: "кд",
					valueLabel: "КД",
				},
			),
		).toBe(true);
	});
});
