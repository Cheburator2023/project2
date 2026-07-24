import { describe, expect, it } from "vitest";
import { allRequiredSectionsCompleted, completeGlobalQuestionnaire, createDefaultV2AnketaWorkflow, isAnketaFormPathLocked, } from "./v2-anketa-workflow.util";
import { collectRequiredWorkflowTargets } from "./v2-anketa-section-ui.util";
describe("isAnketaFormPathLocked", () => {
    it("locks all paths when questionnaire is globally completed", () => {
        const workflow = {
            ...createDefaultV2AnketaWorkflow(),
            globalStatus: "Заполнено",
        };
        expect(isAnketaFormPathLocked(workflow, "detailInfo.detailAtypicalTasks")).toBe(true);
    });
    it("locks nested paths inside a completed main section", () => {
        const workflow = createDefaultV2AnketaWorkflow();
        workflow.sections.detailInfo = "Заполнено";
        expect(isAnketaFormPathLocked(workflow, "detailInfo.detailAtypicalTasks")).toBe(true);
        expect(isAnketaFormPathLocked(workflow, "generalInfo.modelService")).toBe(false);
    });
    it("locks nested paths inside a completed panel section", () => {
        const workflow = {
            ...createDefaultV2AnketaWorkflow(),
            panelSections: {
                "detailInfo.customPanel": "Заполнено",
            },
        };
        expect(isAnketaFormPathLocked(workflow, "detailInfo.customPanel")).toBe(true);
        expect(isAnketaFormPathLocked(workflow, "detailInfo.customPanel.atypicalTasks")).toBe(true);
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
        expect(collectRequiredWorkflowTargets(uiSchema, {
            groupActivation: { streamDataSources: false },
        })).toEqual([
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
                generalInfo: "Заполнено",
                detailInfo: "Заполнено",
            },
            panelSections: {
                field_customStream: "Заполнено",
            },
        };
        const targets = collectRequiredWorkflowTargets(uiSchema, {
            groupActivation: { streamDataSources: false },
        });
        expect(allRequiredSectionsCompleted(workflow)).toBe(false);
        expect(allRequiredSectionsCompleted(workflow, targets)).toBe(true);
        expect(completeGlobalQuestionnaire(workflow, targets).globalStatus).toBe("Заполнено");
    });
});
