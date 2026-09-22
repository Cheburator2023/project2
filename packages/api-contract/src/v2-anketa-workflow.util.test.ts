import { describe, expect, it } from "vitest";
import {
	allRequiredSectionsCompleted,
	canHoldQuestionnaire,
	completeGlobalQuestionnaire,
	createDefaultV2AnketaWorkflow,
	holdQuestionnaire,
	isAnketaFormPathLocked,
	isAnketaGloballyLocked,
	resetFilledWorkflowForWorksPath,
	withApprovedWorkflowGlobalStatus,
} from "./v2-anketa-workflow.util";
import { collectRequiredWorkflowTargets } from "./v2-anketa-section-ui.util";

describe("isAnketaFormPathLocked", () => {
	it("does not lock paths when global status is only «Заполнено»", () => {
		const workflow = {
			...createDefaultV2AnketaWorkflow(),
			globalStatus: "Заполнено" as const,
		};
		expect(isAnketaGloballyLocked(workflow)).toBe(false);
		expect(isAnketaFormPathLocked(workflow, "detailInfo.detailAtypicalTasks")).toBe(
			false,
		);
	});

	it("locks all paths when questionnaire is approved («Утверждена»)", () => {
		const workflow = {
			...createDefaultV2AnketaWorkflow(),
			globalStatus: "Утверждена" as const,
		};
		expect(isAnketaGloballyLocked(workflow)).toBe(true);
		expect(isAnketaFormPathLocked(workflow, "detailInfo.detailAtypicalTasks")).toBe(
			true,
		);
	});

	it("holdQuestionnaire approves from any non-approved status", () => {
		const draft = createDefaultV2AnketaWorkflow();
		expect(canHoldQuestionnaire(draft)).toBe(true);
		expect(holdQuestionnaire(draft).globalStatus).toBe("Утверждена");
		const filled = { ...draft, globalStatus: "Заполнено" as const };
		expect(holdQuestionnaire(filled).globalStatus).toBe("Утверждена");
		const approved = { ...draft, globalStatus: "Утверждена" as const };
		expect(canHoldQuestionnaire(approved)).toBe(false);
		expect(holdQuestionnaire(approved)).toBe(approved);
	});

	it("resetFilledWorkflowForWorksPath reopens filled section to Создано", () => {
		const workflow = {
			...createDefaultV2AnketaWorkflow(),
			globalStatus: "Заполнено" as const,
			sections: {
				...createDefaultV2AnketaWorkflow().sections,
				detailInfo: "Заполнено" as const,
			},
		};
		const next = resetFilledWorkflowForWorksPath(
			workflow,
			"detailInfo.detailAtypicalTasks",
		);
		expect(next.sections.detailInfo).toBe("Создано");
		expect(next.globalStatus).toBe("Черновик");
		expect(
			resetFilledWorkflowForWorksPath(
				{ ...workflow, globalStatus: "Утверждена" },
				"detailInfo.detailAtypicalTasks",
			),
		).toEqual({ ...workflow, globalStatus: "Утверждена" });
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

describe("collectRequiredWorkflowTargets / allRequiredSectionsCompleted", () => {
	const uiSchema = {
		generalInfo: {
			"ui:options": {
				sectionRole: "main",
				workflowSectionId: "generalInfo",
			},
		},
		detailInfo: {
			"ui:options": {
				sectionRole: "main",
				workflowSectionId: "detailInfo",
			},
		},
		streamDataSources: {
			"ui:options": {
				sectionRole: "main",
				streamBlock: true,
				groupActivatable: true,
				groupActive: false,
				workflowSectionId: "streamDataSources",
			},
		},
		field_customStream: {
			"ui:options": {
				sectionRole: "main",
				streamBlock: true,
			},
		},
	};

	it("skips inactive activatable groups and includes custom stream panels", () => {
		expect(
			collectRequiredWorkflowTargets(uiSchema, {
				groupActivation: { streamDataSources: false },
			}),
		).toEqual([
			{ kind: "main", sectionId: "generalInfo" },
			{ kind: "main", sectionId: "detailInfo" },
			{ kind: "panel", pathKey: "field_customStream" },
		]);
	});

	it("enables global complete when schema targets (not legacy 4 mains) are filled", () => {
		const workflow = {
			...createDefaultV2AnketaWorkflow(),
			sections: {
				...createDefaultV2AnketaWorkflow().sections,
				generalInfo: "Заполнено" as const,
				detailInfo: "Заполнено" as const,
			},
			panelSections: {
				field_customStream: "Заполнено" as const,
			},
		};
		const targets = collectRequiredWorkflowTargets(uiSchema, {
			groupActivation: { streamDataSources: false },
		});
		expect(allRequiredSectionsCompleted(workflow)).toBe(false);
		expect(allRequiredSectionsCompleted(workflow, targets)).toBe(true);
		expect(completeGlobalQuestionnaire(workflow, targets).globalStatus).toBe(
			"Заполнено",
		);
	});
});

describe("withApprovedWorkflowGlobalStatus", () => {
	it("adds «Утверждена» to a legacy globalStatus enum", () => {
		const schema = {
			type: "object",
			properties: {
				workflow: {
					type: "object",
					properties: {
						globalStatus: {
							type: "string",
							enum: ["Черновик", "Заполнено"],
							default: "Черновик",
						},
					},
				},
			},
		};
		const next = withApprovedWorkflowGlobalStatus(schema);
		expect(
			(
				next.properties as {
					workflow: {
						properties: { globalStatus: { enum: string[] } };
					};
				}
			).workflow.properties.globalStatus.enum,
		).toEqual(["Черновик", "Заполнено", "Утверждена"]);
		expect(
			(
				schema.properties.workflow.properties.globalStatus.enum as string[]
			).includes("Утверждена"),
		).toBe(false);
	});
});
