import { describe, expect, it } from "vitest";
import { createResetSchemaEditorPreviewFormData } from "./previewFormReset";

describe("createResetSchemaEditorPreviewFormData", () => {
	it("returns empty field data with default workflow and group activation", () => {
		const uiSchema = {
			streamDataSources: {
				platformStream1: {
					"ui:options": { groupActivatable: true, groupActive: false },
				},
			},
		};

		const next = createResetSchemaEditorPreviewFormData(uiSchema);

		expect(next).toEqual({
			workflow: {
				globalStatus: "Черновик",
				sections: expect.objectContaining({
					streamDataSources: "Создано",
				}),
			},
			groupActivation: {
				"streamDataSources.platformStream1": false,
			},
		});
	});
});
