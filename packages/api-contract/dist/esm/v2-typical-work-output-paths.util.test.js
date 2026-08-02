import { describe, expect, it } from "vitest";
import { backfillTypicalWorkBoundWorkIdsInUiSchema, buildTypicalWorkIdToCatalogStreamLabelMap, clearStaleGeneratedTypicalWorkPaths, remapBoundWorkIdsInUiSchema, } from "./v2-typical-work-output-paths.util";
import { V2_MODEL_STREAM_EXECUTOR } from "./v2-model-stream-typical-works.constants";
describe("buildTypicalWorkIdToCatalogStreamLabelMap", () => {
    it("prefers non-model stream when work is bound to both model and sources", () => {
        const sourceWorkId = "source-work-1";
        const modelWorkId = "model-work-1";
        const uiSchema = {
            detailInfo: {
                detailTypicalTasks: {
                    "ui:options": {
                        archComponent: "typicalWork",
                        streamExecutor: V2_MODEL_STREAM_EXECUTOR,
                        boundWorkIds: [modelWorkId, sourceWorkId],
                    },
                },
            },
            streamDataSources: {
                "ui:options": {
                    streamBlock: true,
                    streamExecutor: "idsrc",
                },
                field_tw: {
                    "ui:options": {
                        archComponent: "typicalWork",
                        streamExecutor: "Источники данных",
                        boundWorkIds: [sourceWorkId],
                    },
                },
            },
        };
        const map = buildTypicalWorkIdToCatalogStreamLabelMap(uiSchema);
        expect(map.get(sourceWorkId)).toBe("Источники данных");
        expect(map.get(modelWorkId)).toBe(V2_MODEL_STREAM_EXECUTOR);
    });
});
describe("backfillTypicalWorkBoundWorkIdsInUiSchema", () => {
    it("writes boundWorkIds per stream block from catalog", () => {
        const uiSchema = {
            streamDataSources: {
                "ui:options": {
                    streamBlock: true,
                    streamExecutor: "Источники данных",
                },
                sourceTypicalTasks: {
                    "ui:options": { archComponent: "typicalWork" },
                },
            },
            streamModelControl: {
                "ui:options": {
                    streamBlock: true,
                    streamExecutor: "Контроль моделей",
                },
                field_tw: {
                    "ui:options": { archComponent: "typicalWork" },
                },
            },
        };
        const catalog = [
            { id: "w-source", streams: ["Источники данных"] },
            { id: "w-control", streams: ["Контроль моделей"] },
        ];
        const next = backfillTypicalWorkBoundWorkIdsInUiSchema(uiSchema, catalog);
        const sourceOpts = next.streamDataSources
            .sourceTypicalTasks["ui:options"];
        const controlOpts = next.streamModelControl.field_tw["ui:options"];
        expect(sourceOpts.boundWorkIds).toEqual(["w-source"]);
        expect(controlOpts.boundWorkIds).toEqual(["w-control"]);
    });
    it("replaces a recognized legacy subset without overwriting arbitrary explicit bindings", () => {
        const uiSchema = {
            streamDataSources: {
                "ui:options": {
                    streamBlock: true,
                    streamExecutor: "Источники данных",
                },
                sourceTypicalTasks: {
                    "ui:options": {
                        archComponent: "typicalWork",
                        boundWorkIds: ["legacy-a", "legacy-b"],
                    },
                },
            },
        };
        const catalog = [
            { id: "legacy-a", streams: ["Источники данных"] },
            { id: "legacy-b", streams: ["Источники данных"] },
            { id: "missing-work", streams: ["Источники данных"] },
        ];
        const next = backfillTypicalWorkBoundWorkIdsInUiSchema(uiSchema, catalog, {
            replaceExisting: (ids) => ids.every((id) => id.startsWith("legacy-")),
        });
        const opts = next.streamDataSources
            .sourceTypicalTasks["ui:options"];
        expect(opts.boundWorkIds).toEqual([
            "legacy-a",
            "legacy-b",
            "missing-work",
        ]);
    });
});
describe("remapBoundWorkIdsInUiSchema", () => {
    it("replaces legacy work ids in explicit boundWorkIds", () => {
        const uiSchema = {
            streamDataSources: {
                sourceTypicalTasks: {
                    "ui:options": {
                        archComponent: "typicalWork",
                        boundWorkIds: ["old-a", "old-b"],
                    },
                },
            },
        };
        const next = remapBoundWorkIdsInUiSchema(uiSchema, new Map([
            ["old-a", "new-a"],
            ["old-b", "new-b"],
        ]));
        const opts = next.streamDataSources
            .sourceTypicalTasks["ui:options"];
        expect(opts.boundWorkIds).toEqual(["new-a", "new-b"]);
    });
});
describe("clearStaleGeneratedTypicalWorkPaths", () => {
    it("не затирает modelService-pseudo-array при очистке legacy controlTypicalTasks", () => {
        // Регресс: очистка generalInfo.modelService.controlTypicalTasks подменяла
        // массив модельного сервиса на { controlTypicalTasks: [] }. После этого
        // блок ПиРМ терял триггер field_imxB4YEd и работа не появлялась.
        const modelService = [
            {
                field_dEVFQVQn: "МС-1",
                field_imxB4YEd: true,
            },
        ];
        const data = {
            generalInfo: { modelService },
            detailInfo: { detailTypicalTasks: [{ name: "model-stream-work" }] },
            field_aJEu5ziT: { sourceTypicalTasks: [] },
        };
        const next = clearStaleGeneratedTypicalWorkPaths(data, "detailInfo.detailTypicalTasks");
        expect(next.generalInfo).toEqual({ modelService });
        expect(next.generalInfo).not.toEqual({
            modelService: { controlTypicalTasks: [] },
        });
    });
});
