import { describe, expect, it } from "vitest";
import { inferLegacyStreamExecutorForBlockKey, isV2ExecutorStreamLabel, typicalWorkAssignedToExecutorStream, V2_EXECUTOR_STREAM_LABELS, } from "./v2-executor-streams.util";
import { collectExecutorStreamBlocks, formatV2StreamBlockSectionTitle, isExecutorStreamPresentInSchema, resolveV2AnketaSectionDisplayTitle, resolveV2AnketaStreamBlockOptions, readV2AnketaSectionUiOptions, resolveStreamExecutorForTypicalWorkOutputPath, } from "./v2-anketa-section-ui.util";
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
describe("resolveV2AnketaSectionDisplayTitle", () => {
    it("prefixes stream object block titles with Стрим", () => {
        expect(resolveV2AnketaSectionDisplayTitle("ДАДМ", { "ui:options": { streamBlock: true, streamExecutor: "ДАДМ" } }, "field_dadm")).toBe("Стрим «ДАДМ»");
        expect(resolveV2AnketaSectionDisplayTitle("Контроль моделей", undefined, "streamModelControl")).toBe("Стрим «Контроль моделей»");
    });
    it("keeps factory snapshot titles without double prefix", () => {
        expect(resolveV2AnketaSectionDisplayTitle("Стрим «Источники данных»", { "ui:options": { streamBlock: true, streamExecutor: "Источники данных" } }, "streamDataSources")).toBe("Стрим «Источники данных»");
    });
    it("leaves non-stream object titles unchanged", () => {
        expect(resolveV2AnketaSectionDisplayTitle("Общие сведения", { "ui:options": { sectionRole: "main" } }, "generalInfo")).toBe("Общие сведения");
    });
    it("formatV2StreamBlockSectionTitle is idempotent", () => {
        expect(formatV2StreamBlockSectionTitle("ПиРМ")).toBe("Стрим «ПиРМ»");
        expect(formatV2StreamBlockSectionTitle("Стрим «ПиРМ»")).toBe("Стрим «ПиРМ»");
        expect(formatV2StreamBlockSectionTitle("Стрим ПиРМ")).toBe("Стрим ПиРМ");
    });
});
describe("collectExecutorStreamBlocks", () => {
    it("lists explicit and legacy root stream blocks", () => {
        const blocks = collectExecutorStreamBlocks({
            field_dadm: {
                "ui:options": { streamBlock: true, streamExecutor: "ДАДМ" },
            },
            streamDataSources: {},
        });
        expect(blocks.map((b) => b.streamExecutor).sort()).toEqual([
            "ДАДМ",
            "Источники данных",
        ]);
    });
    it("detects stream presence for logic labels and legacy db names", () => {
        const uiSchema = {
            field_src: {
                "ui:options": {
                    streamBlock: true,
                    streamExecutor: "Источники данных",
                },
            },
        };
        expect(isExecutorStreamPresentInSchema(uiSchema, "Источники данных")).toBe(true);
        expect(isExecutorStreamPresentInSchema(uiSchema, "ИД. Внутренний")).toBe(true);
        expect(isExecutorStreamPresentInSchema(uiSchema, "ДАДМ")).toBe(false);
    });
    it("resolves stream for typicalWork block from explicit option or root stream", () => {
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
        expect(resolveStreamExecutorForTypicalWorkOutputPath(uiSchema, "field_stream.field_tasks")).toBe("ПиРМ");
        expect(resolveStreamExecutorForTypicalWorkOutputPath(uiSchema, "field_root")).toBe("ДАДМ");
    });
    it("typicalWorkAssignedToExecutorStream matches DB stream aliases", () => {
        expect(typicalWorkAssignedToExecutorStream(["ИД. Внутренний"], "Источники данных")).toBe(true);
        expect(typicalWorkAssignedToExecutorStream(["Контроль моделей"], "Источники данных")).toBe(false);
    });
});
