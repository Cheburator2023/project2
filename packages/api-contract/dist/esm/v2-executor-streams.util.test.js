import { describe, expect, it } from "vitest";
import { inferLegacyStreamExecutorForBlockKey, isV2ExecutorStreamLabel, V2_EXECUTOR_STREAM_LABELS, } from "./v2-executor-streams.util";
import { resolveV2AnketaStreamBlockOptions, readV2AnketaSectionUiOptions, } from "./v2-anketa-section-ui.util";
describe("v2-executor-streams.util", () => {
    it("lists six executor stream labels", () => {
        expect(V2_EXECUTOR_STREAM_LABELS).toEqual([
            "ДАДМ",
            "ПиРМ",
            "Источники данных",
            "Контроль моделей",
            "Цифровые агенты",
            "Потоковые данные",
        ]);
    });
    it("maps legacy block keys to executor streams", () => {
        expect(inferLegacyStreamExecutorForBlockKey("streamDataSources")).toBe("Источники данных");
        expect(inferLegacyStreamExecutorForBlockKey("field_i8dL7QZa")).toBe("ДАДМ");
    });
    it("validates executor stream labels", () => {
        expect(isV2ExecutorStreamLabel("ПиРМ")).toBe(true);
        expect(isV2ExecutorStreamLabel("Unknown")).toBe(false);
    });
});
describe("resolveV2AnketaStreamBlockOptions", () => {
    it("reads explicit stream block metadata", () => {
        const opts = readV2AnketaSectionUiOptions({
            "ui:options": {
                streamBlock: true,
                streamExecutor: "Цифровые агенты",
            },
        });
        expect(opts.streamBlock).toBe(true);
        expect(opts.streamExecutor).toBe("Цифровые агенты");
        expect(resolveV2AnketaStreamBlockOptions({ "ui:options": { streamBlock: true, streamExecutor: "ДАДМ" } }, "customBlock")).toEqual({ streamBlock: true, streamExecutor: "ДАДМ" });
    });
    it("infers legacy stream blocks without explicit flag", () => {
        expect(resolveV2AnketaStreamBlockOptions(undefined, "streamModelControl")).toEqual({ streamBlock: true, streamExecutor: "Контроль моделей" });
    });
});
