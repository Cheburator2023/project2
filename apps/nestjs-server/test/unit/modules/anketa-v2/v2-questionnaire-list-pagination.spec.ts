import {
	V2_QUESTIONNAIRE_REGISTRY_PAGE_SIZE,
	filterV2QuestionnairesByRegistryVersionMode,
	type V2QuestionnaireListQuery,
} from "@smart-anketa/api-contract";

describe("v2 questionnaire registry pagination contract", () => {
	it("defaults page size to 50", () => {
		expect(V2_QUESTIONNAIRE_REGISTRY_PAGE_SIZE).toBe(50);
	});

	it("versionMode picks one row per series before paging", () => {
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
				workflowGlobalStatus: "Черновик",
			},
		];
		const actual = filterV2QuestionnairesByRegistryVersionMode(rows, "actual");
		expect(actual.map((r) => r.id)).toEqual(["a2", "b1"]);

		const approved = filterV2QuestionnairesByRegistryVersionMode(
			rows,
			"approved",
		);
		expect(approved.map((r) => r.id)).toEqual(["a1"]);
	});

	it("list query shape accepts page/search/versionMode", () => {
		const query: V2QuestionnaireListQuery = {
			page: 2,
			limit: V2_QUESTIONNAIRE_REGISTRY_PAGE_SIZE,
			search: "иниц",
			versionMode: "actual",
		};
		expect(query.limit).toBe(50);
		expect(query.versionMode).toBe("actual");
	});
});
