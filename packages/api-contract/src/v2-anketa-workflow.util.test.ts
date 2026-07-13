import { describe, expect, it } from "vitest";
import {
	createDefaultV2AnketaWorkflow,
	isAnketaFormPathLocked,
} from "./v2-anketa-workflow.util";

describe("isAnketaFormPathLocked", () => {
	it("locks all paths when questionnaire is globally completed", () => {
		const workflow = {
			...createDefaultV2AnketaWorkflow(),
			globalStatus: "Заполнено" as const,
		};
		expect(isAnketaFormPathLocked(workflow, "detailInfo.detailAtypicalTasks")).toBe(
			true,
		);
	});

	it("locks nested paths inside a completed main section", () => {
		const workflow = createDefaultV2AnketaWorkflow();
		workflow.sections.detailInfo = "Заполнено";
		expect(isAnketaFormPathLocked(workflow, "detailInfo.detailAtypicalTasks")).toBe(
			true,
		);
		expect(isAnketaFormPathLocked(workflow, "generalInfo.modelService")).toBe(
			false,
		);
	});

	it("locks nested paths inside a completed panel section", () => {
		const workflow = {
			...createDefaultV2AnketaWorkflow(),
			panelSections: {
				"detailInfo.customPanel": "Заполнено" as const,
			},
		};
		expect(isAnketaFormPathLocked(workflow, "detailInfo.customPanel")).toBe(true);
		expect(
			isAnketaFormPathLocked(workflow, "detailInfo.customPanel.atypicalTasks"),
		).toBe(true);
		expect(isAnketaFormPathLocked(workflow, "detailInfo.otherPanel")).toBe(false);
	});
});
