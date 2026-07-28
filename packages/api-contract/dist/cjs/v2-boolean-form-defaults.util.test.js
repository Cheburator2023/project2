"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const v2_boolean_form_defaults_util_1 = require("./v2-boolean-form-defaults.util");
(0, vitest_1.describe)("v2-boolean-form-defaults", () => {
    const modelSchema = {
        type: "object",
        properties: {
            detailInfo: {
                type: "object",
                properties: {
                    modelsList: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                name: { type: "string" },
                                readyPromReports: { type: "boolean" },
                                autoML: { type: "boolean" },
                            },
                        },
                    },
                },
            },
        },
    };
    (0, vitest_1.it)("fills missing booleans with false in array items", () => {
        const result = (0, v2_boolean_form_defaults_util_1.applyBooleanDefaultsToFormData)({
            detailInfo: {
                modelsList: [
                    { name: "a", readyPromReports: true },
                    { name: "b" },
                    { name: "c", readyPromReports: "Нет" },
                ],
            },
        }, modelSchema);
        const models = result.detailInfo
            .modelsList;
        (0, vitest_1.expect)(models[0]).toMatchObject({
            readyPromReports: true,
            autoML: false,
        });
        (0, vitest_1.expect)(models[1]).toMatchObject({
            readyPromReports: false,
            autoML: false,
        });
        (0, vitest_1.expect)(models[2]).toMatchObject({
            readyPromReports: false,
            autoML: false,
        });
    });
    (0, vitest_1.it)("does not create empty object branches only for booleans", () => {
        const result = (0, v2_boolean_form_defaults_util_1.applyBooleanDefaultsToFormData)({}, modelSchema);
        (0, vitest_1.expect)(result.detailInfo).toBeUndefined();
    });
    (0, vitest_1.it)("applies defaults to a single object schema slice", () => {
        (0, vitest_1.expect)((0, v2_boolean_form_defaults_util_1.applyBooleanDefaultsToObject)({ name: "x" }, {
            type: "object",
            properties: {
                name: { type: "string" },
                readyPromReports: { type: "boolean" },
            },
        })).toEqual({ name: "x", readyPromReports: false });
    });
});
