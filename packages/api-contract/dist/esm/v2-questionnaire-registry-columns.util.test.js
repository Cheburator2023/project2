import { describe, expect, it } from "vitest";
import { buildV2QuestionnaireRegistryColumnTree, buildV2QuestionnaireRegistryConfig, buildV2QuestionnaireRegistryExportColumns, collectRegistryArrayIndicesFromRows, deriveRegistryColumnOptionsFromRows, flattenV2RegistryColumnTree, mergeV2QuestionnaireRegistryColumnTrees, registryFormColumnId, V2_UNCERTAINTY_RISK_GROUP_LABELS, } from "./v2-questionnaire-registry-columns.util";
const MINIMAL_SCHEMA = {
    type: "object",
    properties: {
        generalInfo: {
            type: "object",
            properties: {
                businessCustomer: { type: "string", title: "Заказчик" },
            },
        },
        uncertaintyCalculation: {
            type: "object",
            properties: {
                riskGroup: {
                    type: "object",
                    properties: {
                        businessComplexity: {
                            type: "string",
                            title: "Сложность бизнес-процессов",
                        },
                    },
                },
            },
        },
        detailInfo: {
            type: "object",
            properties: {
                parameters: {
                    type: "object",
                    properties: {
                        streamNames: { type: "string", title: "Названия стримов" },
                        streamsOutsideDADM: {
                            type: "boolean",
                            title: "Стримы вне ДАДМ",
                        },
                    },
                },
                modelsList: {
                    type: "array",
                    title: "Модели",
                    items: {
                        type: "object",
                        properties: {
                            field_role: { type: "string", title: "Каскад/ансамбль" },
                            workType: { type: "string", title: "Тип работ" },
                        },
                    },
                },
            },
        },
    },
};
const MINIMAL_UI = {
    generalInfo: { "ui:order": ["businessCustomer"] },
    uncertaintyCalculation: {
        riskGroup: { "ui:order": ["businessComplexity"] },
    },
    detailInfo: {
        "ui:order": ["parameters", "modelsList"],
        parameters: { "ui:order": ["streamsOutsideDADM", "streamNames"] },
        modelsList: {
            items: { "ui:order": ["field_role", "workType"] },
        },
    },
};
describe("v2-questionnaire-registry-columns.util", () => {
    it("uses dotted form column ids", () => {
        expect(registryFormColumnId("detailInfo.parameters.streamNames")).toBe("form.detailInfo.parameters.streamNames");
    });
    it("localizes risk group headers from schema titles", () => {
        const columns = buildV2QuestionnaireRegistryExportColumns(MINIMAL_SCHEMA, MINIMAL_UI);
        const riskCol = columns.find((col) => col.key.includes("riskGroup.businessComplexity"));
        expect(riskCol?.header).toBe("Сложность бизнес-процессов");
    });
    it("includes schema parameters and model list fields", () => {
        const leaves = flattenV2RegistryColumnTree(buildV2QuestionnaireRegistryColumnTree(MINIMAL_SCHEMA, MINIMAL_UI, {
            arrayMaxItems: 1,
        }));
        const ids = leaves.map((leaf) => leaf.id);
        expect(ids).toContain("form.detailInfo.parameters.streamNames");
        expect(ids).toContain("form.detailInfo.parameters.streamsOutsideDADM");
        expect(ids).toContain("form.detailInfo.modelsList[0].field_role");
    });
    it("falls back to static russian risk labels without schema", () => {
        const columns = buildV2QuestionnaireRegistryExportColumns();
        const riskCol = columns.find((col) => col.key.includes("riskGroup.businessComplexity"));
        expect(riskCol?.header).toBe(V2_UNCERTAINTY_RISK_GROUP_LABELS.businessComplexity);
    });
    it("builds E2E stage columns from questionnaire data, not fixed slots", () => {
        const rows = [
            {
                id: "q1",
                formData: {
                    summary: {
                        detailedCalculation: Array.from({ length: 11 }, (_, index) => ({
                            stageName: `Этап ${index + 1}`,
                            baseScore: index,
                        })),
                    },
                },
            },
        ];
        const options = deriveRegistryColumnOptionsFromRows(rows);
        const leaves = flattenV2RegistryColumnTree(buildV2QuestionnaireRegistryColumnTree({
            type: "object",
            properties: {
                summary: {
                    type: "object",
                    properties: {
                        detailedCalculation: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    stageName: { type: "string", title: "Этап" },
                                    baseScore: { type: "number", title: "Базовая" },
                                },
                            },
                        },
                    },
                },
            },
        }, { summary: { detailedCalculation: { items: {} } } }, options));
        const stageGroups = leaves.filter((leaf) => leaf.formPath?.startsWith("summary.detailedCalculation["));
        expect(collectRegistryArrayIndicesFromRows(rows, "summary.detailedCalculation")).toHaveLength(11);
        expect(stageGroups.some((leaf) => leaf.formPath?.includes("[10]."))).toBe(true);
        expect(leaves.some((leaf) => leaf.id === "form.summary.detailedCalculation[0].baseScore")).toBe(true);
    });
    it("omits platform stream slots when data is absent", () => {
        const rows = [{ id: "q1", formData: {} }];
        const options = deriveRegistryColumnOptionsFromRows(rows);
        const leaves = flattenV2RegistryColumnTree(buildV2QuestionnaireRegistryColumnTree({
            type: "object",
            properties: {
                summary: {
                    type: "object",
                    properties: {
                        platformStreams: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    streamName: { type: "string", title: "Стрим" },
                                },
                            },
                        },
                    },
                },
            },
        }, { summary: { platformStreams: { items: {} } } }, options));
        expect(leaves.some((leaf) => leaf.formPath?.startsWith("summary.platformStreams["))).toBe(false);
    });
    it("discovers array indices for sourceSystems from questionnaire rows", () => {
        const rows = [
            {
                id: "q1",
                formData: {
                    detailInfo: {
                        sourceSystems: [
                            { name: "Система 1" },
                            { name: "Система 2" },
                            { name: "Система 3" },
                        ],
                    },
                },
            },
        ];
        const options = deriveRegistryColumnOptionsFromRows(rows);
        expect(options.arrayIndicesByPath?.["detailInfo.sourceSystems"]).toEqual([
            0, 1, 2,
        ]);
    });
    it("merges column trees from different schema versions", () => {
        const merged = mergeV2QuestionnaireRegistryColumnTrees([
            buildV2QuestionnaireRegistryColumnTree({
                type: "object",
                properties: {
                    generalInfo: {
                        type: "object",
                        properties: {
                            fieldA: { type: "string", title: "Поле A" },
                        },
                    },
                },
            }, { generalInfo: { "ui:order": ["fieldA"] } }),
            buildV2QuestionnaireRegistryColumnTree({
                type: "object",
                properties: {
                    generalInfo: {
                        type: "object",
                        properties: {
                            fieldB: { type: "string", title: "Поле B" },
                        },
                    },
                },
            }, { generalInfo: { "ui:order": ["fieldB"] } }),
        ]);
        const ids = flattenV2RegistryColumnTree(merged).map((leaf) => leaf.id);
        expect(ids).toContain("form.generalInfo.fieldA");
        expect(ids).toContain("form.generalInfo.fieldB");
    });
    it("buildV2QuestionnaireRegistryConfig merges schemas", () => {
        const config = buildV2QuestionnaireRegistryConfig([
            {
                jsonSchema: {
                    type: "object",
                    properties: {
                        generalInfo: {
                            type: "object",
                            properties: {
                                fieldA: { type: "string", title: "A" },
                            },
                        },
                    },
                },
                uiSchema: { generalInfo: { "ui:order": ["fieldA"] } },
            },
            {
                jsonSchema: {
                    type: "object",
                    properties: {
                        generalInfo: {
                            type: "object",
                            properties: {
                                fieldB: { type: "string", title: "B" },
                            },
                        },
                    },
                },
                uiSchema: { generalInfo: { "ui:order": ["fieldB"] } },
            },
        ], []);
        const ids = flattenV2RegistryColumnTree(config.columnTree).map((leaf) => leaf.id);
        expect(ids).toContain("form.generalInfo.fieldA");
        expect(ids).toContain("form.generalInfo.fieldB");
    });
});
