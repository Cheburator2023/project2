"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const v2_anketa_section_ui_util_1 = require("./v2-anketa-section-ui.util");
(0, vitest_1.describe)("resolveAnketaSectionWorkflowBinding", () => {
    (0, vitest_1.it)("binds canonical root sections to main workflow", () => {
        (0, vitest_1.expect)((0, v2_anketa_section_ui_util_1.resolveAnketaSectionWorkflowBinding)("streamDataSources", {
            streamBlock: true,
            sectionRole: "main",
            workflowSectionId: "streamDataSources",
        })).toEqual({ kind: "main", sectionId: "streamDataSources" });
    });
    (0, vitest_1.it)("uses panel workflow for PiRM stream block copied with wrong workflowSectionId", () => {
        (0, vitest_1.expect)((0, v2_anketa_section_ui_util_1.resolveAnketaSectionWorkflowBinding)("field_aJEu5ziT", {
            streamBlock: true,
            sectionRole: "main",
            workflowSectionId: "streamDataSources",
        })).toEqual({ kind: "panel", pathKey: "field_aJEu5ziT" });
    });
    (0, vitest_1.it)("uses panel workflow for duplicated subsection under stream", () => {
        (0, vitest_1.expect)((0, v2_anketa_section_ui_util_1.resolveAnketaSectionWorkflowBinding)("streamDataSources.platformStream1_copy", {
            groupActivatable: true,
            sectionRole: "subsection",
        })).toEqual({
            kind: "panel",
            pathKey: "streamDataSources.platformStream1_copy",
        });
    });
});
