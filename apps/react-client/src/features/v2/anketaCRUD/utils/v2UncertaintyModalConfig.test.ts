import { describe, expect, it } from "vitest";
import { V2_UNCERTAINTY_RISK_GROUP_LABELS } from "@smart-anketa/api-contract";
import { buildUncertaintyModalRiskGroups } from "./v2UncertaintyModalConfig";

describe("v2UncertaintyModalConfig", () => {
	it("uses full risk labels from the schema registry", () => {
		const groups = buildUncertaintyModalRiskGroups();
		expect(groups).toHaveLength(11);
		expect(groups[0]?.label).toBe(
			V2_UNCERTAINTY_RISK_GROUP_LABELS.businessComplexity,
		);
		expect(groups[3]?.label).toBe(
			V2_UNCERTAINTY_RISK_GROUP_LABELS.laborCostIncrease,
		);
		expect(groups[3]?.label).toContain("проработки требований на этапе планирования");
	});
});
