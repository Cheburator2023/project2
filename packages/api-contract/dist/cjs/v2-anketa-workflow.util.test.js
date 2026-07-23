"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const v2_anketa_workflow_util_1 = require("./v2-anketa-workflow.util");
const v2_anketa_section_ui_util_1 = require("./v2-anketa-section-ui.util");
(0, vitest_1.describe)("isAnketaFormPathLocked", () => {
    (0, vitest_1.it)("locks all paths when questionnaire is globally completed", () => {
        const workflow = {
            ...(0, v2_anketa_workflow_util_1.createDefaultV2AnketaWorkflow)(),
            globalStatus: "Заполнено",
        };
        (0, vitest_1.expect)((0, v2_anketa_workflow_util_1.isAnketaFormPathLocked)(workflow, "detailInfo.detailAtypicalTasks")).toBe(true);
    });
    (0, vitest_1.it)("locks nested paths inside a completed main section", () => {
        const workflow = (0, v2_anketa_workflow_util_1.createDefaultV2AnketaWorkflow)();
        workflow.sections.detailInfo = "Заполнено";
        (0, vitest_1.expect)((0, v2_anketa_workflow_util_1.isAnketaFormPathLocked)(workflow, "detailInfo.detailAtypicalTasks")).toBe(true);
        (0, vitest_1.expect)((0, v2_anketa_workflow_util_1.isAnketaFormPathLocked)(workflow, "generalInfo.modelService")).toBe(false);
    });
    (0, vitest_1.it)("locks nested paths inside a completed panel section", () => {
        const workflow = {
            ...(0, v2_anketa_workflow_util_1.createDefaultV2AnketaWorkflow)(),
            panelSections: {
                "detailInfo.customPanel": "Заполнено",
            },
        };
        (0, vitest_1.expect)((0, v2_anketa_workflow_util_1.isAnketaFormPathLocked)(workflow, "detailInfo.customPanel")).toBe(true);
        (0, vitest_1.expect)((0, v2_anketa_workflow_util_1.isAnketaFormPathLocked)(workflow, "detailInfo.customPanel.atypicalTasks")).toBe(true);
        (0, vitest_1.expect)((0, v2_anketa_workflow_util_1.isAnketaFormPathLocked)(workflow, "detailInfo.otherPanel")).toBe(false);
    });
});
(0, vitest_1.describe)("collectRequiredWorkflowTargets / allRequiredSectionsCompleted", () => {
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
    (0, vitest_1.it)("skips inactive activatable groups and includes custom stream panels", () => {
        (0, vitest_1.expect)((0, v2_anketa_section_ui_util_1.collectRequiredWorkflowTargets)(uiSchema, {
            groupActivation: { streamDataSources: false },
        })).toEqual([
            { kind: "main", sectionId: "generalInfo" },
            { kind: "main", sectionId: "detailInfo" },
            { kind: "panel", pathKey: "field_customStream" },
        ]);
    });
    (0, vitest_1.it)("enables global complete when schema targets (not legacy 4 mains) are filled", () => {
        const workflow = {
            ...(0, v2_anketa_workflow_util_1.createDefaultV2AnketaWorkflow)(),
            sections: {
                ...(0, v2_anketa_workflow_util_1.createDefaultV2AnketaWorkflow)().sections,
                generalInfo: "Заполнено",
                detailInfo: "Заполнено",
            },
            panelSections: {
                field_customStream: "Заполнено",
            },
        };
        const targets = (0, v2_anketa_section_ui_util_1.collectRequiredWorkflowTargets)(uiSchema, {
            groupActivation: { streamDataSources: false },
        });
        (0, vitest_1.expect)((0, v2_anketa_workflow_util_1.allRequiredSectionsCompleted)(workflow)).toBe(false);
        (0, vitest_1.expect)((0, v2_anketa_workflow_util_1.allRequiredSectionsCompleted)(workflow, targets)).toBe(true);
        (0, vitest_1.expect)((0, v2_anketa_workflow_util_1.completeGlobalQuestionnaire)(workflow, targets).globalStatus).toBe("Заполнено");
    });
});
