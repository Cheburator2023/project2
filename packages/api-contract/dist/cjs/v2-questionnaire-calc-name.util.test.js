"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const v2_questionnaire_calc_name_util_1 = require("./v2-questionnaire-calc-name.util");
(0, vitest_1.describe)("stripQuestionnaireCalcNameFromTemplateSnapshot", () => {
    (0, vitest_1.it)("removes calcName from jsonSchema and uiSchema", () => {
        const snapshot = (0, v2_questionnaire_calc_name_util_1.stripQuestionnaireCalcNameFromTemplateSnapshot)({
            jsonSchema: {
                type: "object",
                properties: {
                    generalInfo: {
                        type: "object",
                        required: ["calcName", "businessCustomer"],
                        properties: {
                            calcName: { type: "string", title: "Название анкеты" },
                            businessCustomer: { type: "string", title: "Заказчик" },
                        },
                    },
                },
            },
            uiSchema: {
                generalInfo: {
                    "ui:order": ["calcName", "businessCustomer"],
                    calcName: { "ui:widget": "text" },
                    businessCustomer: { "ui:widget": "text" },
                },
            },
        });
        const generalInfoProps = (snapshot.jsonSchema.properties?.generalInfo).properties;
        (0, vitest_1.expect)(generalInfoProps?.calcName).toBeUndefined();
        (0, vitest_1.expect)(generalInfoProps?.businessCustomer).toBeDefined();
        (0, vitest_1.expect)((snapshot.jsonSchema.properties?.generalInfo)
            .required).toEqual(["businessCustomer"]);
        const uiGeneralInfo = snapshot.uiSchema.generalInfo;
        (0, vitest_1.expect)(uiGeneralInfo.calcName).toBeUndefined();
        (0, vitest_1.expect)(uiGeneralInfo["ui:order"]).toEqual(["businessCustomer"]);
    });
    (0, vitest_1.it)("is idempotent", () => {
        const once = (0, v2_questionnaire_calc_name_util_1.stripQuestionnaireCalcNameFromJsonSchema)({
            type: "object",
            properties: {
                generalInfo: {
                    type: "object",
                    properties: {
                        calcName: { type: "string" },
                    },
                },
            },
        });
        const twice = (0, v2_questionnaire_calc_name_util_1.stripQuestionnaireCalcNameFromJsonSchema)(once);
        (0, vitest_1.expect)(twice).toEqual(once);
    });
    (0, vitest_1.it)("leaves schema unchanged when calcName is absent", () => {
        const jsonSchema = {
            type: "object",
            properties: {
                generalInfo: {
                    type: "object",
                    properties: {
                        businessCustomer: { type: "string" },
                    },
                },
            },
        };
        const uiSchema = {
            generalInfo: {
                businessCustomer: { "ui:widget": "text" },
            },
        };
        (0, vitest_1.expect)((0, v2_questionnaire_calc_name_util_1.stripQuestionnaireCalcNameFromJsonSchema)(jsonSchema)).toEqual(jsonSchema);
        (0, vitest_1.expect)((0, v2_questionnaire_calc_name_util_1.stripQuestionnaireCalcNameFromUiSchema)(uiSchema)).toEqual(uiSchema);
    });
});
