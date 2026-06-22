import { describe, expect, it } from "vitest";
import {
	evaluateTargetVisible,
	isDependentTarget,
	rulesForTarget,
	type ParameterDependencyDraft,
} from "./parameterDependenciesStorage";

describe("parameterDependenciesStorage", () => {
	const draft: ParameterDependencyDraft = {
		targets: [
			{
				targetParamCode: "target",
				rules: [
					{
						id: "1",
						sourceParamCode: "source",
						operator: "=",
						valueCode: "yes",
						valueLabel: "Да",
					},
				],
			},
		],
	};

	it("detects dependent targets", () => {
		expect(isDependentTarget(draft, "target")).toBe(true);
		expect(isDependentTarget(draft, "other")).toBe(false);
	});

	it("evaluates visibility with AND semantics", () => {
		const rules = rulesForTarget(draft, "target");
		expect(evaluateTargetVisible(rules, { source: "yes" })).toBe(true);
		expect(evaluateTargetVisible(rules, { source: "no" })).toBe(false);
	});
});
