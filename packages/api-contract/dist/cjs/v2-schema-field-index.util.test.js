"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const v2_schema_field_index_util_1 = require("./v2-schema-field-index.util");
(0, vitest_1.describe)("buildV2SchemaFieldIndex", () => {
    (0, vitest_1.it)("indexes schemaFieldUid and archComponent after nested move-like paths", () => {
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
                            [v2_schema_field_index_util_1.V2_UI_OPTION_ARCH_COMPONENT]: "modelService",
                            [v2_schema_field_index_util_1.V2_UI_OPTION_ARCH_BLOCK_UID]: "block-ms-1",
                            [v2_schema_field_index_util_1.V2_UI_OPTION_SEMANTIC_ROLE]: "modelService",
                        },
                        items: {
                            pilot: {
                                "ui:options": {
                                    [v2_schema_field_index_util_1.V2_UI_OPTION_SCHEMA_FIELD_UID]: "field-pilot-1",
                                    [v2_schema_field_index_util_1.V2_UI_OPTION_SEMANTIC_ROLE]: "prePromEval",
                                },
                            },
                        },
                    },
                },
            },
        };
        const index = (0, v2_schema_field_index_util_1.buildV2SchemaFieldIndex)(jsonSchema, uiSchema);
        (0, vitest_1.expect)((0, v2_schema_field_index_util_1.resolveDotPathByArchComponent)(index, "modelService")).toBe("detailInfo.sectionA.modelService");
        (0, vitest_1.expect)(index.byBlockUid.get("block-ms-1")?.dotPath).toBe("detailInfo.sectionA.modelService");
        (0, vitest_1.expect)(index.byUid.get("field-pilot-1")?.dotPath).toBe("detailInfo.sectionA.modelService.pilot");
        (0, vitest_1.expect)(index.byRole.get("prePromEval")).toBe("field-pilot-1");
        (0, vitest_1.expect)(index.byRole.get("modelService")).toBe("block-ms-1");
    });
    (0, vitest_1.it)("resolves form values by uid and semantic role", () => {
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
                        [v2_schema_field_index_util_1.V2_UI_OPTION_SCHEMA_FIELD_UID]: "field-channels",
                        [v2_schema_field_index_util_1.V2_UI_OPTION_SEMANTIC_ROLE]: "deploymentChannels",
                    },
                },
            },
        };
        const index = (0, v2_schema_field_index_util_1.buildV2SchemaFieldIndex)(jsonSchema, uiSchema);
        const formData = { generalInfo: { channels: "Онлайн" } };
        (0, vitest_1.expect)((0, v2_schema_field_index_util_1.resolveFormValueByFieldUid)(formData, index, "field-channels")).toBe("Онлайн");
        (0, vitest_1.expect)((0, v2_schema_field_index_util_1.resolveFormValueBySemanticRole)(formData, index, "deploymentChannels")).toBe("Онлайн");
    });
    (0, vitest_1.it)("resolveCatalogSourceArrayPath prefers live arch path over hardcoded fallback", () => {
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
                        [v2_schema_field_index_util_1.V2_UI_OPTION_ARCH_COMPONENT]: v2_schema_field_index_util_1.V2_CATALOG_SOURCE_ARCH_BY_STREAM.sourceSystems,
                        [v2_schema_field_index_util_1.V2_UI_OPTION_ARCH_BLOCK_UID]: "block-src-1",
                    },
                },
            },
        };
        (0, vitest_1.expect)((0, v2_schema_field_index_util_1.resolveCatalogSourceArrayPath)({
            jsonSchema,
            uiSchema,
            sourceArchComponent: v2_schema_field_index_util_1.V2_CATALOG_SOURCE_ARCH_BY_STREAM.sourceSystems,
            fallbackPath: "detailInfo.sourceSystems",
        })).toBe("elsewhere.sourceSystems");
    });
    (0, vitest_1.it)("rewriteSchemaPathsInValue rewrites dot and pointer prefixes", () => {
        const logic = {
            condition: { var: "generalInfo.modelService.prePromEval" },
            targetPath: "/generalInfo/modelService/prePromEval",
            payload: {
                sourceArrayPath: "generalInfo.modelService",
                nested: "generalInfo.modelService.workType",
            },
        };
        (0, vitest_1.expect)((0, v2_schema_field_index_util_1.rewriteSchemaPathsInValue)(logic, "/generalInfo/modelService", "/detailInfo/movedService")).toEqual({
            condition: { var: "detailInfo.movedService.prePromEval" },
            targetPath: "/detailInfo/movedService/prePromEval",
            payload: {
                sourceArrayPath: "detailInfo.movedService",
                nested: "detailInfo.movedService.workType",
            },
        });
    });
});
