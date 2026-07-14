"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const v2_anketa_ui_layout_util_1 = require("./v2-anketa-ui-layout.util");
(0, vitest_1.describe)("enrichAnketaLayoutUiSchema", () => {
    (0, vitest_1.it)("strips misassigned workflowSectionId from custom stream blocks", () => {
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
        const enriched = (0, v2_anketa_ui_layout_util_1.enrichAnketaLayoutUiSchema)(uiSchema, jsonSchema);
        const opts = enriched.field_aJEu5ziT?.["ui:options"];
        (0, vitest_1.expect)(opts?.workflowSectionId).toBeUndefined();
        (0, vitest_1.expect)(opts?.streamExecutor).toBe("ПиРМ");
    });
});
