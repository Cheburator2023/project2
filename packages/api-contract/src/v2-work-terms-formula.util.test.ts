import { describe, expect, it } from "vitest";
import {
	computeFormulaBadge,
	defaultTermsFormula,
	evaluateTermsFormula,
	syncTermsFromTokenFormula,
	termsToTokenFormula,
	tokensToTermsFormula,
	validateTermsFormula,
} from "./v2-work-terms-formula.util";

describe("v2-work-terms-formula", () => {
	it("requires exactly one base norm term", () => {
		expect(validateTermsFormula([])).toMatch(/базовый/i);
		expect(validateTermsFormula(defaultTermsFormula().terms)).toBeNull();
	});

	it("converts legacy token formula to terms", () => {
		const terms = tokensToTermsFormula({
			tokens: [{ kind: "norm" }, { kind: "param_coeff", paramCode: "p1", paramName: "P1" }],
			text: "H × P1",
		});
		expect(terms.terms).toHaveLength(2);
		expect(computeFormulaBadge(terms.terms)).toBe("multiplier");
	});

	it("evaluates multiplier terms", () => {
		const terms = tokensToTermsFormula({
			tokens: [{ kind: "norm" }, { kind: "param_coeff", paramCode: "p1" }],
			text: "H",
		});
		const value = evaluateTermsFormula({
			terms: terms.terms,
			baseNorm: 10,
			resolveFactorCoeff: (code) => (code === "p1" ? 2 : 1),
		});
		expect(value).toBe(20);
	});

	it("converts N + constant to additive term and round-trips tokens", () => {
		const source = {
			tokens: [
				{ kind: "norm" as const },
				{ kind: "operator" as const, op: "+" as const },
				{ kind: "number" as const, value: 2.5 },
			],
			text: "N + 2.5",
		};
		const terms = tokensToTermsFormula(source);
		expect(terms.terms).toHaveLength(2);
		expect(terms.terms[1]?.kind).toBe("additive");
		expect(terms.terms[1]?.baseValue).toBe(2.5);

		const roundTrip = termsToTokenFormula(terms);
		expect(roundTrip.tokens).toEqual(source.tokens);

		const synced = syncTermsFromTokenFormula(source);
		expect(synced.terms[1]?.baseValue).toBe(2.5);
	});
});
