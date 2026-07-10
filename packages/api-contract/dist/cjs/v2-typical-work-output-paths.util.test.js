"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const v2_typical_work_output_paths_util_1 = require("./v2-typical-work-output-paths.util");
(0, vitest_1.describe)("v2-typical-work-output-paths.util", () => {
    (0, vitest_1.it)("lists uiSchema and legacy generated typical work paths", () => {
        const paths = (0, v2_typical_work_output_paths_util_1.listAllGeneratedTypicalWorkArrayPaths)({
            field_OFmNQhnL: { "ui:options": { archComponent: "typicalWork" } },
        });
        (0, vitest_1.expect)(paths).toContain("field_OFmNQhnL");
        (0, vitest_1.expect)(paths).toContain("streamDataSources.sourceTypicalTasks");
        (0, vitest_1.expect)(paths).toContain("detailInfo.detailTypicalTasks");
    });
    (0, vitest_1.it)("clears legacy fan-out paths when custom output is replaced", () => {
        const staleRow = { name: "ееее", total: 10 };
        const next = (0, v2_typical_work_output_paths_util_1.clearStaleGeneratedTypicalWorkPaths)({
            field_OFmNQhnL: [staleRow],
            streamDataSources: { sourceTypicalTasks: [staleRow] },
            detailInfo: { detailTypicalTasks: [staleRow] },
            streamModelControl: { "field_Khn6-HAW": [staleRow] },
        }, "field_OFmNQhnL", {
            field_OFmNQhnL: { "ui:options": { archComponent: "typicalWork" } },
        });
        (0, vitest_1.expect)(next.field_OFmNQhnL[0]?.name).toBe("ееее");
        (0, vitest_1.expect)(next.streamDataSources
            .sourceTypicalTasks).toEqual([]);
        (0, vitest_1.expect)(next.detailInfo.detailTypicalTasks).toEqual([]);
        (0, vitest_1.expect)(next.streamModelControl["field_Khn6-HAW"]).toEqual([]);
    });
});
