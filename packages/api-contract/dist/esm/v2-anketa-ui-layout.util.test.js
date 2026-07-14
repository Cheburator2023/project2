import { describe, expect, it } from "vitest";
import { enrichAnketaLayoutUiSchema } from "./v2-anketa-ui-layout.util";
describe("enrichAnketaLayoutUiSchema", () => {
    it("strips misassigned workflowSectionId from custom stream blocks", () => {
        const jsonSchema = {
            type: "object",
            properties: {
                field_aJEu5ziT: {
                    type: "object",
                    properties: {},
                },
            },
        };
        const uiSchema = {
            field_aJEu5ziT: {
                "ui:options": {
                    streamBlock: true,
                    streamExecutor: "ПиРМ",
                    workflowSectionId: "streamDataSources",
                },
            },
        };
        const enriched = enrichAnketaLayoutUiSchema(uiSchema, jsonSchema);
        const opts = enriched.field_aJEu5ziT?.["ui:options"];
        expect(opts?.workflowSectionId).toBeUndefined();
        expect(opts?.streamExecutor).toBe("ПиРМ");
    });
});
