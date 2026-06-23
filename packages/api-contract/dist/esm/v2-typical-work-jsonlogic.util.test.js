import { describe, expect, it } from "vitest";
import { compileTypicalWorkCalculationLogic, compileTypicalWorkTriggerRulesToJsonLogic, compileWorkFormulaTokensToJsonLogic, evaluateTypicalWorkCalculation, evaluateTypicalWorkJsonLogicValue, evaluateTypicalWorkResultJsonLogic, previewTypicalWorkCalculation, } from "./v2-typical-work-jsonlogic.util";
import { defaultWorkFormula, defaultWorkRounding } from "./v2-typical-work.types";
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
    it("evaluates result JsonLogic with roundStep like token engine", () => {
        const parsed = parseWorkFormulaText("N × P[x]");
        const logic = compileTypicalWorkCalculationLogic({
            formula: { tokens: parsed.tokens, text: "N × P[x]" },
            rounding: defaultWorkRounding(),
            rules: [],
        });
        expect(logic).not.toBeNull();
        const viaJsonLogic = evaluateTypicalWorkResultJsonLogic(logic, { norm: 1.25, paramCoefficients: { x: 0.5 } }, "N × P[x]");
        const viaTokens = previewWorkFormula({ tokens: parsed.tokens, text: "N × P[x]" }, defaultWorkRounding(), { norm: 1.25, paramCoefficients: { x: 0.5 } });
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
            logic: logic,
            rules,
            source: { type: "Внешний" },
            norm: 1,
            paramCoefficients: {},
            rounding: defaultWorkRounding(),
        });
        expect(out.included).toBe(false);
    });
    it("evaluates roundStep op", () => {
        const result = evaluateTypicalWorkJsonLogicValue({ roundStep: [{ var: "norm" }, "CEIL", 0.1] }, { norm: 1.25 });
        expect(result).toBeCloseTo(1.3, 5);
    });
});
