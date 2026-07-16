import { describe, expect, it } from "vitest";
import { assessFormulaRegistryLinks, extractFormulaRegistryLinks, formatFormulaRegistryParamLabel, } from "./v2-formula-registry.util";
describe("extractFormulaRegistryLinks", () => {
    it("collects unique param and work refs", () => {
        const result = extractFormulaRegistryLinks([
            { kind: "norm" },
            { kind: "param_coeff", paramCode: "field_a", paramName: "A" },
            { kind: "param_coeff", paramCode: "field_a", paramName: "A" },
            { kind: "param_anyof", paramCode: "field_b", paramName: "B" },
            { kind: "work_ref", assignmentId: "assign-1", workName: "Работа B" },
        ]);
        expect(result.paramRefs).toEqual([
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
        expect(result.workRefs).toEqual([
            {
                assignmentId: "assign-1",
                workName: "Работа B",
                invalid: undefined,
            },
        ]);
        expect(result.hasInvalidRefs).toBe(false);
    });
    it("marks invalid refs", () => {
        const result = extractFormulaRegistryLinks([
            { kind: "param_coeff", paramCode: "old", invalid: true },
            { kind: "work_ref", assignmentId: "gone", invalid: true },
        ]);
        expect(result.hasInvalidRefs).toBe(true);
    });
});
describe("assessFormulaRegistryLinks", () => {
    it("clears stale invalid flag when labor param matches by alias", () => {
        const result = assessFormulaRegistryLinks([
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
        expect(result.hasInvalidRefs).toBe(false);
        expect(result.paramRefs[0]?.invalid).toBeUndefined();
    });
    it("marks missing labor block as broken even without stale invalid flag", () => {
        const result = assessFormulaRegistryLinks([
            {
                kind: "param_coeff",
                paramCode: "field_missing",
                paramName: "field_missing",
            },
        ], { laborParams: [] });
        expect(result.hasInvalidRefs).toBe(true);
    });
});
describe("formatFormulaRegistryParamLabel", () => {
    it("shows name with code when both differ", () => {
        expect(formatFormulaRegistryParamLabel("field_abc", "Количество")).toBe("Количество (field_abc)");
    });
    it("shows only code when name is missing", () => {
        expect(formatFormulaRegistryParamLabel("field_abc", null)).toBe("field_abc");
    });
});
