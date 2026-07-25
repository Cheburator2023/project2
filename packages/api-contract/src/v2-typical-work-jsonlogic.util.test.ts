import { describe, expect, it } from "vitest";
import {
	buildTypicalWorkFormulaBreakdown,
	compileCalculationLogicFromVersionConfig,
	compileStoredTypicalWorkResultLogic,
	compileTypicalWorkCalculationLogic,
	compileTypicalWorkTriggerRulesToJsonLogic,
	compileWorkFormulaTokensToJsonLogic,
	computeTypicalWorkFormulaTotal,
	evaluateTypicalWorkCalculation,
	evaluateTypicalWorkJsonLogicValue,
	evaluateTypicalWorkResultJsonLogic,
	needsCalculationLogicBackfill,
	previewTypicalWorkCalculation,
} from "./v2-typical-work-jsonlogic.util";
import { defaultWorkFormula, defaultWorkRounding } from "./v2-typical-work.types";
import { defaultBaseNormTerm, tokensToTermsFormula } from "./v2-work-terms-formula.util";
import { parseWorkFormulaText, previewWorkFormula } from "./v2-work-formula.util";

describe("v2-typical-work-jsonlogic.util", () => {
	it("compiles N × P[x] to JsonLogic", () => {
		const parsed = parseWorkFormulaText("N × P[Сложность]");
		const jl = compileWorkFormulaTokensToJsonLogic(parsed.tokens);
		expect(jl).toEqual({
			"*": [{ var: "norm" }, { var: "coeff.Сложность" }],
		});
	});

	it("compiles triggers to and-chain", () => {
		const jl = compileTypicalWorkTriggerRulesToJsonLogic([
			{
				paramCode: "type",
				paramName: "Тип источника",
				operator: "=",
				valueCode: null,
				valueLabel: "Внутренний",
			},
			{
				paramCode: "count",
				paramName: "Количество",
				operator: ">=",
				valueCode: null,
				valueLabel: "3",
			},
		]);
		expect(jl).toEqual({
			and: [
				{
					"==": [{ typicalWorkField: ["type", "Тип источника"] }, "Внутренний"],
				},
				{ ">=": [{ typicalWorkField: ["count", "Количество"] }, "3"] },
			],
		});
	});

	it("compiles arch-count-only trigger without false param AND", () => {
		const jl = compileTypicalWorkTriggerRulesToJsonLogic([], {
			kind: "modelService",
			steps: [{ count: 1, coefficient: 1 }],
			combinator: "and",
		});
		expect(jl).toEqual({
			archCountTrigger: ["modelService", [{ count: 1, coefficient: 1 }]],
		});
	});

	it("evaluates result JsonLogic with roundStep like token engine", () => {
		const parsed = parseWorkFormulaText("N × P[x]");
		const logic = compileTypicalWorkCalculationLogic({
			formula: { tokens: parsed.tokens, text: "N × P[x]" },
			rounding: defaultWorkRounding(),
			rules: [],
		});
		expect(logic).not.toBeNull();

		const viaJsonLogic = evaluateTypicalWorkResultJsonLogic(
			logic!,
			{ norm: 1.25, paramCoefficients: { x: 0.5 } },
			"N × P[x]",
		);
		const viaTokens = previewWorkFormula(
			{ tokens: parsed.tokens, text: "N × P[x]" },
			defaultWorkRounding(),
			{ norm: 1.25, paramCoefficients: { x: 0.5 } },
		);

		expect(viaJsonLogic.error).toBeNull();
		expect(viaJsonLogic.value).toBeCloseTo(viaTokens.value ?? 0, 5);
	});

	it("previewTypicalWorkCalculation falls back without stored logic", () => {
		const formula = defaultWorkFormula();
		const result = previewTypicalWorkCalculation(null, {
			formula,
			rounding: defaultWorkRounding(),
		}, { norm: 2, paramCoefficients: {} });
		expect(result.value).toBe(2);
	});

	it("runtime include rejects when triggers do not match", () => {
		const rules = [
			{
				paramCode: "type",
				paramName: "Тип",
				operator: "=",
				valueCode: null,
				valueLabel: "Внутренний",
			},
		];
		const logic = compileTypicalWorkCalculationLogic({
			formula: defaultWorkFormula(),
			rounding: defaultWorkRounding(),
			rules,
		});
		expect(logic).not.toBeNull();

		const out = evaluateTypicalWorkCalculation({
			logic: logic!,
			rules,
			source: { type: "Внешний" },
			norm: 1,
			paramCoefficients: {},
			rounding: defaultWorkRounding(),
		});
		expect(out.included).toBe(false);
	});

	it("evaluates roundStep op", () => {
		const result = evaluateTypicalWorkJsonLogicValue(
			{ roundStep: [{ var: "norm" }, "CEIL", 0.1] },
			{ norm: 1.25 },
		);
		expect(result).toBeCloseTo(1.3, 5);
	});

	it("compiles version_config formula when calculationLogic is missing", () => {
		const formula = defaultWorkFormula();
		const compiled = compileCalculationLogicFromVersionConfig({
			formula: formula.tokens,
			formulaText: formula.text,
			roundingMode: "NONE",
			roundingStep: null,
		});
		expect(compiled?.version).toBe(1);
		expect(compiled?.result).toBeTruthy();
		expect(needsCalculationLogicBackfill(null)).toBe(true);
		expect(needsCalculationLogicBackfill(compiled)).toBe(false);
	});

	it("computeTypicalWorkFormulaTotal prefers token formula over simplified terms", () => {
		const parsed = parseWorkFormulaText("(N + 5) × коэф(p1)");
		expect(parsed.error).toBeNull();
		const calculationLogic = compileStoredTypicalWorkResultLogic(
			{ tokens: parsed.tokens, text: "(N + 5) × коэф(p1)" },
			defaultWorkRounding(),
		);
		const brokenTerms = {
			version: 2 as const,
			terms: [defaultBaseNormTerm()],
			text: "H",
		};
		const total = computeTypicalWorkFormulaTotal({
			calculationLogic,
			formula: brokenTerms,
			formulaText: "(N + 5) × коэф(p1)",
			terms: brokenTerms,
			rounding: defaultWorkRounding(),
			norm: 20,
			paramCoefficients: { p1: 1 },
			resolveFactorCoeff: (code) => (code === "p1" ? 1 : 1),
		});
		expect(total).toBe(25);
	});

	it("compileCalculationLogicFromVersionConfig uses formulaText when formula is terms v2", () => {
		const brokenTerms = {
			version: 2 as const,
			terms: [defaultBaseNormTerm()],
			text: "H",
		};
		const compiled = compileCalculationLogicFromVersionConfig({
			formula: brokenTerms,
			formulaText: "(N + 5) × коэф(p1)",
			roundingMode: "NONE",
			roundingStep: null,
		});
		expect(compiled?.version).toBe(1);
		const result = evaluateTypicalWorkResultJsonLogic(
			compiled!,
			{ norm: 20, paramCoefficients: { p1: 1 } },
			"(N + 5) × коэф(p1)",
		);
		expect(result.value).toBe(25);
	});

	it("computeTypicalWorkFormulaTotal ignores stale norm-only calculationLogic", () => {
		const staleLogic = compileStoredTypicalWorkResultLogic(
			defaultWorkFormula(),
			defaultWorkRounding(),
		);
		const brokenTerms = {
			version: 2 as const,
			terms: [defaultBaseNormTerm()],
			text: "H",
		};
		const total = computeTypicalWorkFormulaTotal({
			calculationLogic: staleLogic,
			formula: brokenTerms,
			formulaText: "(N + 5) × коэф(p1)",
			terms: brokenTerms,
			rounding: defaultWorkRounding(),
			norm: 20,
			paramCoefficients: { p1: 1 },
			resolveFactorCoeff: (code) => (code === "p1" ? 1 : 1),
		});
		expect(total).toBe(25);
	});

	it("computeTypicalWorkFormulaTotal evaluates ((N + c) × param) + constant", () => {
		const formulaText = "((N + 5) × коэф(p1)) + 11";
		const parsed = parseWorkFormulaText(formulaText);
		expect(parsed.error).toBeNull();
		const terms = tokensToTermsFormula({
			tokens: parsed.tokens,
			text: formulaText,
		});
		const total = computeTypicalWorkFormulaTotal({
			calculationLogic: null,
			formula: terms,
			formulaText,
			terms,
			rounding: defaultWorkRounding(),
			norm: 20,
			paramCoefficients: { p1: 1 },
			resolveFactorCoeff: (code) => (code === "p1" ? 1 : 1),
		});
		expect(total).toBe(36);
	});

	it("buildTypicalWorkFormulaBreakdown lists real coefficient values", () => {
		const formulaText = "N × коэф(p1)";
		const parsed = parseWorkFormulaText(formulaText);
		expect(parsed.error).toBeNull();
		const terms = tokensToTermsFormula({
			tokens: parsed.tokens,
			text: formulaText,
		});
		const breakdown = buildTypicalWorkFormulaBreakdown({
			formula: terms,
			formulaText,
			terms,
			rounding: defaultWorkRounding(),
			norm: 40,
			paramCoefficients: { p1: 1.5 },
			paramNames: {
				p1: "Сложность реализации @ field_46LcNfWo|сложность_реализации",
			},
			resolveFactorCoeff: (code) => (code === "p1" ? 1.5 : 1),
			coefficient: 1.5,
			total: 60,
		});
		expect(breakdown.symbolic).toBe("N × Сложность реализации");
		expect(breakdown.expanded).toBe("40 × 1.5 = 60");
		expect(breakdown.factors).toEqual([
			{ paramCode: "p1", paramName: "Сложность реализации", value: 1.5 },
		]);
		expect(breakdown.total).toBe(60);
	});
});
