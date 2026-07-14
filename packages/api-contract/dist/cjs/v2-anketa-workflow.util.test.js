"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const v2_anketa_workflow_util_1 = require("./v2-anketa-workflow.util");
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
