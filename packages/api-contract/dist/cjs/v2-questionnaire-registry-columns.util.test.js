"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const v2_questionnaire_registry_columns_util_1 = require("./v2-questionnaire-registry-columns.util");
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
(0, vitest_1.describe)("v2-questionnaire-registry-columns.util", () => {
    (0, vitest_1.it)("uses dotted form column ids", () => {
        (0, vitest_1.expect)((0, v2_questionnaire_registry_columns_util_1.registryFormColumnId)("detailInfo.parameters.streamNames")).toBe("form.detailInfo.parameters.streamNames");
    });
    (0, vitest_1.it)("localizes risk group headers from schema titles", () => {
        const columns = (0, v2_questionnaire_registry_columns_util_1.buildV2QuestionnaireRegistryExportColumns)(MINIMAL_SCHEMA, MINIMAL_UI);
        const riskCol = columns.find((col) => col.key.includes("riskGroup.businessComplexity"));
        (0, vitest_1.expect)(riskCol?.header).toBe("Сложность бизнес-процессов");
    });
    (0, vitest_1.it)("includes schema parameters and model list fields", () => {
        const leaves = (0, v2_questionnaire_registry_columns_util_1.flattenV2RegistryColumnTree)((0, v2_questionnaire_registry_columns_util_1.buildV2QuestionnaireRegistryColumnTree)(MINIMAL_SCHEMA, MINIMAL_UI, {
            arrayMaxItems: 1,
        }));
        const ids = leaves.map((leaf) => leaf.id);
        (0, vitest_1.expect)(ids).toContain("form.detailInfo.parameters.streamNames");
        (0, vitest_1.expect)(ids).toContain("form.detailInfo.parameters.streamsOutsideDADM");
        (0, vitest_1.expect)(ids).toContain("form.detailInfo.modelsList[0].field_role");
    });
    (0, vitest_1.it)("falls back to static russian risk labels without schema", () => {
        const columns = (0, v2_questionnaire_registry_columns_util_1.buildV2QuestionnaireRegistryExportColumns)();
        const riskCol = columns.find((col) => col.key.includes("riskGroup.businessComplexity"));
        (0, vitest_1.expect)(riskCol?.header).toBe(v2_questionnaire_registry_columns_util_1.V2_UNCERTAINTY_RISK_GROUP_LABELS.businessComplexity);
    });
});
