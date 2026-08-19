import { describe, expect, it } from "vitest";
import {
	expandV2QuestionnaireRegistrySeriesMembers,
	filterV2QuestionnairesByRegistryVersionMode,
} from "./v2-questionnaire-registry-version-filter.util";

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

	it("actual mode prefers active version, keeps inactive-only series", () => {
		const out = filterV2QuestionnairesByRegistryVersionMode(rows, "actual");
		expect(out.map((r) => r.id).sort()).toEqual(["a2", "b1", "c1", "d1"]);
	});

	it("actual mode keeps a deactivated approved questionnaire in the registry", () => {
		const out = filterV2QuestionnairesByRegistryVersionMode(
			[
				{
					id: "gone-if-filtered",
					seriesId: "only-inactive",
					version: "1",
					status: "inactive",
					workflowGlobalStatus: "Утверждена",
				},
			],
			"actual",
		);
		expect(out.map((r) => r.id)).toEqual(["gone-if-filtered"]);
	});

	it("actual mode still hides archived-only series", () => {
		const out = filterV2QuestionnairesByRegistryVersionMode(
			[
				{
					id: "arch",
					seriesId: "archived",
					version: "1",
					status: "archived",
					workflowGlobalStatus: "Утверждена",
				},
			],
			"actual",
		);
		expect(out).toEqual([]);
	});

	it("approved mode picks latest approved including inactive historical slices", () => {
		const out = filterV2QuestionnairesByRegistryVersionMode(rows, "approved");
		expect(out.map((r) => r.id).sort()).toEqual(["a1", "b1", "d1"]);
	});
});

describe("expandV2QuestionnaireRegistrySeriesMembers", () => {
	it("returns all versions of paginated series, including inactive slices", () => {
		const all = [
			{
				id: "a1",
				seriesId: "s1",
				version: "1",
				status: "inactive",
			},
			{
				id: "a2",
				seriesId: "s1",
				version: "2",
				status: "inactive",
			},
			{
				id: "a3",
				seriesId: "s1",
				version: "3",
				status: "active",
			},
			{
				id: "b1",
				seriesId: "s2",
				version: "1",
				status: "active",
			},
		];
		const picked = [all[2]!, all[3]!];
		expect(
			expandV2QuestionnaireRegistrySeriesMembers(all, picked).map((r) => r.id),
		).toEqual(["a1", "a2", "a3", "b1"]);
	});
});
