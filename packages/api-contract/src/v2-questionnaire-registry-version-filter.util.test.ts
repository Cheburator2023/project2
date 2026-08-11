import { describe, expect, it } from "vitest";
import { filterV2QuestionnairesByRegistryVersionMode } from "./v2-questionnaire-registry-version-filter.util";

describe("filterV2QuestionnairesByRegistryVersionMode", () => {
	const rows = [
		{
			id: "a1",
			seriesId: "s1",
			version: "1",
			status: "inactive",
			workflowGlobalStatus: "Утверждена",
		},
		{
			id: "a2",
			seriesId: "s1",
			version: "2",
			status: "active",
			workflowGlobalStatus: "Черновик",
		},
		{
			id: "b1",
			seriesId: "s2",
			version: "1",
			status: "active",
			workflowGlobalStatus: "Утверждена",
		},
		{
			id: "c1",
			seriesId: "s3",
			version: "1",
			status: "active",
			workflowGlobalStatus: "Черновик",
		},
		{
			id: "d1",
			seriesId: "s4",
			version: "1",
			status: "inactive",
			workflowGlobalStatus: "Утверждена",
		},
	];

	it("actual mode picks only active versions (one per series)", () => {
		const out = filterV2QuestionnairesByRegistryVersionMode(rows, "actual");
		expect(out.map((r) => r.id).sort()).toEqual(["a2", "b1", "c1"]);
	});

	it("approved mode picks latest approved including inactive historical slices", () => {
		const out = filterV2QuestionnairesByRegistryVersionMode(rows, "approved");
		expect(out.map((r) => r.id).sort()).toEqual(["a1", "b1", "d1"]);
	});
});
