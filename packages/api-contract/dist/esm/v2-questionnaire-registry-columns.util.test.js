import { describe, expect, it } from "vitest";
import { buildV2QuestionnaireRegistryColumnTree, buildV2QuestionnaireRegistryExportColumns, flattenV2RegistryColumnTree, registryFormColumnId, V2_UNCERTAINTY_RISK_GROUP_LABELS, } from "./v2-questionnaire-registry-columns.util";
const MINIMAL_SCHEMA = {
    type: "object",
    properties: {
        generalInfo: {
            type: "object",
            properties: {
                calcName: { type: "string", title: "Название анкеты" },
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
    generalInfo: { "ui:order": ["calcName", "businessCustomer"] },
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
});
