import { describe, expect, it } from "vitest";
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
});
