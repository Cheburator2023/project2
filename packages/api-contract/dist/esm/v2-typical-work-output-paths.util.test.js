import { describe, expect, it } from "vitest";
import { backfillTypicalWorkBoundWorkIdsInUiSchema } from "./v2-typical-work-output-paths.util";
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
});
