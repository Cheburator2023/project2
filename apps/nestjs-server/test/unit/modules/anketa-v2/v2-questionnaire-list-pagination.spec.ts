import {
	V2_QUESTIONNAIRE_REGISTRY_PAGE_SIZE,
	expandV2QuestionnaireRegistrySeriesMembers,
	filterV2QuestionnairesByRegistryVersionMode,
	summarizeV2QuestionnaireDeleteSelection,
	type V2QuestionnaireListQuery,
} from "@smart-anketa/api-contract";

describe("v2 questionnaire registry pagination contract", () => {
	it("defaults page size to 50", () => {
		expect(V2_QUESTIONNAIRE_REGISTRY_PAGE_SIZE).toBe(50);
	});

	it("versionMode paging keeps all versions of the series on the page", () => {
		const rows = [
			{
				id: "a1",
				seriesId: "s1",
				version: "1",
				status: "inactive",
				workflowGlobalStatus: "Черновик",
			},
			{
				id: "a2",
				seriesId: "s1",
				version: "2",
				status: "inactive",
				workflowGlobalStatus: "Черновик",
			},
			{
				id: "a3",
				seriesId: "s1",
				version: "3",
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
		expect(actual.map((r) => r.id)).toEqual(["a3", "b1"]);
		expect(
			expandV2QuestionnaireRegistrySeriesMembers(rows, actual).map((r) => r.id),
		).toEqual(["a1", "a2", "a3", "b1"]);
	});

	it("actual mode paging includes a series with only an inactive approved slice", () => {
		const rows = [
			{
				id: "d1",
				seriesId: "s4",
				version: "1",
				status: "inactive",
				workflowGlobalStatus: "Утверждена",
			},
		];
		const actual = filterV2QuestionnairesByRegistryVersionMode(rows, "actual");
		expect(actual.map((r) => r.id)).toEqual(["d1"]);
	});

	it("list query shape accepts page/search/versionMode and ag-grid models", () => {
		const query: V2QuestionnaireListQuery = {
			page: 2,
			limit: V2_QUESTIONNAIRE_REGISTRY_PAGE_SIZE,
			search: "иниц",
			versionMode: "actual",
			filterModel: { status: { filterType: "set", values: ["Активная"] } },
			sortModel: [{ colId: "createdAt", sort: "desc" }],
		};
		expect(query.limit).toBe(50);
		expect(query.versionMode).toBe("actual");
		expect(Array.isArray(query.sortModel) && query.sortModel[0]?.colId).toBe(
			"createdAt",
		);
	});

	it("DADM delete: draft is removed, approved is deactivated", () => {
		expect(
			summarizeV2QuestionnaireDeleteSelection(
				[{ workflowGlobalStatus: "Черновик", status: "active" }],
				true,
			).kind,
		).toBe("hard_delete");
		expect(
			summarizeV2QuestionnaireDeleteSelection(
				[{ workflowGlobalStatus: "Утверждена", status: "active" }],
				true,
			).kind,
		).toBe("deactivate");
	});
});
