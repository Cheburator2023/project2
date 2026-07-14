import { describe, expect, it } from "vitest";
import { createDefaultV2AnketaWorkflow } from "@smart-anketa/api-contract";
import { isAnketaArchPathReadOnly } from "./anketaPathLock.util";

describe("isAnketaArchPathReadOnly", () => {
	it("locks paths inside a completed main section", () => {
		const workflow = createDefaultV2AnketaWorkflow();
		workflow.sections.detailInfo = "Заполнено";

		expect(
			isAnketaArchPathReadOnly(
				{ workflow },
				"detailInfo.detailAtypicalTasks",
			),
		).toBe(true);
		expect(
			isAnketaArchPathReadOnly({ workflow }, "generalInfo.modelService"),
		).toBe(false);
	});

	it("locks paths inside a completed panel section", () => {
		const workflow = {
			...createDefaultV2AnketaWorkflow(),
			panelSections: {
				"detailInfo.customPanel": "Заполнено" as const,
			},
		};

		expect(
			isAnketaArchPathReadOnly(
				{ workflow },
				"detailInfo.customPanel.atypicalTasks",
			),
		).toBe(true);
	});
});
