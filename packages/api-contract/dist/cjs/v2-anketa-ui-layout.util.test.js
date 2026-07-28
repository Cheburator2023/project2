"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const v2_anketa_ui_layout_util_1 = require("./v2-anketa-ui-layout.util");
const v2_anketa_section_ui_util_1 = require("./v2-anketa-section-ui.util");
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
        (0, vitest_1.expect)(opts?.streamExecutor).toBe("pirm");
        (0, vitest_1.expect)(opts?.groupActivatable).toBeUndefined();
    });
    (0, vitest_1.it)("soft-syncs activation toggle for Sources and Model Control streams", () => {
        const jsonSchema = {
            type: "object",
            properties: {
                streamDataSources: { type: "object", properties: {} },
                streamModelControl: { type: "object", properties: {} },
                field_i8dL7QZa: { type: "object", properties: {} },
            },
        };
        const uiSchema = {
            streamDataSources: {
                "ui:options": { streamBlock: true, streamExecutor: "idsrc" },
            },
            streamModelControl: {
                "ui:options": { streamBlock: true, streamExecutor: "mdlctl" },
            },
            field_i8dL7QZa: {
                "ui:options": { streamBlock: true, streamExecutor: "dadm" },
            },
        };
        const enriched = (0, v2_anketa_ui_layout_util_1.enrichAnketaLayoutUiSchema)(uiSchema, jsonSchema);
        const sources = (0, v2_anketa_section_ui_util_1.readV2AnketaSectionUiOptions)(enriched.streamDataSources);
        (0, vitest_1.expect)(sources.groupActivatable).toBe(true);
        (0, vitest_1.expect)(sources.groupActive).toBe(false);
        const control = (0, v2_anketa_section_ui_util_1.readV2AnketaSectionUiOptions)(enriched.streamModelControl);
        (0, vitest_1.expect)(control.groupActivatable).toBe(true);
        (0, vitest_1.expect)(control.groupActive).toBe(false);
        const dadm = (0, v2_anketa_section_ui_util_1.readV2AnketaSectionUiOptions)(enriched.field_i8dL7QZa);
        (0, vitest_1.expect)(dadm.groupActivatable).toBeUndefined();
    });
    (0, vitest_1.it)("does not override existing groupActivatable on optional streams", () => {
        const jsonSchema = {
            type: "object",
            properties: {
                streamDataSources: { type: "object", properties: {} },
            },
        };
        const uiSchema = {
            streamDataSources: {
                "ui:options": {
                    streamBlock: true,
                    streamExecutor: "idsrc",
                    groupActivatable: true,
                    groupActive: true,
                },
            },
        };
        const enriched = (0, v2_anketa_ui_layout_util_1.enrichAnketaLayoutUiSchema)(uiSchema, jsonSchema);
        const opts = (0, v2_anketa_section_ui_util_1.readV2AnketaSectionUiOptions)(enriched.streamDataSources);
        (0, vitest_1.expect)(opts.groupActivatable).toBe(true);
        (0, vitest_1.expect)(opts.groupActive).toBe(true);
    });
});
