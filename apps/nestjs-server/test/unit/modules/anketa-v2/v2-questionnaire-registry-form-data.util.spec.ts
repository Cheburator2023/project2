import {
	collectV2RegistryFormPaths,
	pickV2QuestionnaireRegistryFormData,
	type V2RegistryColumnNode,
} from "@smart-anketa/api-contract";

describe("pickV2QuestionnaireRegistryFormData", () => {
	it("keeps registry columns, workflow and stream; drops formulas and typical works", () => {
		const formData = {
			workflow: {
				globalStatus: "Черновик",
				panelSections: { "generalInfo.detail": "Заполнено" },
			},
			generalInfo: {
				implementationStream: "RB",
				businessCustomer: "Банк",
			},
			streamDataSources: {
				sourceTypicalTasks: [
					{
						name: "Типовая",
						formulaBreakdown: { display: "1+1", value: 2 },
					},
				],
			},
			summary: {
				detailedCalculation: [{ stageName: "Пилот", personDays: 4 }],
			},
		};
		const columnTree: V2RegistryColumnNode[] = [
			{
				type: "leaf",
				id: "form.generalInfo.businessCustomer",
				header: "Заказчик",
				kind: "form",
				formPath: "generalInfo.businessCustomer",
			},
			{
				type: "leaf",
				id: "form.summary.detailedCalculation[0].stageName",
				header: "Этап",
				kind: "form",
				formPath: "summary.detailedCalculation[0].stageName",
			},
		];
		const picked = pickV2QuestionnaireRegistryFormData(
			formData,
			collectV2RegistryFormPaths(columnTree),
		);

		expect(picked.workflow).toEqual(formData.workflow);
		expect(picked.generalInfo).toEqual({
			implementationStream: "RB",
			businessCustomer: "Банк",
		});
		expect(picked.summary).toEqual({
			detailedCalculation: [{ stageName: "Пилот" }],
		});
		expect(picked.streamDataSources).toBeUndefined();
		expect(JSON.stringify(picked)).not.toContain("formulaBreakdown");
	});

	it("strips formulaBreakdown even if a column path copies a parent object", () => {
		const picked = pickV2QuestionnaireRegistryFormData(
			{
				tasks: [{ name: "A", formulaBreakdown: { display: "x" } }],
			},
			["tasks[0]"],
		);
		expect(picked).toEqual({ tasks: [{ name: "A" }] });
	});
});
