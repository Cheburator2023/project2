"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const v2_executor_streams_util_1 = require("./v2-executor-streams.util");
const v2_anketa_section_ui_util_1 = require("./v2-anketa-section-ui.util");
(0, vitest_1.describe)("v2-executor-streams.util", () => {
    (0, vitest_1.it)("lists six executor stream labels", () => {
        (0, vitest_1.expect)(v2_executor_streams_util_1.V2_EXECUTOR_STREAM_LABELS).toEqual([
            "ДАДМ",
            "ПиРМ",
            "Источники данных",
            "Контроль моделей",
            "Цифровые агенты",
            "Потоковые данные",
        ]);
    });
    (0, vitest_1.it)("maps legacy block keys to executor streams", () => {
        (0, vitest_1.expect)((0, v2_executor_streams_util_1.inferLegacyStreamExecutorForBlockKey)("streamDataSources")).toBe("Источники данных");
        (0, vitest_1.expect)((0, v2_executor_streams_util_1.inferLegacyStreamExecutorForBlockKey)("field_i8dL7QZa")).toBe("ДАДМ");
    });
    (0, vitest_1.it)("validates executor stream labels", () => {
        (0, vitest_1.expect)((0, v2_executor_streams_util_1.isV2ExecutorStreamLabel)("ПиРМ")).toBe(true);
        (0, vitest_1.expect)((0, v2_executor_streams_util_1.isV2ExecutorStreamLabel)("Unknown")).toBe(false);
    });
});
(0, vitest_1.describe)("resolveV2AnketaStreamBlockOptions", () => {
    (0, vitest_1.it)("reads explicit stream block metadata", () => {
        const opts = (0, v2_anketa_section_ui_util_1.readV2AnketaSectionUiOptions)({
            "ui:options": {
                streamBlock: true,
                streamExecutor: "Цифровые агенты",
            },
        });
        (0, vitest_1.expect)(opts.streamBlock).toBe(true);
        (0, vitest_1.expect)(opts.streamExecutor).toBe("Цифровые агенты");
        (0, vitest_1.expect)((0, v2_anketa_section_ui_util_1.resolveV2AnketaStreamBlockOptions)({ "ui:options": { streamBlock: true, streamExecutor: "ДАДМ" } }, "customBlock")).toEqual({ streamBlock: true, streamExecutor: "ДАДМ" });
    });
    (0, vitest_1.it)("infers legacy stream blocks without explicit flag", () => {
        (0, vitest_1.expect)((0, v2_anketa_section_ui_util_1.resolveV2AnketaStreamBlockOptions)(undefined, "streamModelControl")).toEqual({ streamBlock: true, streamExecutor: "Контроль моделей" });
    });
});
(0, vitest_1.describe)("resolveV2AnketaSectionDisplayTitle", () => {
    (0, vitest_1.it)("prefixes stream object block titles with Стрим", () => {
        (0, vitest_1.expect)((0, v2_anketa_section_ui_util_1.resolveV2AnketaSectionDisplayTitle)("ДАДМ", { "ui:options": { streamBlock: true, streamExecutor: "ДАДМ" } }, "field_dadm")).toBe("Стрим «ДАДМ»");
        (0, vitest_1.expect)((0, v2_anketa_section_ui_util_1.resolveV2AnketaSectionDisplayTitle)("Контроль моделей", undefined, "streamModelControl")).toBe("Стрим «Контроль моделей»");
    });
    (0, vitest_1.it)("keeps factory snapshot titles without double prefix", () => {
        (0, vitest_1.expect)((0, v2_anketa_section_ui_util_1.resolveV2AnketaSectionDisplayTitle)("Стрим «Источники данных»", { "ui:options": { streamBlock: true, streamExecutor: "Источники данных" } }, "streamDataSources")).toBe("Стрим «Источники данных»");
    });
    (0, vitest_1.it)("leaves non-stream object titles unchanged", () => {
        (0, vitest_1.expect)((0, v2_anketa_section_ui_util_1.resolveV2AnketaSectionDisplayTitle)("Общие сведения", { "ui:options": { sectionRole: "main" } }, "generalInfo")).toBe("Общие сведения");
    });
    (0, vitest_1.it)("formatV2StreamBlockSectionTitle is idempotent", () => {
        (0, vitest_1.expect)((0, v2_anketa_section_ui_util_1.formatV2StreamBlockSectionTitle)("ПиРМ")).toBe("Стрим «ПиРМ»");
        (0, vitest_1.expect)((0, v2_anketa_section_ui_util_1.formatV2StreamBlockSectionTitle)("Стрим «ПиРМ»")).toBe("Стрим «ПиРМ»");
        (0, vitest_1.expect)((0, v2_anketa_section_ui_util_1.formatV2StreamBlockSectionTitle)("Стрим ПиРМ")).toBe("Стрим ПиРМ");
    });
});
(0, vitest_1.describe)("collectExecutorStreamBlocks", () => {
    (0, vitest_1.it)("lists explicit and legacy root stream blocks", () => {
        const blocks = (0, v2_anketa_section_ui_util_1.collectExecutorStreamBlocks)({
            field_dadm: {
                "ui:options": { streamBlock: true, streamExecutor: "ДАДМ" },
            },
            streamDataSources: {},
        });
        (0, vitest_1.expect)(blocks.map((b) => b.streamExecutor).sort()).toEqual([
            "ДАДМ",
            "Источники данных",
        ]);
    });
    (0, vitest_1.it)("detects stream presence for logic labels and legacy db names", () => {
        const uiSchema = {
            field_src: {
                "ui:options": {
                    streamBlock: true,
                    streamExecutor: "Источники данных",
                },
            },
        };
        (0, vitest_1.expect)((0, v2_anketa_section_ui_util_1.isExecutorStreamPresentInSchema)(uiSchema, "Источники данных")).toBe(true);
        (0, vitest_1.expect)((0, v2_anketa_section_ui_util_1.isExecutorStreamPresentInSchema)(uiSchema, "ИД. Внутренний")).toBe(true);
        (0, vitest_1.expect)((0, v2_anketa_section_ui_util_1.isExecutorStreamPresentInSchema)(uiSchema, "ДАДМ")).toBe(false);
    });
    (0, vitest_1.it)("resolves stream for typicalWork block from explicit option or root stream", () => {
        const uiSchema = {
            field_stream: {
                "ui:options": {
                    streamBlock: true,
                    streamExecutor: "ПиРМ",
                },
                field_tasks: {
                    "ui:options": { archComponent: "typicalWork" },
                },
            },
            field_root: {
                "ui:options": {
                    archComponent: "typicalWork",
                    streamExecutor: "ДАДМ",
                },
            },
        };
        (0, vitest_1.expect)((0, v2_anketa_section_ui_util_1.resolveStreamExecutorForTypicalWorkOutputPath)(uiSchema, "field_stream.field_tasks")).toBe("ПиРМ");
        (0, vitest_1.expect)((0, v2_anketa_section_ui_util_1.resolveStreamExecutorForTypicalWorkOutputPath)(uiSchema, "field_root")).toBe("ДАДМ");
    });
});
