"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const v2_template_work_schema_params_util_1 = require("./v2-template-work-schema-params.util");
const v2_work_schema_params_match_util_1 = require("./v2-work-schema-params-match.util");
const v2_works_catalog_match_util_1 = require("./v2-works-catalog-match.util");
(0, vitest_1.describe)("typicalWorkRulesMatchSourceWithSchema", () => {
    const schemaParams = [
        {
            code: "field_metrics",
            name: "Количество метрик",
            values: [],
        },
        {
            code: "type",
            name: "Тип системы-источника",
            values: [
                { code: "Внутренний", label: "Внутренний" },
                { code: "Внешний", label: "Внешний" },
            ],
        },
    ];
    (0, vitest_1.it)("matches legacy slug trigger against schema field key in source", () => {
        const rules = [
            {
                paramCode: "количество_метрик",
                paramName: "Количество метрик",
                operator: ">=",
                valueCode: "10",
                valueLabel: "10",
            },
        ];
        (0, vitest_1.expect)((0, v2_works_catalog_match_util_1.typicalWorkRulesMatchSource)(rules, { field_metrics: 12 })).toBe(false);
        (0, vitest_1.expect)((0, v2_work_schema_params_match_util_1.typicalWorkRulesMatchSourceWithSchema)(rules, { field_metrics: 12 }, [
            ...schemaParams,
        ])).toBe(true);
    });
    (0, vitest_1.it)("rewrites rule paramCode for downstream matching", () => {
        const rules = [
            {
                paramCode: "тип_системы_источника",
                paramName: "Тип системы-источника",
                operator: "=",
                valueCode: "внутренний",
                valueLabel: "Внутренний",
            },
        ];
        const resolved = (0, v2_work_schema_params_match_util_1.resolveTypicalWorkRulesForSourceMatch)(rules, schemaParams);
        (0, vitest_1.expect)(resolved[0]?.paramCode).toBe("type");
        (0, vitest_1.expect)((0, v2_work_schema_params_match_util_1.typicalWorkRulesMatchSourceWithSchema)(rules, { type: "Внутренний" }, [
            ...schemaParams,
        ])).toBe(true);
    });
});
(0, vitest_1.describe)("buildWorkSchemaParamsFromTemplate", () => {
    (0, vitest_1.it)("collects leaf fields from nested schema", () => {
        const params = (0, v2_template_work_schema_params_util_1.buildWorkSchemaParamsFromTemplate)({
            jsonSchema: {
                type: "object",
                properties: {
                    streamDataSources: {
                        type: "object",
                        properties: {
                            sourceSystems: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        type: {
                                            type: "string",
                                            title: "Тип системы-источника",
                                            enum: ["Внутренний", "Внешний"],
                                        },
                                        field_metric: {
                                            type: "number",
                                            title: "Количество метрик",
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
            uiSchema: {
                streamDataSources: {
                    sourceSystems: {
                        items: {
                            type: {
                                "ui:options": { schemaFieldUid: "uid-type" },
                            },
                            field_metric: {
                                "ui:options": { schemaFieldUid: "uid-metric" },
                            },
                        },
                    },
                },
            },
        });
        (0, vitest_1.expect)(params.some((p) => p.code === "type")).toBe(true);
        (0, vitest_1.expect)(params.find((p) => p.code === "type")?.schemaFieldUid).toBe("uid-type");
        (0, vitest_1.expect)(params.some((p) => p.code === "field_metric")).toBe(true);
    });
});
(0, vitest_1.describe)("collectTypicalWorkSchemaConsistencyIssues", () => {
    (0, vitest_1.it)("reports orphan trigger and schema-linked labor params", () => {
        const issues = (0, v2_template_work_schema_params_util_1.collectTypicalWorkSchemaConsistencyIssues)({
            schemaParams: [{ code: "type", name: "Тип системы-источника", values: [] }],
            rules: [
                {
                    paramCode: "missing",
                    paramName: "Missing",
                    operator: "=",
                    valueCode: "x",
                    valueLabel: "x",
                },
            ],
            laborParamCodes: [
                { paramCode: "orphan", paramName: "Orphan", schemaFieldUid: "uid-1" },
            ],
        });
        (0, vitest_1.expect)(issues.some((issue) => issue.kind === "trigger")).toBe(true);
        (0, vitest_1.expect)(issues.some((issue) => issue.kind === "labor")).toBe(true);
    });
    (0, vitest_1.it)("ignores methodology-only labor params without schemaFieldUid", () => {
        const issues = (0, v2_template_work_schema_params_util_1.collectTypicalWorkSchemaConsistencyIssues)({
            schemaParams: [{ code: "type", name: "Тип системы-источника", values: [] }],
            rules: [],
            laborParamCodes: [
                { paramCode: "пилот_первичный", paramName: "? Пилот (первичный" },
            ],
        });
        (0, vitest_1.expect)(issues).toEqual([]);
    });
    (0, vitest_1.it)("ignores methodology presence triggers not bound to schema fields", () => {
        const issues = (0, v2_template_work_schema_params_util_1.collectTypicalWorkSchemaConsistencyIssues)({
            schemaParams: [{ code: "type", name: "Тип системы-источника", values: [] }],
            rules: [
                {
                    paramCode: "пилот_первичный",
                    paramName: "? Пилот (первичный",
                    operator: "=",
                    valueCode: null,
                    valueLabel: null,
                },
                {
                    paramCode: "повторный",
                    paramName: "повторный)",
                    operator: "=",
                    valueCode: null,
                    valueLabel: null,
                },
                {
                    paramCode: "",
                    paramName: "?",
                    operator: "=",
                    valueCode: null,
                    valueLabel: null,
                },
            ],
            laborParamCodes: [],
        });
        (0, vitest_1.expect)(issues).toEqual([]);
    });
    (0, vitest_1.it)("resolves control type trigger to вид контроля field, not unrelated schema fields", () => {
        const issues = (0, v2_template_work_schema_params_util_1.collectTypicalWorkSchemaConsistencyIssues)({
            schemaParams: [
                {
                    code: "field_adjacent",
                    name: "Негативное влияние смежных проектов на показатели проекта",
                    values: [{ code: "low", label: "Низкий" }],
                },
                {
                    code: "field_control",
                    name: "Вид контроля",
                    values: [
                        { code: "ок", label: "ОК — Оперативный контроль" },
                        { code: "кд", label: "КД — Качество модельных данных" },
                    ],
                },
            ],
            rules: [
                {
                    paramCode: "вид_контроля_ок",
                    paramName: "Вид контроля: ОК",
                    operator: "=",
                    valueCode: "ок",
                    valueLabel: "ОК",
                },
            ],
            laborParamCodes: [],
        });
        (0, vitest_1.expect)(issues).toEqual([]);
    });
    (0, vitest_1.it)("matches trigger enum values case-insensitively", () => {
        const issues = (0, v2_template_work_schema_params_util_1.collectTypicalWorkSchemaConsistencyIssues)({
            schemaParams: [
                {
                    code: "type",
                    name: "Тип системы-источника",
                    sourceKeys: ["type", "тип_системы_источника"],
                    values: [
                        { code: "Внутренний", label: "Внутренний" },
                        { code: "Внешний", label: "Внешний" },
                    ],
                },
            ],
            rules: [
                {
                    paramCode: "тип_системы_источника",
                    paramName: "Тип системы-источника",
                    operator: "=",
                    valueCode: "внутренний",
                    valueLabel: "Внутренний",
                },
            ],
            laborParamCodes: [],
        });
        (0, vitest_1.expect)(issues).toEqual([]);
    });
});
(0, vitest_1.describe)("findCatalogPreviousCodeForSchemaParam", () => {
    (0, vitest_1.it)("matches catalog item by normalized title", () => {
        const code = (0, v2_template_work_schema_params_util_1.findCatalogPreviousCodeForSchemaParam)([{ code: "тип_системы_источника", name: "Тип системы-источника" }], { code: "type", name: "Тип системы-источника" });
        (0, vitest_1.expect)(code).toBe("тип_системы_источника");
    });
});
(0, vitest_1.describe)("schemaEnumValueMatchesRule", () => {
    (0, vitest_1.it)("matches legacy lowercase trigger codes to schema enum labels", () => {
        (0, vitest_1.expect)((0, v2_template_work_schema_params_util_1.schemaEnumValueMatchesRule)({ code: "Внутренний", label: "Внутренний" }, { valueCode: "внутренний", valueLabel: "Внутренний" })).toBe(true);
    });
});
