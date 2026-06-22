import { describe, expect, it } from "vitest";
import {
	applyWorkRounding,
	evaluateWorkFormula,
	isParamUsedInFormula,
	markFormulaParamInvalid,
	parseWorkFormulaText,
	previewWorkFormula,
	validateWorkFormulaTokens,
} from "./v2-work-formula.util";
import { defaultWorkFormula, defaultWorkRounding } from "./v2-typical-work.types";

describe("v2-work-formula.util", () => {
	it("parses N × P[param]", () => {
		const parsed = parseWorkFormulaText("N × P[Сложность]");
		expect(parsed.error).toBeNull();
		expect(parsed.tokens).toHaveLength(3);
	});

	it("evaluates norm only", () => {
		const formula = defaultWorkFormula();
		const result = evaluateWorkFormula(formula, { norm: 2, paramCoefficients: {} });
		expect(result.value).toBe(2);
		expect(result.error).toBeNull();
	});

	it("evaluates N × coeff with rounding up", () => {
		const parsed = parseWorkFormulaText("N × P[x]");
		const result = previewWorkFormula(
			{ tokens: parsed.tokens, text: "N × P[x]" },
			defaultWorkRounding(),
			{ norm: 1.25, paramCoefficients: { x: 0.5 } },
		);
		expect(result.value).toBeCloseTo(0.7, 5);
		expect(result.error).toBeNull();
	});

	it("rejects unbalanced parens", () => {
		const parsed = parseWorkFormulaText("( N × 2");
		expect(parsed.error).toMatch(/скобк/i);
	});

	it("applyWorkRounding NONE keeps raw value", () => {
		expect(applyWorkRounding(1.23, { mode: "NONE", step: null })).toBe(1.23);
	});

	it("validateWorkFormulaTokens catches double operator", () => {
		const err = validateWorkFormulaTokens([
			{ kind: "norm" },
			{ kind: "operator", op: "+" },
			{ kind: "operator", op: "+" },
			{ kind: "number", value: 1 },
		]);
		expect(err).toMatch(/оператор/i);
	});

	it("marks removed labor param invalid and blocks preview", () => {
		const tokens = markFormulaParamInvalid(
			[
				{ kind: "norm" },
				{ kind: "operator", op: "*" },
				{ kind: "param_coeff", paramCode: "x", paramName: "Сложность" },
			],
			"x",
		);
		expect(isParamUsedInFormula(tokens, "x")).toBe(false);
		expect(
			validateWorkFormulaTokens(tokens, {
				allowedParamCodes: new Set<string>(),
				allowInvalidParamRefs: true,
			}),
		).toBeNull();
		const result = evaluateWorkFormula(
			{ tokens, text: "N × P[Сложность]?" },
			{ norm: 1, paramCoefficients: {} },
		);
		expect(result.error).toMatch(/удалён/i);
	});
});
