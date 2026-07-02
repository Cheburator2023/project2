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
