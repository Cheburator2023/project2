import { evaluateLogicValidationRules } from "../../../../src/modules/anketa-v2/services/v2-logic-validation";

describe("evaluateLogicValidationRules", () => {
	it("emits issue when condition is false", () => {
		const issues = evaluateLogicValidationRules(
			[
				{
					id: "r1",
					kind: "validation",
					targetPath: "/foo/bar",
					dependencies: [],
					condition: { "==": [{ var: "foo.bar" }, 1] },
					payload: { message: "bar must be 1" },
				},
			],
			{ foo: { bar: 0 } },
		);

		expect(issues).toHaveLength(1);
		expect(issues[0]?.code).toBe("logic.validation.r1");
	});

	it("passes when condition is true", () => {
		const issues = evaluateLogicValidationRules(
			[
				{
					id: "r1",
					kind: "validation",
					targetPath: "/foo/bar",
					dependencies: [],
					condition: { "==": [{ var: "foo.bar" }, 1] },
					payload: { message: "bar must be 1" },
				},
			],
			{ foo: { bar: 1 } },
		);

		expect(issues).toHaveLength(0);
	});
});
