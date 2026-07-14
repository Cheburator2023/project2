import { describe, expect, it } from "vitest";
import { resolveAnketaSectionWorkflowBinding } from "./v2-anketa-section-ui.util";
describe("resolveAnketaSectionWorkflowBinding", () => {
    it("binds canonical root sections to main workflow", () => {
        expect(resolveAnketaSectionWorkflowBinding("streamDataSources", {
            streamBlock: true,
            sectionRole: "main",
            workflowSectionId: "streamDataSources",
        })).toEqual({ kind: "main", sectionId: "streamDataSources" });
    });
    it("uses panel workflow for PiRM stream block copied with wrong workflowSectionId", () => {
        expect(resolveAnketaSectionWorkflowBinding("field_aJEu5ziT", {
            streamBlock: true,
            sectionRole: "main",
            workflowSectionId: "streamDataSources",
        })).toEqual({ kind: "panel", pathKey: "field_aJEu5ziT" });
    });
    it("uses panel workflow for duplicated subsection under stream", () => {
        expect(resolveAnketaSectionWorkflowBinding("streamDataSources.platformStream1_copy", {
            groupActivatable: true,
            sectionRole: "subsection",
        })).toEqual({
            kind: "panel",
            pathKey: "streamDataSources.platformStream1_copy",
        });
    });
});
