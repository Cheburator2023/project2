import { describe, expect, it } from "vitest";
import type { UiSchema } from "@rjsf/utils";
import { createDefaultV2AnketaWorkflow } from "@smart-anketa/api-contract";
import { applySectionLocksToUiSchema } from "./anketaSectionUiSchema";

describe("applySectionLocksToUiSchema", () => {
	it("locks completed panel sections in uiSchema", () => {
		const uiSchema: UiSchema = {
			detailInfo: {
				customPanel: {
					atypicalTasks: { "ui:widget": "hidden" },
				},
			},
		};
		const workflow = {
			...createDefaultV2AnketaWorkflow(),
			panelSections: {
				"detailInfo.customPanel": "Заполнено" as const,
			},
		};

		const locked = applySectionLocksToUiSchema(uiSchema, workflow);
		expect(locked.detailInfo?.customPanel?.["ui:readonly"]).toBe(true);
		expect(
			locked.detailInfo?.customPanel?.atypicalTasks?.["ui:readonly"],
		).toBe(true);
	});
});
