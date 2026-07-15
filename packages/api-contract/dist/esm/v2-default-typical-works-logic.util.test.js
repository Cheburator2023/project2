import { describe, expect, it } from "vitest";
import { buildSourceTypicalWorksCatalogRule, buildTypicalWorkRowTotalCondition, patchV2TypicalWorksLogicRules, V2_SOURCE_SYSTEMS_ARRAY_PATH, } from "./v2-default-typical-works-logic.util";
describe("v2-default-typical-works-logic.util", () => {
    it("replaces legacy static-tasks rule with worksCatalog and v5 paths", () => {
        const patched = patchV2TypicalWorksLogicRules({
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
            buildSourceTypicalWorksCatalogRule();
        const payload = rule.payload;
        expect(payload.worksCatalog).toBe(true);
        expect(payload.sourceArrayPath).toBe(V2_SOURCE_SYSTEMS_ARRAY_PATH);
        expect(payload.tasks).toBeUndefined();
    });
    it("injects row_computed and unified typical total for every typicalWork path", () => {
        const ui = {
            streamDataSources: {
                sourceTypicalTasks: { "ui:options": { archComponent: "typicalWork" } },
            },
            field_pirm: {
                "ui:options": { streamBlock: true, streamExecutor: "ПиРМ" },
                myTypical: { "ui:options": { archComponent: "typicalWork" } },
            },
        };
        const patched = patchV2TypicalWorksLogicRules({ rules: [] }, { uiSchema: ui });
        expect(patched.rules.some((rule) => rule.id === "unified-typical-row-total:field_pirm_myTypical")).toBe(true);
        const rowRule = patched.rules.find((rule) => rule.id === "unified-typical-row-total:field_pirm_myTypical");
        expect(rowRule?.condition).toEqual(buildTypicalWorkRowTotalCondition());
        const unified = patched.rules.find((rule) => rule.id === "unified-typical-total");
        expect(unified?.dependencies).toEqual(expect.arrayContaining([
            "/streamDataSources/sourceTypicalTasks",
            "/field_pirm/myTypical",
        ]));
    });
    it("does not inject catalog rules into partial logic graphs", () => {
        const patched = patchV2TypicalWorksLogicRules({
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
        expect(patched.rules.some((rule) => rule.id.startsWith("typical-works-catalog-"))).toBe(false);
    });
    it("injects source catalog rule when schema has source systems and typical tasks block", () => {
        const patched = patchV2TypicalWorksLogicRules({ rules: [] }, {
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
        expect(rule).toBeDefined();
        const payload = rule?.payload;
        expect(payload.worksCatalog).toBe(true);
        expect(payload.outputArrayPath).toBe("detailInfo.myTypicalTasks");
        expect(rule?.targetPath).toBe("/detailInfo/myTypicalTasks");
    });
    it("injects separate catalog rules per typicalWork block with bound work ids", () => {
        const patched = patchV2TypicalWorksLogicRules({ rules: [] }, {
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
        expect(rules).toHaveLength(2);
        const ruleA = rules.find((r) => r.targetPath === "/field_a");
        const ruleB = rules.find((r) => r.targetPath === "/field_b");
        expect((ruleA?.payload).allowedWorkIds).toEqual([
            "work-1",
        ]);
        expect((ruleB?.payload).allowedWorkIds).toEqual([
            "work-2",
            "work-3",
        ]);
    });
    it("disables catalog rule for empty boundWorkIds block", () => {
        const patched = patchV2TypicalWorksLogicRules({ rules: [] }, {
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
        expect(rule?.condition).toBe(false);
        expect((rule?.payload).allowedWorkIds).toEqual([]);
    });
    it("injects source catalog rule for root-level typicalWork block without sourceSystems", () => {
        const patched = patchV2TypicalWorksLogicRules({ rules: [] }, {
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
        expect(rule).toBeDefined();
        const payload = rule?.payload;
        expect(payload.outputArrayPath).toBe("field_SId8TZKZ");
        expect(rule?.targetPath).toBe("/field_SId8TZKZ");
    });
    it("migrates legacy visibility row-total rules to row_computed", () => {
        const patched = patchV2TypicalWorksLogicRules({
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
        expect(rule?.kind).toBe("row_computed");
    });
    it("patches slash-format legacy control typical tasks paths", () => {
        const patched = patchV2TypicalWorksLogicRules({
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
        expect(rule?.dependencies).toEqual([
            "/streamDataSources/sourceTypicalTasks",
            "/streamModelControl/field_G0AoYAl8",
        ]);
    });
    it("drops legacy unified-control-row-total rule", () => {
        const patched = patchV2TypicalWorksLogicRules({
            rules: [
                {
                    id: "unified-control-row-total",
                    kind: "row_computed",
                    targetPath: "/streamModelControl/field_Khn6-HAW",
                    condition: true,
                    dependencies: [],
                    payload: {
                        fieldVar: "total",
                        arrayPath: "streamModelControl.field_Khn6-HAW",
                    },
                },
            ],
        });
        expect(patched.rules.some((rule) => rule.id === "unified-control-row-total")).toBe(false);
    });
    it("patches unified-typical-total to custom typicalWork output path from uiSchema", () => {
        const customPath = "streamDataSources.field_SId8TZKZ";
        const patched = patchV2TypicalWorksLogicRules({
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
        expect(rule?.dependencies).toEqual([
            "/streamDataSources/field_SId8TZKZ",
        ]);
        expect(JSON.stringify(rule?.condition)).toContain(customPath);
        expect(JSON.stringify(rule?.condition)).not.toContain("streamDataSources.sourceTypicalTasks");
    });
});
