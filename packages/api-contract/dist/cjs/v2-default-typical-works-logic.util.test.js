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
    (0, vitest_1.it)("injects source catalog rule when schema has source systems and typical tasks block", () => {
        const patched = (0, v2_default_typical_works_logic_util_1.patchV2TypicalWorksLogicRules)({ rules: [] }, {
            jsonSchema: {
                type: "object",
                properties: {
                    detailInfo: {
                        type: "object",
                        properties: {
                            sourceSystems: { type: "array", items: { type: "object" } },
                            myTypicalTasks: { type: "array", items: { type: "object" } },
                        },
                    },
                },
            },
            uiSchema: {
                detailInfo: {
                    myTypicalTasks: {
                        "ui:options": { archComponent: "typicalWork" },
                    },
                },
            },
        });
        const rule = patched.rules.find((r) => r.id === "unified-source-typical-works");
        (0, vitest_1.expect)(rule).toBeDefined();
        const payload = rule?.payload;
        (0, vitest_1.expect)(payload.worksCatalog).toBe(true);
        (0, vitest_1.expect)(payload.outputArrayPath).toBe("detailInfo.myTypicalTasks");
        (0, vitest_1.expect)(rule?.targetPath).toBe("/detailInfo/myTypicalTasks");
    });
    (0, vitest_1.it)("injects source catalog rule for root-level typicalWork block without sourceSystems", () => {
        const patched = (0, v2_default_typical_works_logic_util_1.patchV2TypicalWorksLogicRules)({ rules: [] }, {
            jsonSchema: {
                type: "object",
                properties: {
                    field_KQX2OsDx: { type: "string", title: "Поле справочника" },
                    field_SId8TZKZ: {
                        type: "array",
                        items: { type: "object" },
                        title: "Типовые работы",
                    },
                },
            },
            uiSchema: {
                field_SId8TZKZ: {
                    "ui:options": { archComponent: "typicalWork" },
                },
            },
        });
        const rule = patched.rules.find((r) => r.id === "unified-source-typical-works");
        (0, vitest_1.expect)(rule).toBeDefined();
        const payload = rule?.payload;
        (0, vitest_1.expect)(payload.outputArrayPath).toBe("field_SId8TZKZ");
        (0, vitest_1.expect)(rule?.targetPath).toBe("/field_SId8TZKZ");
    });
    (0, vitest_1.it)("migrates legacy visibility row-total rules to row_computed", () => {
        const patched = (0, v2_default_typical_works_logic_util_1.patchV2TypicalWorksLogicRules)({
            rules: [
                {
                    id: "default-row-source-typical-task-total",
                    kind: "visibility",
                    targetPath: "/streamDataSources/sourceTypicalTasks",
                    dependencies: [],
                    condition: { "*": [{ var: "estimateHoursPerDay" }, { var: "coefficient" }] },
                    payload: {
                        fieldVar: "total",
                        arrayPath: "streamDataSources.sourceTypicalTasks",
                    },
                },
            ],
        });
        const rule = patched.rules.find((r) => r.id === "default-row-source-typical-task-total");
        (0, vitest_1.expect)(rule?.kind).toBe("row_computed");
    });
    (0, vitest_1.it)("patches slash-format legacy control typical tasks paths", () => {
        const patched = (0, v2_default_typical_works_logic_util_1.patchV2TypicalWorksLogicRules)({
            rules: [
                {
                    id: "unified-typical-total",
                    kind: "computed",
                    targetPath: "/summary/typicalTotal",
                    condition: true,
                    dependencies: [
                        "/streamDataSources/sourceTypicalTasks",
                        "/streamModelControl/control/controlTypicalTasks",
                    ],
                },
            ],
        });
        const rule = patched.rules.find((r) => r.id === "unified-typical-total");
        (0, vitest_1.expect)(rule?.dependencies).toEqual([
            "/streamDataSources/sourceTypicalTasks",
            "/streamModelControl/field_Khn6-HAW",
        ]);
    });
});
