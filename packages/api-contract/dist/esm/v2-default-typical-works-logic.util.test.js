import { describe, expect, it } from "vitest";
import { buildSourceTypicalWorksCatalogRule, patchV2TypicalWorksLogicRules, V2_SOURCE_SYSTEMS_ARRAY_PATH, } from "./v2-default-typical-works-logic.util";
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
        const rule = patched.rules.find((r) => r.id === "unified-source-typical-works") ??
            buildSourceTypicalWorksCatalogRule();
        const payload = rule.payload;
        expect(payload.worksCatalog).toBe(true);
        expect(payload.sourceArrayPath).toBe(V2_SOURCE_SYSTEMS_ARRAY_PATH);
        expect(payload.tasks).toBeUndefined();
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
        expect(patched.rules.some((rule) => rule.id === "unified-source-typical-works")).toBe(false);
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
                        },
                    },
                    streamDataSources: {
                        type: "object",
                        properties: {
                            sourceTypicalTasks: {
                                type: "array",
                                items: { type: "object" },
                            },
                        },
                    },
                },
            },
            uiSchema: {
                streamDataSources: {
                    sourceTypicalTasks: {
                        "ui:options": { archComponent: "typicalWork" },
                    },
                },
            },
        });
        const rule = patched.rules.find((r) => r.id === "unified-source-typical-works");
        expect(rule).toBeDefined();
        expect((rule?.payload).worksCatalog).toBe(true);
    });
});
