import { describe, expect, it } from "vitest";
import {
	evaluateTriggerFormula,
	hasTypicalWorkTriggersConfigured,
	matchTypicalWorkTriggers,
	validateTriggerFormulaTokens,
} from "./v2-trigger-formula.util";

describe("validateTriggerFormulaTokens", () => {
	it("accepts param AND arch_count", () => {
		expect(
			validateTriggerFormulaTokens([
				{ kind: "param", paramCode: "a", paramName: "A", operator: "=" },
				{ kind: "logic", op: "and" },
				{
					kind: "arch_count",
					archComponentKind: "sourceSystem",
					steps: [{ count: 1, coefficient: 1 }],
				},
			]),
		).toBeNull();
	});

	it("rejects missing operator between operands", () => {
		expect(
			validateTriggerFormulaTokens([
				{ kind: "param", paramCode: "a", paramName: "A", operator: "=" },
				{ kind: "param", paramCode: "b", paramName: "B", operator: "=" },
			]),
		).toMatch(/оператор/);
	});
});

describe("matchTypicalWorkTriggers formula mode", () => {
	it("matches OR between two param tokens", () => {
		const matched = matchTypicalWorkTriggers(
			{
				mode: "formula",
				rules: [],
				triggerFormula: {
					tokens: [
						{
							kind: "param",
							paramCode: "type",
							paramName: "Type",
							operator: "=",
							valueCode: "internal",
							valueLabel: "Internal",
						},
						{ kind: "logic", op: "or" },
						{
							kind: "param",
							paramCode: "type",
							paramName: "Type",
							operator: "=",
							valueCode: "external",
							valueLabel: "External",
						},
					],
					text: "",
				},
			},
			{ type: "external" },
		);
		expect(matched).toBe(true);
	});

	it("reports configured when formula has operands", () => {
		expect(
			hasTypicalWorkTriggersConfigured({
				mode: "formula",
				rules: [],
				triggerFormula: {
					tokens: [
						{
							kind: "param",
							paramCode: "type",
							paramName: "Type",
							operator: "=",
							valueCode: "internal",
							valueLabel: "Internal",
						},
					],
					text: "",
				},
			}),
		).toBe(true);
	});
});

describe("evaluateTriggerFormula", () => {
	it("evaluates grouped OR", () => {
		const result = evaluateTriggerFormula(
			[
				{ kind: "paren_open" },
				{
					kind: "param",
					paramCode: "type",
					paramName: "Type",
					operator: "=",
					valueCode: "a",
					valueLabel: "A",
				},
				{ kind: "logic", op: "or" },
				{
					kind: "param",
					paramCode: "type",
					paramName: "Type",
					operator: "=",
					valueCode: "b",
					valueLabel: "B",
				},
				{ kind: "paren_close" },
			],
			{ source: { type: "b" } },
		);
		expect(result).toBe(true);
	});

	it("keeps paren OR true when left side already matches (no || short-circuit skip)", () => {
		// A ≠ Не требуется И (пилот = Да ИЛИ тип ∈ {Разработка})
		const tokens = [
			{
				kind: "param" as const,
				paramCode: "productionAdditionalReports",
				paramName: "Продуктивизация",
				operator: "!=" as const,
				valueCode: "не_требуется",
				valueLabel: "Не требуется",
			},
			{ kind: "logic" as const, op: "and" as const },
			{ kind: "paren_open" as const },
			{
				kind: "param" as const,
				paramCode: "prePromEval",
				paramName: "Необходимость поддержки проведения пилота",
				operator: "=" as const,
				valueCode: "true",
				valueLabel: "Да",
			},
			{ kind: "logic" as const, op: "or" as const },
			{
				kind: "param" as const,
				paramCode: "workType",
				paramName: "Тип работ",
				operator: "in" as const,
				values: [
					{ code: "Разработка", label: "Разработка" },
					{ code: "Внедрение", label: "Внедрение" },
				],
			},
			{ kind: "paren_close" as const },
		];

		expect(
			evaluateTriggerFormula(tokens, {
				source: {
					productionAdditionalReports: "10",
					prePromEval: true,
					workType: "Разработка",
				},
			}),
		).toBe(true);

		expect(
			evaluateTriggerFormula(tokens, {
				source: {
					productionAdditionalReports: "10",
					prePromEval: true,
					workType: "Сопровождение",
				},
			}),
		).toBe(true);

		expect(
			evaluateTriggerFormula(tokens, {
				source: {
					productionAdditionalReports: "10",
					prePromEval: false,
					workType: "Разработка",
				},
			}),
		).toBe(true);
	});
});
