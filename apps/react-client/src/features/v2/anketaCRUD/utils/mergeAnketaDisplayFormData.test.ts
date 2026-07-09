import { describe, expect, it } from "vitest";
import { readArchObjectListAtPath } from "./anketaArchObjectListPaths";
import { mergeAnketaDisplayFormData } from "./mergeAnketaDisplayFormData";

describe("mergeAnketaDisplayFormData", () => {
	it("uses calculated generated typical work arrays over stale saved rows", () => {
		const display = mergeAnketaDisplayFormData(
			{
				streamDataSources: {
					sourceSystems: [{ name: "CRM" }],
					sourceTypicalTasks: [{ name: "stale" }],
				},
				detailInfo: {
					detailTypicalTasks: [{ name: "old detail" }],
				},
				generalInfo: {
					modelService: {
						workType: "Разработка",
						controlTypicalTasks: [{ name: "old control" }],
					},
				},
			},
			{
				streamDataSources: {
					sourceTypicalTasks: [{ name: "fresh source", total: 3 }],
				},
				detailInfo: {
					detailTypicalTasks: [{ name: "fresh detail", total: 5 }],
				},
				generalInfo: {
					modelService: {
						controlTypicalTasks: [{ name: "fresh control", total: 2 }],
					},
				},
			},
		);

		expect(
			(
				display.streamDataSources as {
					sourceTypicalTasks: Array<{ name: string }>;
				}
			).sourceTypicalTasks[0]?.name,
		).toBe("fresh source");
		expect(
			(display.detailInfo as { detailTypicalTasks: Array<{ name: string }> })
				.detailTypicalTasks[0]?.name,
		).toBe("fresh detail");
		expect(
			(
				(display.generalInfo as {
					modelService: { controlTypicalTasks: Array<{ name: string }> };
				}).modelService.controlTypicalTasks
			)[0]?.name,
		).toBe("fresh control");
		expect(
			(display.generalInfo as { modelService: { workType: string } }).modelService
				.workType,
		).toBe("Разработка");
	});

	it("keeps modelService pseudo-array when merging controlTypicalTasks from calculation", () => {
		const formData = {
			generalInfo: {
				modelService: [
					{ workType: "Разработка", field_dEVFQVQn: "ms-1" },
					{ workType: "Доработка", field_dEVFQVQn: "ms-2" },
				],
			},
		};
		const liveFormData = {
			generalInfo: {
				modelService: {
					controlTypicalTasks: [{ name: "fresh control", total: 2 }],
				},
			},
		};

		const display = mergeAnketaDisplayFormData(formData, liveFormData);

		expect(readArchObjectListAtPath(display, "generalInfo.modelService")).toEqual(
			[
				{ workType: "Разработка", field_dEVFQVQn: "ms-1" },
				{ workType: "Доработка", field_dEVFQVQn: "ms-2" },
			],
		);
	});

	it("uses calculated summary from liveFormData over stale saved summary", () => {
		const display = mergeAnketaDisplayFormData(
			{
				summary: {
					baseScoreStream: 485,
					scoreWithComplexityCoeff: 192,
					deviationFromBaseline: -60.41,
					detailedCalculation: [
						{ stageName: "01. Постановка задачи", baseScore: 33, complexityCoeff: 33 },
					],
				},
				generalInfo: { initiativeName: "Тест" },
			},
			{
				summary: {
					baseScoreStream: 520,
					scoreWithComplexityCoeff: 250,
					deviationFromBaseline: -51.92,
					detailedCalculation: [
						{ stageName: "01. Постановка задачи", baseScore: 40, complexityCoeff: 40 },
					],
					total: 300,
					typicalTotal: 200,
					atypicalTotal: 100,
				},
			},
		);

		expect(display.summary).toEqual({
			baseScoreStream: 520,
			scoreWithComplexityCoeff: 250,
			deviationFromBaseline: -51.92,
			detailedCalculation: [
				{ stageName: "01. Постановка задачи", baseScore: 40, complexityCoeff: 40 },
			],
			total: 300,
			typicalTotal: 200,
			atypicalTotal: 100,
		});
		expect((display.generalInfo as { initiativeName: string }).initiativeName).toBe(
			"Тест",
		);
	});
});
