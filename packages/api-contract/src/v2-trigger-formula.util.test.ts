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
});
