import { describe, expect, it } from "vitest";
import { computeFormulaBadge, defaultTermsFormula, evaluateTermsFormula, formatTypicalWorkCoefficientDisplay, shouldShowTypicalWorkCoefficientBreakdown, syncTermsFromTokenFormula, termsToTokenFormula, tokensToTermsFormula, validateTermsFormula, resolveVersionConfigTokenFormula, } from "./v2-work-terms-formula.util";
import { tokensToText } from "./v2-work-formula.util";
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
    it("formats simple coefficient as number and complex as resolved formula", () => {
        const simple = defaultTermsFormula().terms;
        expect(shouldShowTypicalWorkCoefficientBreakdown(simple)).toBe(false);
        expect(formatTypicalWorkCoefficientDisplay({
            terms: simple,
            baseNorm: 5,
            paramCoefficients: {},
            coefficient: 1.25,
        })).toBe("1.25");
        const withParam = tokensToTermsFormula({
            tokens: [
                { kind: "norm" },
                { kind: "param_coeff", paramCode: "p1", paramName: "Сложность" },
            ],
            text: "H × P1",
        }).terms;
        expect(shouldShowTypicalWorkCoefficientBreakdown(withParam)).toBe(true);
        expect(formatTypicalWorkCoefficientDisplay({
            terms: withParam,
            baseNorm: 5,
            paramCoefficients: { p1: 1.2 },
            coefficient: 1.2,
        })).toBe("5 × 1.2");
    });
    it("converts N + constant to additive term and round-trips tokens", () => {
        const source = {
            tokens: [
                { kind: "norm" },
                { kind: "operator", op: "+" },
                { kind: "number", value: 2.5 },
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
    it("converts N - constant to additive term and round-trips tokens", () => {
        const source = {
            tokens: [
                { kind: "norm" },
                { kind: "operator", op: "-" },
                { kind: "number", value: 2.5 },
            ],
            text: "N - 2.5",
        };
        const terms = tokensToTermsFormula(source);
        expect(terms.terms).toHaveLength(2);
        expect(terms.terms[1]?.kind).toBe("additive");
        expect(terms.terms[1]?.baseValue).toBe(-2.5);
        const roundTrip = termsToTokenFormula(terms);
        expect(roundTrip.tokens).toEqual(source.tokens);
        const resolved = resolveVersionConfigTokenFormula(terms, tokensToText(source.tokens));
        expect(resolved.tokens).toEqual(source.tokens);
    });
    it("unwraps parenthesized (N + c) × param into additive and multiplier terms", () => {
        const terms = tokensToTermsFormula({
            tokens: [
                { kind: "paren_open" },
                { kind: "norm" },
                { kind: "operator", op: "+" },
                { kind: "number", value: 5 },
                { kind: "paren_close" },
                { kind: "operator", op: "*" },
                { kind: "param_coeff", paramCode: "p1", paramName: "P1" },
            ],
            text: "(N + 5) × P1",
        });
        expect(terms.terms.length).toBeGreaterThan(1);
        expect(terms.terms.some((t) => t.kind === "additive")).toBe(true);
    });
    it("evaluates (N + c) × param via terms model", () => {
        const formula = {
            tokens: [
                { kind: "paren_open" },
                { kind: "norm" },
                { kind: "operator", op: "+" },
                { kind: "number", value: 5 },
                { kind: "paren_close" },
                { kind: "operator", op: "*" },
                { kind: "param_coeff", paramCode: "p1", paramName: "P1" },
            ],
            text: "(N + 5) × P1",
        };
        const terms = tokensToTermsFormula(formula);
        const value = evaluateTermsFormula({
            terms: terms.terms,
            baseNorm: 20,
            resolveFactorCoeff: () => 1,
        });
        expect(value).toBe(25);
    });
    it("evaluates (N + c) × param with non-unit coefficient", () => {
        const formula = {
            tokens: [
                { kind: "paren_open" },
                { kind: "norm" },
                { kind: "operator", op: "+" },
                { kind: "number", value: 5 },
                { kind: "paren_close" },
                { kind: "operator", op: "*" },
                { kind: "param_coeff", paramCode: "p1", paramName: "P1" },
            ],
            text: "(N + 5) × P1",
        };
        const terms = tokensToTermsFormula(formula);
        const value = evaluateTermsFormula({
            terms: terms.terms,
            baseNorm: 20,
            resolveFactorCoeff: (code) => (code === "p1" ? 2 : 1),
        });
        expect(value).toBe(50);
    });
    it("parses ((N + c) × param) + constant for evaluation and display", () => {
        const tokens = [
            { kind: "paren_open" },
            { kind: "paren_open" },
            { kind: "norm" },
            { kind: "operator", op: "+" },
            { kind: "number", value: 5 },
            { kind: "paren_close" },
            { kind: "operator", op: "*" },
            { kind: "param_coeff", paramCode: "p1", paramName: "P1" },
            { kind: "paren_close" },
            { kind: "operator", op: "+" },
            { kind: "number", value: 11 },
        ];
        const formula = { tokens, text: "((N + 5) × P1) + 11" };
        const terms = tokensToTermsFormula(formula);
        const value = evaluateTermsFormula({
            terms: terms.terms,
            baseNorm: 20,
            resolveFactorCoeff: (code) => (code === "p1" ? 1 : 1),
        });
        expect(value).toBe(36);
        expect(formatTypicalWorkCoefficientDisplay({
            terms: terms.terms,
            baseNorm: 20,
            paramCoefficients: { p1: 1 },
            coefficient: 36 / 20,
        })).not.toBe("20 + 11");
    });
});
