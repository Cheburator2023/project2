"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const v2_typical_work_output_paths_util_1 = require("./v2-typical-work-output-paths.util");
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
