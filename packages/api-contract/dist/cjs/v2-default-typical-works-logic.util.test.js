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
        const rule = patched.rules.find((r) => r.id.startsWith("typical-works-catalog-")) ??
            (0, v2_default_typical_works_logic_util_1.buildSourceTypicalWorksCatalogRule)();
        const payload = rule.payload;
        (0, vitest_1.expect)(payload.worksCatalog).toBe(true);
        (0, vitest_1.expect)(payload.sourceArrayPath).toBe(v2_default_typical_works_logic_util_1.V2_SOURCE_SYSTEMS_ARRAY_PATH);
        (0, vitest_1.expect)(payload.tasks).toBeUndefined();
    });
    (0, vitest_1.it)("injects row_computed and unified typical total for every typicalWork path", () => {
        const ui = {
            streamDataSources: {
                sourceTypicalTasks: { "ui:options": { archComponent: "typicalWork" } },
            },
            field_pirm: {
                "ui:options": { streamBlock: true, streamExecutor: "ПиРМ" },
                myTypical: { "ui:options": { archComponent: "typicalWork" } },
            },
        };
        const patched = (0, v2_default_typical_works_logic_util_1.patchV2TypicalWorksLogicRules)({ rules: [] }, { uiSchema: ui });
        (0, vitest_1.expect)(patched.rules.some((rule) => rule.id === "unified-typical-row-total:field_pirm_myTypical")).toBe(true);
        const unified = patched.rules.find((rule) => rule.id === "unified-typical-total");
        (0, vitest_1.expect)(unified?.dependencies).toEqual(vitest_1.expect.arrayContaining([
            "/streamDataSources/sourceTypicalTasks",
            "/field_pirm/myTypical",
        ]));
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
        (0, vitest_1.expect)(patched.rules.some((rule) => rule.id.startsWith("typical-works-catalog-"))).toBe(false);
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
        const rule = patched.rules.find((r) => r.id.startsWith("typical-works-catalog-"));
        (0, vitest_1.expect)(rule).toBeDefined();
        const payload = rule?.payload;
        (0, vitest_1.expect)(payload.worksCatalog).toBe(true);
        (0, vitest_1.expect)(payload.outputArrayPath).toBe("detailInfo.myTypicalTasks");
        (0, vitest_1.expect)(rule?.targetPath).toBe("/detailInfo/myTypicalTasks");
    });
    (0, vitest_1.it)("injects separate catalog rules per typicalWork block with bound work ids", () => {
        const patched = (0, v2_default_typical_works_logic_util_1.patchV2TypicalWorksLogicRules)({ rules: [] }, {
            jsonSchema: {
                type: "object",
                properties: {
                    field_a: { type: "array", items: { type: "object" } },
                    field_b: { type: "array", items: { type: "object" } },
                },
            },
            uiSchema: {
                field_a: {
                    "ui:options": {
                        archComponent: "typicalWork",
                        boundWorkIds: ["work-1"],
                    },
                },
                field_b: {
                    "ui:options": {
                        archComponent: "typicalWork",
                        boundWorkIds: ["work-2", "work-3"],
                    },
                },
            },
        });
        const rules = patched.rules.filter((r) => r.id.startsWith("typical-works-catalog-"));
        (0, vitest_1.expect)(rules).toHaveLength(2);
        const ruleA = rules.find((r) => r.targetPath === "/field_a");
        const ruleB = rules.find((r) => r.targetPath === "/field_b");
        (0, vitest_1.expect)((ruleA?.payload).allowedWorkIds).toEqual([
            "work-1",
        ]);
        (0, vitest_1.expect)((ruleB?.payload).allowedWorkIds).toEqual([
            "work-2",
            "work-3",
        ]);
    });
    (0, vitest_1.it)("disables catalog rule for empty boundWorkIds block", () => {
        const patched = (0, v2_default_typical_works_logic_util_1.patchV2TypicalWorksLogicRules)({ rules: [] }, {
            jsonSchema: {
                type: "object",
                properties: {
                    field_empty: { type: "array", items: { type: "object" } },
                },
            },
            uiSchema: {
                field_empty: {
                    "ui:options": {
                        archComponent: "typicalWork",
                        boundWorkIds: [],
                    },
                },
            },
        });
        const rule = patched.rules.find((r) => r.targetPath === "/field_empty");
        (0, vitest_1.expect)(rule?.condition).toBe(false);
        (0, vitest_1.expect)((rule?.payload).allowedWorkIds).toEqual([]);
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
        const rule = patched.rules.find((r) => r.id === "typical-works-catalog-field_SId8TZKZ");
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
                    condition: {
                        reduce: [
                            { var: "streamDataSources.sourceTypicalTasks" },
                            { "+": [{ var: "accumulator" }, { var: "current.total" }] },
                            0,
                        ],
                    },
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
    (0, vitest_1.it)("patches unified-typical-total to custom typicalWork output path from uiSchema", () => {
        const customPath = "streamDataSources.field_SId8TZKZ";
        const patched = (0, v2_default_typical_works_logic_util_1.patchV2TypicalWorksLogicRules)({
            rules: [
                {
                    id: "unified-typical-total",
                    kind: "computed",
                    targetPath: "/summary/typicalTotal",
                    condition: {
                        reduce: [
                            { var: "streamDataSources.sourceTypicalTasks" },
                            { "+": [{ var: "accumulator" }, { var: "current.total" }] },
                            0,
                        ],
                    },
                    dependencies: ["/streamDataSources/sourceTypicalTasks"],
                },
            ],
        }, {
            jsonSchema: {
                type: "object",
                properties: {
                    streamDataSources: {
                        type: "object",
                        properties: {
                            field_SId8TZKZ: { type: "array", items: { type: "object" } },
                        },
                    },
                },
            },
            uiSchema: {
                streamDataSources: {
                    field_SId8TZKZ: {
                        "ui:options": { archComponent: "typicalWork" },
                    },
                },
            },
        });
        const rule = patched.rules.find((r) => r.id === "unified-typical-total");
        (0, vitest_1.expect)(rule?.dependencies).toEqual([
            "/streamDataSources/field_SId8TZKZ",
        ]);
        (0, vitest_1.expect)(JSON.stringify(rule?.condition)).toContain(customPath);
        (0, vitest_1.expect)(JSON.stringify(rule?.condition)).not.toContain("streamDataSources.sourceTypicalTasks");
    });
});
