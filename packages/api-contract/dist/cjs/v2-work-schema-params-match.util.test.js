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
                        "ui:options": { archComponent: "sourceSystem" },
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
        (0, vitest_1.expect)(params.find((p) => p.code === "field_metric")?.archComponent).toBe("Система-источник");
    });
    (0, vitest_1.it)("collects array-of-enum fields as schema params", () => {
        const params = (0, v2_template_work_schema_params_util_1.buildWorkSchemaParamsFromTemplate)({
            jsonSchema: {
                type: "object",
                properties: {
                    modelService: {
                        type: "object",
                        properties: {
                            field_jUm5syZf: {
                                type: "array",
                                title: "Каналы внедрения",
                                items: {
                                    type: "string",
                                    enum: ["Батч", "Онлайн"],
                                },
                            },
                        },
                    },
                },
            },
            uiSchema: {
                modelService: {
                    field_jUm5syZf: {
                        "ui:options": { schemaFieldUid: "field_4fb7d302-c5f0-49e6-9cd2-959a1fbe1f4e" },
                    },
                },
            },
        });
        const field = params.find((p) => p.code === "field_jUm5syZf");
        (0, vitest_1.expect)(field?.name).toBe("Каналы внедрения");
        (0, vitest_1.expect)(field?.schemaFieldUid).toBe("field_4fb7d302-c5f0-49e6-9cd2-959a1fbe1f4e");
        (0, vitest_1.expect)(field?.values).toEqual([
            { code: "Батч", label: "Батч" },
            { code: "Онлайн", label: "Онлайн" },
        ]);
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
            methodologyParams: [
                { code: "пилот_первичный", name: "? Пилот (первичный" },
            ],
        });
        (0, vitest_1.expect)(issues).toEqual([]);
    });
    (0, vitest_1.it)("reports orphan labor params even without schemaFieldUid", () => {
        const issues = (0, v2_template_work_schema_params_util_1.collectTypicalWorkSchemaConsistencyIssues)({
            schemaParams: [{ code: "type", name: "Тип системы-источника", values: [] }],
            rules: [],
            laborParamCodes: [
                { paramCode: "fake_param", paramName: "Несуществующий параметр" },
            ],
        });
        (0, vitest_1.expect)(issues).toEqual([
            vitest_1.expect.objectContaining({ kind: "labor", paramCode: "fake_param" }),
        ]);
    });
    (0, vitest_1.it)("reports a resolvable legacy labor code until it is bound to the schema field", () => {
        const issues = (0, v2_template_work_schema_params_util_1.collectTypicalWorkSchemaConsistencyIssues)({
            schemaParams: [
                {
                    code: "field_complexity",
                    name: "Сложность реализации",
                    schemaFieldUid: "uid-complexity",
                    values: [],
                },
            ],
            rules: [],
            laborParamCodes: [
                {
                    paramCode: "сложность_реализации",
                    paramName: "Сложность реализации",
                },
            ],
        });
        (0, vitest_1.expect)(issues).toEqual([
            vitest_1.expect.objectContaining({
                kind: "labor",
                paramCode: "сложность_реализации",
                message: vitest_1.expect.stringContaining("field_complexity"),
            }),
        ]);
    });
    (0, vitest_1.it)("resolves mdlctl CSV labor aliases to modelClass / pkRegulatory", () => {
        const schemaParams = [
            {
                code: "modelClass",
                name: "Класс моделей",
                schemaFieldUid: "uid-model-class",
                values: [],
            },
            {
                code: "pkRegulatory",
                name: "ПВР/Регуляторная",
                schemaFieldUid: "uid-pk",
                values: [],
            },
        ];
        const issues = (0, v2_template_work_schema_params_util_1.collectTypicalWorkSchemaConsistencyIssues)({
            schemaParams,
            rules: [],
            laborParamCodes: [
                {
                    paramCode: "выбор_класса_моделей",
                    paramName: "Выбор класса моделей",
                },
                {
                    paramCode: "выбор_класса_моделей_тип_работ",
                    paramName: "Выбор класса моделей Тип работ",
                },
                {
                    paramCode: "пвр_регуляторный",
                    paramName: "ПВР/Регуляторный",
                },
            ],
        });
        (0, vitest_1.expect)(issues.every((issue) => issue.message.includes("legacy-код"))).toBe(true);
        (0, vitest_1.expect)(issues.some((issue) => issue.message.includes("не найден"))).toBe(false);
    });
    (0, vitest_1.it)("still reports obsolete industrial-necessity labor without a schema field", () => {
        const issues = (0, v2_template_work_schema_params_util_1.collectTypicalWorkSchemaConsistencyIssues)({
            schemaParams: [
                {
                    code: "modelClass",
                    name: "Класс моделей",
                    schemaFieldUid: "uid-model-class",
                    values: [],
                },
            ],
            rules: [],
            laborParamCodes: [
                {
                    paramCode: "определение_необходимости_промышленной_реализации",
                    paramName: "Определение необходимости промышленной реализации",
                },
            ],
        });
        (0, vitest_1.expect)(issues).toEqual([
            vitest_1.expect.objectContaining({
                kind: "labor",
                paramCode: "определение_необходимости_промышленной_реализации",
                message: "Параметр трудоёмкости не найден в схеме шаблона",
            }),
        ]);
    });
    (0, vitest_1.it)("uses schemaFieldUid to disambiguate fields with the same code", () => {
        const issues = (0, v2_template_work_schema_params_util_1.collectTypicalWorkSchemaConsistencyIssues)({
            schemaParams: [
                {
                    code: "workType",
                    name: "Тип работ",
                    schemaFieldUid: "uid-first",
                    values: [],
                },
                {
                    code: "workType",
                    name: "Тип работ",
                    schemaFieldUid: "uid-bound",
                    values: [],
                },
            ],
            rules: [],
            laborParamCodes: [
                {
                    paramCode: "workType",
                    paramName: "Тип работ @ workType|тип_работ",
                    schemaFieldUid: "uid-bound",
                },
            ],
        });
        (0, vitest_1.expect)(issues).toEqual([]);
    });
    (0, vitest_1.it)("reports labor coefficient values missing from the coefficient catalog", () => {
        const issues = (0, v2_template_work_schema_params_util_1.collectTypicalWorkSchemaConsistencyIssues)({
            schemaParams: [
                {
                    code: "workType",
                    name: "Тип работ",
                    schemaFieldUid: "uid-work-type",
                    values: [
                        { code: "Разработка", label: "Разработка" },
                        { code: "Доработка", label: "Доработка" },
                    ],
                },
            ],
            rules: [],
            laborParamCodes: [
                {
                    paramCode: "workType",
                    paramName: "Тип работ",
                    schemaFieldUid: "uid-work-type",
                    coefficients: [
                        { valueCode: "Разработка", valueLabel: "Разработка" },
                        { valueCode: "Настройка", valueLabel: "Настройка" },
                    ],
                },
            ],
        });
        (0, vitest_1.expect)(issues).toEqual([
            vitest_1.expect.objectContaining({
                kind: "labor_value",
                paramCode: "workType",
                message: vitest_1.expect.stringContaining("Настройка"),
            }),
        ]);
    });
    (0, vitest_1.it)("reports unavailable values after dictionary enums replace stale jsonSchema.enum", () => {
        const fromSchema = [
            {
                code: "workType",
                name: "Тип работ",
                schemaFieldUid: "uid-work-type",
                dictionaryCode: "v2.detailInfo.dataMart.workType",
                values: [
                    { code: "Обучение", label: "Обучение" },
                    { code: "Дообучение", label: "Дообучение" },
                    { code: "Калибровка", label: "Калибровка" },
                ],
            },
        ];
        const withDictionary = (0, v2_template_work_schema_params_util_1.applyDictionaryEnumsToWorkSchemaParams)(fromSchema, {
            "v2.detailInfo.dataMart.workType": {
                enums: ["Калибровка"],
                enumNames: ["Калибровка"],
            },
        });
        const issues = (0, v2_template_work_schema_params_util_1.collectTypicalWorkSchemaConsistencyIssues)({
            schemaParams: withDictionary,
            rules: [],
            laborParamCodes: [
                {
                    paramCode: "workType",
                    paramName: "Тип работ",
                    schemaFieldUid: "uid-work-type",
                    coefficients: [
                        { valueCode: "Обучение", valueLabel: "Обучение" },
                        { valueCode: "Дообучение", valueLabel: "Дообучение" },
                        { valueCode: "Калибровка", valueLabel: "Калибровка" },
                    ],
                },
            ],
        });
        (0, vitest_1.expect)(issues.filter((issue) => issue.kind === "labor_value").map((i) => i.message)).toEqual(vitest_1.expect.arrayContaining([
            vitest_1.expect.stringContaining("Обучение"),
            vitest_1.expect.stringContaining("Дообучение"),
        ]));
        (0, vitest_1.expect)(issues.some((issue) => issue.message.includes("Калибровка") && issue.kind === "labor_value" && issue.message.includes("недоступно"))).toBe(false);
    });
    (0, vitest_1.it)("keeps Настройка available when duplicate workType codes merge catalog values", () => {
        const issues = (0, v2_template_work_schema_params_util_1.collectTypicalWorkSchemaConsistencyIssues)({
            schemaParams: [
                {
                    code: "workType",
                    name: "Тип работ (витрина)",
                    schemaFieldUid: "uid-good",
                    values: [
                        { code: "Разработка", label: "Разработка" },
                        { code: "Доработка", label: "Доработка" },
                        { code: "Настройка", label: "Настройка" },
                    ],
                },
                {
                    code: "workType",
                    name: "Тип работ (источник)",
                    schemaFieldUid: "uid-bad",
                    values: [
                        { code: "Разработка", label: "Разработка" },
                        { code: "Доработка", label: "Доработка" },
                    ],
                },
            ],
            rules: [],
            laborParamCodes: [
                {
                    paramCode: "workType",
                    paramName: "Тип работ",
                    schemaFieldUid: "uid-good",
                    coefficients: [
                        { valueCode: "Настройка", valueLabel: "Настройка" },
                    ],
                },
            ],
        });
        (0, vitest_1.expect)(issues).toEqual([]);
    });
    (0, vitest_1.it)("does not report always-shown trigger as missing schema param", () => {
        const issues = (0, v2_template_work_schema_params_util_1.collectTypicalWorkSchemaConsistencyIssues)({
            schemaParams: [{ code: "type", name: "Тип системы-источника", values: [] }],
            rules: [
                {
                    paramCode: "__always__",
                    paramName: "Нет — работа выводится всегда",
                    operator: "=",
                    valueCode: null,
                    valueLabel: null,
                },
            ],
            laborParamCodes: [],
        });
        (0, vitest_1.expect)(issues).toEqual([]);
    });
    (0, vitest_1.it)("resolves AutоМЛ / Маркер legacy trigger labels to schema fields", () => {
        const issues = (0, v2_template_work_schema_params_util_1.collectTypicalWorkSchemaConsistencyIssues)({
            schemaParams: [
                {
                    code: "field_automl",
                    name: "AutoML: встраивание внешнего кода",
                    values: [
                        { code: "true", label: "Да" },
                        { code: "false", label: "Нет" },
                    ],
                },
                {
                    code: "field_marker",
                    name: "Требуется разметка данных источника",
                    values: [
                        { code: "true", label: "Да" },
                        { code: "false", label: "Нет" },
                    ],
                },
            ],
            rules: [
                {
                    paramCode: "автомл_встраивание_внешнего_кода",
                    paramName: "АвтоМЛ: встраивание внешнего кода",
                    operator: "=",
                    valueCode: "true",
                    valueLabel: "Да",
                },
                {
                    paramCode: "требуется_разметка_данных_источника_в_маркере",
                    paramName: "Требуется разметка данных источника в Маркере",
                    operator: "=",
                    valueCode: "true",
                    valueLabel: "Да",
                },
            ],
            laborParamCodes: [],
        });
        (0, vitest_1.expect)(issues).toEqual([]);
    });
    (0, vitest_1.it)("does not report unavailable badges for schema field coefficient codes", () => {
        const issues = (0, v2_template_work_schema_params_util_1.collectTypicalWorkSchemaConsistencyIssues)({
            schemaParams: [
                {
                    code: "field_count",
                    name: "Количество",
                    schemaFieldUid: "uid-count",
                    values: [],
                },
            ],
            rules: [],
            laborParamCodes: [
                {
                    paramCode: "field_count",
                    paramName: "Количество",
                    schemaFieldUid: "uid-count",
                    coefficients: [
                        { valueCode: "range_1", valueLabel: "До 20" },
                    ],
                },
            ],
        });
        (0, vitest_1.expect)(issues).toEqual([]);
    });
    (0, vitest_1.it)("does not report numeric by-value labor coefficients as unavailable", () => {
        const issues = (0, v2_template_work_schema_params_util_1.collectTypicalWorkSchemaConsistencyIssues)({
            schemaParams: [
                {
                    code: "assessedInitiativesCount",
                    name: "Количество оцениваемых инициатив",
                    schemaFieldUid: "field_89bf48ee-4f44-4995-86fa-5cb1132abe63",
                    values: [],
                },
            ],
            rules: [],
            laborParamCodes: [
                {
                    paramCode: "assessedInitiativesCount",
                    paramName: "Количество оцениваемых инициатив",
                    schemaFieldUid: "field_89bf48ee-4f44-4995-86fa-5cb1132abe63",
                    coefficients: [
                        { valueCode: "1", valueLabel: "1" },
                        { valueCode: "2", valueLabel: "2" },
                        { valueCode: "99", valueLabel: "99" },
                    ],
                },
            ],
        });
        (0, vitest_1.expect)(issues).toEqual([]);
    });
    (0, vitest_1.it)("reports broken pilot trigger split as schema/catalog mismatch", () => {
        const issues = (0, v2_template_work_schema_params_util_1.collectTypicalWorkSchemaConsistencyIssues)({
            schemaParams: [{ code: "type", name: "Тип системы-источника", values: [] }],
            rules: [
                {
                    paramCode: "пилот_первичный",
                    paramName: "Пилот (первичный",
                    operator: "=",
                    valueCode: null,
                    valueLabel: null,
                },
            ],
            laborParamCodes: [],
        });
        (0, vitest_1.expect)(issues.some((issue) => issue.paramCode === "пилот_первичный")).toBe(true);
    });
    (0, vitest_1.it)("accepts pilot works bound to methodology catalog param", () => {
        const issues = (0, v2_template_work_schema_params_util_1.collectTypicalWorkSchemaConsistencyIssues)({
            schemaParams: [{ code: "type", name: "Тип системы-источника", values: [] }],
            rules: [
                {
                    paramCode: "тип_пилота_разовой_загрузки",
                    paramName: "Тип пилота / разовой загрузки",
                    operator: "=",
                    valueCode: null,
                    valueLabel: null,
                },
            ],
            laborParamCodes: [],
            methodologyParams: [
                {
                    code: "тип_пилота_разовой_загрузки",
                    name: "Тип пилота / разовой загрузки",
                },
            ],
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
    (0, vitest_1.it)("falls back to slug when catalog has no dedicated item", () => {
        const code = (0, v2_template_work_schema_params_util_1.findCatalogPreviousCodeForSchemaParam)([], { code: "field_R3Lx-csF", name: "Двусторонний обмен данными" });
        (0, vitest_1.expect)(code).toBe("двусторонний_обмен_данными");
    });
});
(0, vitest_1.describe)("schemaEnumValueMatchesRule", () => {
    (0, vitest_1.it)("matches legacy lowercase trigger codes to schema enum labels", () => {
        (0, vitest_1.expect)((0, v2_template_work_schema_params_util_1.schemaEnumValueMatchesRule)({ code: "Внутренний", label: "Внутренний" }, { valueCode: "внутренний", valueLabel: "Внутренний" })).toBe(true);
    });
});
