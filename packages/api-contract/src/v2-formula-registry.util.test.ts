import { describe, expect, it } from "vitest";
import { extractFormulaRegistryLinks, formatFormulaRegistryParamLabel } from "./v2-formula-registry.util";

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

describe("formatFormulaRegistryParamLabel", () => {
	it("shows name with code when both differ", () => {
		expect(formatFormulaRegistryParamLabel("field_abc", "Количество")).toBe(
			"Количество (field_abc)",
		);
	});

	it("shows only code when name is missing", () => {
		expect(formatFormulaRegistryParamLabel("field_abc", null)).toBe("field_abc");
	});
});
