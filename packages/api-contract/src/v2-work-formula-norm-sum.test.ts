import { describe, expect, it } from "vitest";
import {
	computeTypicalWorkFormulaTotal,
	previewTypicalWorkCalculation,
} from "./v2-typical-work-jsonlogic.util";
import { defaultWorkRounding } from "./v2-typical-work.types";
import {
	evaluateWorkFormula,
	parseWorkFormulaText,
} from "./v2-work-formula.util";
import {
	evaluateTermsFormula,
	tokensToTermsFormula,
} from "./v2-work-terms-formula.util";

const formulaText =
	"N * коэф(field_UEzs5Q87) + N * архкоэф(Система-источник; 1=1; 2=1; 3=1; 4=1; 5=1; 6=1,2; 7=1,4; 8=1,6; 9=1,8; 10=2,0; 11=2,2; 12=2,4; 13=2,6; 14=2,8; 15=3,0; 16=3,2; 17=3,4; 18=3,6; 19=3,8; 20=4,0)";

describe("Этап 211 formula N*P + N*arch", () => {
	const formData = {
		detailInfo: {
			sourceSystems: [{ name: "A", controlType: "x" }],
		},
	};

	it("token engine evaluates to 44 when both coefficients are 1", () => {
		const parsed = parseWorkFormulaText(formulaText);
		expect(parsed.error).toBeNull();
		const evaled = evaluateWorkFormula(
			{ tokens: parsed.tokens, text: formulaText },
			{
				norm: 22,
				paramCoefficients: { field_UEzs5Q87: 1 },
				formData,
			},
		);
		expect(evaled.value).toBe(44);
	});

	it("terms model keeps N×arch (not +1) and evaluates to 44", () => {
		const parsed = parseWorkFormulaText(formulaText);
		const terms = tokensToTermsFormula({
			tokens: parsed.tokens,
			text: formulaText,
		});
		const additive = terms.terms.find((t) => t.kind === "additive");
		expect(additive?.scaleByNorm).toBe(true);
		expect(additive?.coeffTokens?.some((t) => t.kind === "arch_count_coeff")).toBe(
			true,
		);

		const termsVal = evaluateTermsFormula({
			terms: terms.terms,
			baseNorm: 22,
			resolveFactorCoeff: () => 1,
			formData,
		});
		expect(termsVal).toBe(44);
	});

	it("computeTypicalWorkFormulaTotal fills missing paramCoefficients via resolver", () => {
		const parsed = parseWorkFormulaText(formulaText);
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
			norm: 22,
			paramCoefficients: {},
			formData,
			resolveFactorCoeff: () => 1,
		});
		expect(total).toBe(44);

		const preview = previewTypicalWorkCalculation(
			null,
			{
				formula: { tokens: parsed.tokens, text: formulaText },
				rounding: defaultWorkRounding(),
			},
			{
				norm: 22,
				paramCoefficients: { field_UEzs5Q87: 1 },
				formData,
			},
		);
		expect(preview.value).toBe(44);
		expect(preview.expanded).toContain("22");
	});
});
