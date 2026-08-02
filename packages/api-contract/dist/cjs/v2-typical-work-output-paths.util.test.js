"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const v2_typical_work_output_paths_util_1 = require("./v2-typical-work-output-paths.util");
const v2_model_stream_typical_works_constants_1 = require("./v2-model-stream-typical-works.constants");
(0, vitest_1.describe)("buildTypicalWorkIdToCatalogStreamLabelMap", () => {
    (0, vitest_1.it)("prefers non-model stream when work is bound to both model and sources", () => {
        const sourceWorkId = "source-work-1";
        const modelWorkId = "model-work-1";
        const uiSchema = {
            detailInfo: {
                detailTypicalTasks: {
                    "ui:options": {
                        archComponent: "typicalWork",
                        streamExecutor: v2_model_stream_typical_works_constants_1.V2_MODEL_STREAM_EXECUTOR,
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
        const map = (0, v2_typical_work_output_paths_util_1.buildTypicalWorkIdToCatalogStreamLabelMap)(uiSchema);
        (0, vitest_1.expect)(map.get(sourceWorkId)).toBe("Источники данных");
        (0, vitest_1.expect)(map.get(modelWorkId)).toBe(v2_model_stream_typical_works_constants_1.V2_MODEL_STREAM_EXECUTOR);
    });
});
(0, vitest_1.describe)("backfillTypicalWorkBoundWorkIdsInUiSchema", () => {
    (0, vitest_1.it)("writes boundWorkIds per stream block from catalog", () => {
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
        const next = (0, v2_typical_work_output_paths_util_1.backfillTypicalWorkBoundWorkIdsInUiSchema)(uiSchema, catalog);
        const sourceOpts = next.streamDataSources
            .sourceTypicalTasks["ui:options"];
        const controlOpts = next.streamModelControl.field_tw["ui:options"];
        (0, vitest_1.expect)(sourceOpts.boundWorkIds).toEqual(["w-source"]);
        (0, vitest_1.expect)(controlOpts.boundWorkIds).toEqual(["w-control"]);
    });
    (0, vitest_1.it)("replaces a recognized legacy subset without overwriting arbitrary explicit bindings", () => {
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
        const next = (0, v2_typical_work_output_paths_util_1.backfillTypicalWorkBoundWorkIdsInUiSchema)(uiSchema, catalog, {
            replaceExisting: (ids) => ids.every((id) => id.startsWith("legacy-")),
        });
        const opts = next.streamDataSources
            .sourceTypicalTasks["ui:options"];
        (0, vitest_1.expect)(opts.boundWorkIds).toEqual([
            "legacy-a",
            "legacy-b",
            "missing-work",
        ]);
    });
});
(0, vitest_1.describe)("remapBoundWorkIdsInUiSchema", () => {
    (0, vitest_1.it)("replaces legacy work ids in explicit boundWorkIds", () => {
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
        const next = (0, v2_typical_work_output_paths_util_1.remapBoundWorkIdsInUiSchema)(uiSchema, new Map([
            ["old-a", "new-a"],
            ["old-b", "new-b"],
        ]));
        const opts = next.streamDataSources
            .sourceTypicalTasks["ui:options"];
        (0, vitest_1.expect)(opts.boundWorkIds).toEqual(["new-a", "new-b"]);
    });
});
(0, vitest_1.describe)("clearStaleGeneratedTypicalWorkPaths", () => {
    (0, vitest_1.it)("не затирает modelService-pseudo-array при очистке legacy controlTypicalTasks", () => {
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
        const next = (0, v2_typical_work_output_paths_util_1.clearStaleGeneratedTypicalWorkPaths)(data, "detailInfo.detailTypicalTasks");
        (0, vitest_1.expect)(next.generalInfo).toEqual({ modelService });
        (0, vitest_1.expect)(next.generalInfo).not.toEqual({
            modelService: { controlTypicalTasks: [] },
        });
    });
});
