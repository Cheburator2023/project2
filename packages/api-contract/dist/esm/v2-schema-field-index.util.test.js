import { describe, expect, it } from "vitest";
import { V2_CATALOG_SOURCE_ARCH_BY_STREAM, V2_UI_OPTION_ARCH_BLOCK_UID, V2_UI_OPTION_ARCH_COMPONENT, V2_UI_OPTION_SCHEMA_FIELD_UID, V2_UI_OPTION_SEMANTIC_ROLE, buildV2SchemaFieldIndex, resolveCatalogSourceArrayPath, resolveDotPathByArchComponent, resolveFormValueByFieldUid, resolveFormValueBySemanticRole, rewriteSchemaPathsInValue, } from "./v2-schema-field-index.util";
describe("buildV2SchemaFieldIndex", () => {
    it("indexes schemaFieldUid and archComponent after nested move-like paths", () => {
        const jsonSchema = {
            type: "object",
            properties: {
                detailInfo: {
                    type: "object",
                    properties: {
                        sectionA: {
                            type: "object",
                            properties: {
                                modelService: {
                                    type: "array",
                                    items: {
                                        type: "object",
                                        properties: {
                                            pilot: { type: "string", title: "Pilot" },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        };
        const uiSchema = {
            detailInfo: {
                sectionA: {
                    modelService: {
                        "ui:options": {
                            [V2_UI_OPTION_ARCH_COMPONENT]: "modelService",
                            [V2_UI_OPTION_ARCH_BLOCK_UID]: "block-ms-1",
                            [V2_UI_OPTION_SEMANTIC_ROLE]: "modelService",
                        },
                        items: {
                            pilot: {
                                "ui:options": {
                                    [V2_UI_OPTION_SCHEMA_FIELD_UID]: "field-pilot-1",
                                    [V2_UI_OPTION_SEMANTIC_ROLE]: "prePromEval",
                                },
                            },
                        },
                    },
                },
            },
        };
        const index = buildV2SchemaFieldIndex(jsonSchema, uiSchema);
        expect(resolveDotPathByArchComponent(index, "modelService")).toBe("detailInfo.sectionA.modelService");
        expect(index.byBlockUid.get("block-ms-1")?.dotPath).toBe("detailInfo.sectionA.modelService");
        expect(index.byUid.get("field-pilot-1")?.dotPath).toBe("detailInfo.sectionA.modelService.pilot");
        expect(index.byRole.get("prePromEval")).toBe("field-pilot-1");
        expect(index.byRole.get("modelService")).toBe("block-ms-1");
    });
    it("resolves form values by uid and semantic role", () => {
        const jsonSchema = {
            type: "object",
            properties: {
                generalInfo: {
                    type: "object",
                    properties: {
                        channels: { type: "string", title: "Channels" },
                    },
                },
            },
        };
        const uiSchema = {
            generalInfo: {
                channels: {
                    "ui:options": {
                        [V2_UI_OPTION_SCHEMA_FIELD_UID]: "field-channels",
                        [V2_UI_OPTION_SEMANTIC_ROLE]: "deploymentChannels",
                    },
                },
            },
        };
        const index = buildV2SchemaFieldIndex(jsonSchema, uiSchema);
        const formData = { generalInfo: { channels: "Онлайн" } };
        expect(resolveFormValueByFieldUid(formData, index, "field-channels")).toBe("Онлайн");
        expect(resolveFormValueBySemanticRole(formData, index, "deploymentChannels")).toBe("Онлайн");
    });
    it("resolveCatalogSourceArrayPath prefers live arch path over hardcoded fallback", () => {
        const jsonSchema = {
            type: "object",
            properties: {
                elsewhere: {
                    type: "object",
                    properties: {
                        sourceSystems: { type: "array", items: { type: "object" } },
                    },
                },
            },
        };
        const uiSchema = {
            elsewhere: {
                sourceSystems: {
                    "ui:options": {
                        [V2_UI_OPTION_ARCH_COMPONENT]: V2_CATALOG_SOURCE_ARCH_BY_STREAM.sourceSystems,
                        [V2_UI_OPTION_ARCH_BLOCK_UID]: "block-src-1",
                    },
                },
            },
        };
        expect(resolveCatalogSourceArrayPath({
            jsonSchema,
            uiSchema,
            sourceArchComponent: V2_CATALOG_SOURCE_ARCH_BY_STREAM.sourceSystems,
            fallbackPath: "detailInfo.sourceSystems",
        })).toBe("elsewhere.sourceSystems");
    });
    it("rewriteSchemaPathsInValue rewrites dot and pointer prefixes", () => {
        const logic = {
            condition: { var: "generalInfo.modelService.prePromEval" },
            targetPath: "/generalInfo/modelService/prePromEval",
            payload: {
                sourceArrayPath: "generalInfo.modelService",
                nested: "generalInfo.modelService.workType",
            },
        };
        expect(rewriteSchemaPathsInValue(logic, "/generalInfo/modelService", "/detailInfo/movedService")).toEqual({
            condition: { var: "detailInfo.movedService.prePromEval" },
            targetPath: "/detailInfo/movedService/prePromEval",
            payload: {
                sourceArrayPath: "detailInfo.movedService",
                nested: "detailInfo.movedService.workType",
            },
        });
    });
});
