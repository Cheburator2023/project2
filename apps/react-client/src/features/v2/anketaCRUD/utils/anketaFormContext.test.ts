import { describe, expect, it } from "vitest";
import { mergeAnketaFormContext } from "./anketaFormContext";

describe("mergeAnketaFormContext", () => {
	it("keeps display formData from fallback when shell passes raw formData", () => {
		const merged = mergeAnketaFormContext(
			{
				formData: { streamDataSources: { sourceTypicalTasks: [] } },
				workflow: { globalStatus: "Черновик" } as never,
			},
			{
				formData: {
					streamDataSources: {
						sourceTypicalTasks: [{ name: "Работа 1", total: 5 }],
					},
				},
			},
		);

		expect(merged.formData).toEqual({
			streamDataSources: {
				sourceTypicalTasks: [{ name: "Работа 1", total: 5 }],
			},
		});
	});

	it("merges additive objectFieldSlots from both layers", () => {
		const merged = mergeAnketaFormContext(
			{ objectFieldSlots: { generalInfo: "shell" } },
			{ objectFieldSlots: { detailInfo: "fallback" } },
		);

		expect(merged.objectFieldSlots).toEqual({
			generalInfo: "shell",
			detailInfo: "fallback",
		});
	});

	it("lets shell override workflow while preserving display formData", () => {
		const merged = mergeAnketaFormContext(
			{ workflow: { globalStatus: "Заполнено" } as never },
			{
				formData: { summary: { typicalTotal: 10 } },
				workflow: { globalStatus: "Черновик" } as never,
			},
		);

		expect(merged.workflow).toEqual({ globalStatus: "Заполнено" });
		expect(merged.formData).toEqual({ summary: { typicalTotal: 10 } });
	});
});
