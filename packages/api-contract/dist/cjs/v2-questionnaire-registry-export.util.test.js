"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const v2_questionnaire_registry_export_util_1 = require("./v2-questionnaire-registry-export.util");
(0, vitest_1.describe)("v2-questionnaire-registry-export.util", () => {
    (0, vitest_1.it)("formats booleans and nested form paths", () => {
        (0, vitest_1.expect)((0, v2_questionnaire_registry_export_util_1.formatV2RegistryExportCellValue)(true)).toBe("Да");
        (0, vitest_1.expect)((0, v2_questionnaire_registry_export_util_1.formatV2RegistryExportCellValue)(null)).toBe("");
    });
    (0, vitest_1.it)("builds export row with registry and form fields", () => {
        const row = {
            id: "id-1",
            calcName: "Test anketa",
            status: "active",
            version: "1",
            seriesId: "s1",
            parentQuestionnaireId: null,
            readableId: "V2-1-v1",
            templateId: "t1",
            templateCode: null,
            templateName: "Новая схема",
            boundTemplateVersionId: "v1",
            formData: {
                detailInfo: {
                    parameters: {
                        streamsOutsideDADM: true,
                        streamNames: "Alpha, Beta",
                    },
                },
            },
            finalCoefficient: 1.2,
            author: "Author",
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-02T00:00:00.000Z",
            schemaBinding: {
                status: "aligned",
                boundTemplateVersionId: "v1",
                boundTemplateVersionNumber: 1,
                boundTemplateVersionStatus: "published",
                currentTemplateVersionId: "v1",
                currentTemplateVersionNumber: 1,
                message: "",
            },
            workflowGlobalStatus: null,
            workflowSectionStatuses: {
                generalInfo: "В работе",
                detailInfo: "В работе",
                streamDataSources: "Создано",
                streamModelControl: "Создано",
            },
        };
        const exported = (0, v2_questionnaire_registry_export_util_1.buildV2QuestionnaireRegistryExportRow)(row);
        (0, vitest_1.expect)(exported.calcName).toBe("Test anketa");
        (0, vitest_1.expect)(exported["form.detailInfo.parameters.streamNames"]).toBe("Alpha, Beta");
    });
});
