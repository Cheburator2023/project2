"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const v2_trigger_formula_util_1 = require("./v2-trigger-formula.util");
(0, vitest_1.describe)("validateTriggerFormulaTokens", () => {
    (0, vitest_1.it)("accepts param AND arch_count", () => {
        (0, vitest_1.expect)((0, v2_trigger_formula_util_1.validateTriggerFormulaTokens)([
            { kind: "param", paramCode: "a", paramName: "A", operator: "=" },
            { kind: "logic", op: "and" },
            {
                kind: "arch_count",
                archComponentKind: "sourceSystem",
                steps: [{ count: 1, coefficient: 1 }],
            },
        ])).toBeNull();
    });
    (0, vitest_1.it)("rejects missing operator between operands", () => {
        (0, vitest_1.expect)((0, v2_trigger_formula_util_1.validateTriggerFormulaTokens)([
            { kind: "param", paramCode: "a", paramName: "A", operator: "=" },
            { kind: "param", paramCode: "b", paramName: "B", operator: "=" },
        ])).toMatch(/оператор/);
    });
});
(0, vitest_1.describe)("matchTypicalWorkTriggers formula mode", () => {
    (0, vitest_1.it)("matches OR between two param tokens", () => {
        const matched = (0, v2_trigger_formula_util_1.matchTypicalWorkTriggers)({
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
        }, { type: "external" });
        (0, vitest_1.expect)(matched).toBe(true);
    });
    (0, vitest_1.it)("reports configured when formula has operands", () => {
        (0, vitest_1.expect)((0, v2_trigger_formula_util_1.hasTypicalWorkTriggersConfigured)({
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
        })).toBe(true);
    });
});
(0, vitest_1.describe)("evaluateTriggerFormula", () => {
    (0, vitest_1.it)("evaluates grouped OR", () => {
        const result = (0, v2_trigger_formula_util_1.evaluateTriggerFormula)([
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
        ], { source: { type: "b" } });
        (0, vitest_1.expect)(result).toBe(true);
    });
});
