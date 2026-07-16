"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const v2_formula_registry_util_1 = require("./v2-formula-registry.util");
(0, vitest_1.describe)("extractFormulaRegistryLinks", () => {
    (0, vitest_1.it)("collects unique param and work refs", () => {
        const result = (0, v2_formula_registry_util_1.extractFormulaRegistryLinks)([
            { kind: "norm" },
            { kind: "param_coeff", paramCode: "field_a", paramName: "A" },
            { kind: "param_coeff", paramCode: "field_a", paramName: "A" },
            { kind: "param_anyof", paramCode: "field_b", paramName: "B" },
            { kind: "work_ref", assignmentId: "assign-1", workName: "Работа B" },
        ]);
        (0, vitest_1.expect)(result.paramRefs).toEqual([
            {
                paramCode: "field_a",
                paramName: "A",
                kind: "param_coeff",
                invalid: undefined,
            },
            {
                paramCode: "field_b",
                paramName: "B",
                kind: "param_anyof",
                invalid: undefined,
            },
        ]);
        (0, vitest_1.expect)(result.workRefs).toEqual([
            {
                assignmentId: "assign-1",
                workName: "Работа B",
                invalid: undefined,
            },
        ]);
        (0, vitest_1.expect)(result.hasInvalidRefs).toBe(false);
    });
    (0, vitest_1.it)("marks invalid refs", () => {
        const result = (0, v2_formula_registry_util_1.extractFormulaRegistryLinks)([
            { kind: "param_coeff", paramCode: "old", invalid: true },
            { kind: "work_ref", assignmentId: "gone", invalid: true },
        ]);
        (0, vitest_1.expect)(result.hasInvalidRefs).toBe(true);
    });
});
(0, vitest_1.describe)("assessFormulaRegistryLinks", () => {
    (0, vitest_1.it)("clears stale invalid flag when labor param matches by alias", () => {
        const result = (0, v2_formula_registry_util_1.assessFormulaRegistryLinks)([
            { kind: "norm" },
            {
                kind: "param_coeff",
                paramCode: "field_x",
                paramName: "field_x",
                invalid: true,
            },
        ], {
            laborParams: [
                {
                    paramCode: "сложность_реализации",
                    paramName: "Сложность реализации @ field_x|сложность_реализации",
                },
            ],
        });
        (0, vitest_1.expect)(result.hasInvalidRefs).toBe(false);
        (0, vitest_1.expect)(result.paramRefs[0]?.invalid).toBeUndefined();
    });
    (0, vitest_1.it)("marks missing labor block as broken even without stale invalid flag", () => {
        const result = (0, v2_formula_registry_util_1.assessFormulaRegistryLinks)([
            {
                kind: "param_coeff",
                paramCode: "field_missing",
                paramName: "field_missing",
            },
        ], { laborParams: [] });
        (0, vitest_1.expect)(result.hasInvalidRefs).toBe(true);
    });
});
(0, vitest_1.describe)("formatFormulaRegistryParamLabel", () => {
    (0, vitest_1.it)("shows name with code when both differ", () => {
        (0, vitest_1.expect)((0, v2_formula_registry_util_1.formatFormulaRegistryParamLabel)("field_abc", "Количество")).toBe("Количество (field_abc)");
    });
    (0, vitest_1.it)("shows only code when name is missing", () => {
        (0, vitest_1.expect)((0, v2_formula_registry_util_1.formatFormulaRegistryParamLabel)("field_abc", null)).toBe("field_abc");
    });
});
