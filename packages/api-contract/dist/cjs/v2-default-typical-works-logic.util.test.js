"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const v2_default_typical_works_logic_util_1 = require("./v2-default-typical-works-logic.util");
(0, vitest_1.describe)("v2-default-typical-works-logic.util", () => {
    (0, vitest_1.it)("replaces legacy static-tasks rule with worksCatalog and v5 paths", () => {
        const patched = (0, v2_default_typical_works_logic_util_1.patchV2TypicalWorksLogicRules)({
            rules: [
                {
                    id: "unified-source-typical-works",
                    kind: "task_trigger",
                    targetPath: "/streamDataSources/sourceTypicalTasks",
                    dependencies: ["/streamDataSources/sourceSystems"],
                    condition: true,
                    payload: {
                        mode: "generated_rows",
                        tasks: [{ name: "Legacy", match: { type: "Внутренний" } }],
                        sourceArrayPath: "streamDataSources.sourceSystems",
                        outputArrayPath: "streamDataSources.sourceTypicalTasks",
                    },
                },
            ],
        });
        const rule = patched.rules.find((r) => r.id === "unified-source-typical-works") ??
            (0, v2_default_typical_works_logic_util_1.buildSourceTypicalWorksCatalogRule)();
        const payload = rule.payload;
        (0, vitest_1.expect)(payload.worksCatalog).toBe(true);
        (0, vitest_1.expect)(payload.sourceArrayPath).toBe(v2_default_typical_works_logic_util_1.V2_SOURCE_SYSTEMS_ARRAY_PATH);
        (0, vitest_1.expect)(payload.tasks).toBeUndefined();
    });
    (0, vitest_1.it)("does not inject catalog rules into partial logic graphs", () => {
        const patched = (0, v2_default_typical_works_logic_util_1.patchV2TypicalWorksLogicRules)({
            rules: [
                {
                    id: "unified-typical-total",
                    kind: "computed",
                    targetPath: "/summary/typicalTotal",
                    condition: true,
                    dependencies: [],
                },
            ],
        });
        (0, vitest_1.expect)(patched.rules.some((rule) => rule.id === "unified-source-typical-works")).toBe(false);
    });
});
