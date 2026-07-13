import { describe, expect, it } from "vitest";
import { shouldHideInactiveActivatableGroupInCompletedAnketa } from "./anketaInactiveGroupVisibility.util";

const inactiveStreamUi = {
	"ui:options": {
		groupActivatable: true,
		groupActive: false,
		streamBlock: true,
	},
};

describe("shouldHideInactiveActivatableGroupInCompletedAnketa", () => {
	it("hides inactive activatable group in globally completed anketa", () => {
		expect(
			shouldHideInactiveActivatableGroupInCompletedAnketa(
				{
					workflow: { globalStatus: "Заполнено", sections: {} },
					formData: { groupActivation: { streamDigitalAgents: false } },
					previewUiSchema: { streamDigitalAgents: inactiveStreamUi },
				},
				"streamDigitalAgents",
				inactiveStreamUi,
			),
		).toBe(true);
	});

	it("keeps active group visible in completed anketa", () => {
		expect(
			shouldHideInactiveActivatableGroupInCompletedAnketa(
				{
					workflow: { globalStatus: "Заполнено", sections: {} },
					formData: { groupActivation: { streamDigitalAgents: true } },
					previewUiSchema: { streamDigitalAgents: inactiveStreamUi },
				},
				"streamDigitalAgents",
				inactiveStreamUi,
			),
		).toBe(false);
	});

	it("keeps inactive group visible while anketa is still draft", () => {
		expect(
			shouldHideInactiveActivatableGroupInCompletedAnketa(
				{
					workflow: { globalStatus: "Черновик", sections: {} },
					formData: {},
					previewUiSchema: { streamDigitalAgents: inactiveStreamUi },
				},
				"streamDigitalAgents",
				inactiveStreamUi,
			),
		).toBe(false);
	});

	it("does not hide in schema editor preview", () => {
		expect(
			shouldHideInactiveActivatableGroupInCompletedAnketa(
				{
					schemaEditorPreview: true,
					workflow: { globalStatus: "Заполнено", sections: {} },
					formData: {},
					previewUiSchema: { streamDigitalAgents: inactiveStreamUi },
				},
				"streamDigitalAgents",
				inactiveStreamUi,
			),
		).toBe(false);
	});
});
