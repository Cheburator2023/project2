import { describe, expect, it } from "vitest";
import { applyDictionaryEnumsToWorkSchemaParams, buildWorkSchemaParamsFromTemplate, collectTypicalWorkSchemaConsistencyIssues, findCatalogPreviousCodeForSchemaParam, schemaEnumValueMatchesRule, } from "./v2-template-work-schema-params.util";
import { resolveTypicalWorkRulesForSourceMatch, typicalWorkRulesMatchSourceWithSchema, } from "./v2-work-schema-params-match.util";
import { typicalWorkRulesMatchSource } from "./v2-works-catalog-match.util";
describe("typicalWorkRulesMatchSourceWithSchema", () => {
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
    it("matches legacy slug trigger against schema field key in source", () => {
        const rules = [
            {
                paramCode: "количество_метрик",
                paramName: "Количество метрик",
                operator: ">=",
                valueCode: "10",
                valueLabel: "10",
            },
        ];
        expect(typicalWorkRulesMatchSource(rules, { field_metrics: 12 })).toBe(false);
        expect(typicalWorkRulesMatchSourceWithSchema(rules, { field_metrics: 12 }, [
            ...schemaParams,
        ])).toBe(true);
    });
    it("rewrites rule paramCode for downstream matching", () => {
        const rules = [
            {
                paramCode: "тип_системы_источника",
                paramName: "Тип системы-источника",
                operator: "=",
                valueCode: "внутренний",
                valueLabel: "Внутренний",
            },
        ];
        const resolved = resolveTypicalWorkRulesForSourceMatch(rules, schemaParams);
        expect(resolved[0]?.paramCode).toBe("type");
        expect(typicalWorkRulesMatchSourceWithSchema(rules, { type: "Внутренний" }, [
            ...schemaParams,
        ])).toBe(true);
    });
});
describe("buildWorkSchemaParamsFromTemplate", () => {
    it("collects leaf fields from nested schema", () => {
        const params = buildWorkSchemaParamsFromTemplate({
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
        expect(params.some((p) => p.code === "type")).toBe(true);
        expect(params.find((p) => p.code === "type")?.schemaFieldUid).toBe("uid-type");
        expect(params.some((p) => p.code === "field_metric")).toBe(true);
        expect(params.find((p) => p.code === "field_metric")?.archComponent).toBe("Система-источник");
    });
    it("collects array-of-enum fields as schema params", () => {
        const params = buildWorkSchemaParamsFromTemplate({
            jsonSchema: {
                type: "object",
                properties: {
                    modelsList: {
                        type: "array",
                        items: {
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
            },
            uiSchema: {
                modelsList: {
                    items: {
                        field_jUm5syZf: {
                            "ui:options": {
                                schemaFieldUid: "field_4fb7d302-c5f0-49e6-9cd2-959a1fbe1f4e",
                            },
                        },
                    },
                },
            },
        });
        const field = params.find((p) => p.code === "field_jUm5syZf");
        expect(field?.name).toBe("Каналы внедрения");
        expect(field?.schemaFieldUid).toBe("field_4fb7d302-c5f0-49e6-9cd2-959a1fbe1f4e");
        expect(field?.values).toEqual([
            { code: "Батч", label: "Батч" },
            { code: "Онлайн", label: "Онлайн" },
        ]);
    });
});
describe("collectTypicalWorkSchemaConsistencyIssues", () => {
    it("reports orphan trigger and schema-linked labor params", () => {
        const issues = collectTypicalWorkSchemaConsistencyIssues({
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
        expect(issues.some((issue) => issue.kind === "trigger")).toBe(true);
        expect(issues.some((issue) => issue.kind === "labor")).toBe(true);
    });
    it("ignores methodology-only labor params without schemaFieldUid", () => {
        const issues = collectTypicalWorkSchemaConsistencyIssues({
            schemaParams: [{ code: "type", name: "Тип системы-источника", values: [] }],
            rules: [],
            laborParamCodes: [
                { paramCode: "пилот_первичный", paramName: "? Пилот (первичный" },
            ],
            methodologyParams: [
                { code: "пилот_первичный", name: "? Пилот (первичный" },
            ],
        });
        expect(issues).toEqual([]);
    });
    it("reports orphan labor params even without schemaFieldUid", () => {
        const issues = collectTypicalWorkSchemaConsistencyIssues({
            schemaParams: [{ code: "type", name: "Тип системы-источника", values: [] }],
            rules: [],
            laborParamCodes: [
                { paramCode: "fake_param", paramName: "Несуществующий параметр" },
            ],
        });
        expect(issues).toEqual([
            expect.objectContaining({ kind: "labor", paramCode: "fake_param" }),
        ]);
    });
    it("reports a resolvable legacy labor code until it is bound to the schema field", () => {
        const issues = collectTypicalWorkSchemaConsistencyIssues({
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
        expect(issues).toEqual([
            expect.objectContaining({
                kind: "labor",
                paramCode: "сложность_реализации",
                message: expect.stringContaining("field_complexity"),
            }),
        ]);
    });
    it("resolves mdlctl CSV labor aliases to modelClass / pkRegulatory", () => {
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
        const issues = collectTypicalWorkSchemaConsistencyIssues({
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
        expect(issues.every((issue) => issue.message.includes("legacy-код"))).toBe(true);
        expect(issues.some((issue) => issue.message.includes("не найден"))).toBe(false);
    });
    it("still reports obsolete industrial-necessity labor without a schema field", () => {
        const issues = collectTypicalWorkSchemaConsistencyIssues({
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
        expect(issues).toEqual([
            expect.objectContaining({
                kind: "labor",
                paramCode: "определение_необходимости_промышленной_реализации",
                message: "Параметр трудоёмкости не найден в схеме шаблона",
            }),
        ]);
    });
    it("uses schemaFieldUid to disambiguate fields with the same code", () => {
        const issues = collectTypicalWorkSchemaConsistencyIssues({
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
        expect(issues).toEqual([]);
    });
    it("reports labor coefficient values missing from the coefficient catalog", () => {
        const issues = collectTypicalWorkSchemaConsistencyIssues({
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
        expect(issues).toEqual([
            expect.objectContaining({
                kind: "labor_value",
                paramCode: "workType",
                message: expect.stringContaining("Настройка"),
            }),
        ]);
    });
    it("reports unavailable values after dictionary enums replace stale jsonSchema.enum", () => {
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
        const withDictionary = applyDictionaryEnumsToWorkSchemaParams(fromSchema, {
            "v2.detailInfo.dataMart.workType": {
                enums: ["Калибровка"],
                enumNames: ["Калибровка"],
            },
        });
        const issues = collectTypicalWorkSchemaConsistencyIssues({
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
        expect(issues.filter((issue) => issue.kind === "labor_value").map((i) => i.message)).toEqual(expect.arrayContaining([
            expect.stringContaining("Обучение"),
            expect.stringContaining("Дообучение"),
        ]));
        expect(issues.some((issue) => issue.message.includes("Калибровка") && issue.kind === "labor_value" && issue.message.includes("недоступно"))).toBe(false);
    });
    it("keeps Настройка available when duplicate workType codes merge catalog values", () => {
        const issues = collectTypicalWorkSchemaConsistencyIssues({
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
        expect(issues).toEqual([]);
    });
    it("does not report always-shown trigger as missing schema param", () => {
        const issues = collectTypicalWorkSchemaConsistencyIssues({
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
        expect(issues).toEqual([]);
    });
    it("resolves AutоМЛ / Маркер legacy trigger labels to schema fields", () => {
        const issues = collectTypicalWorkSchemaConsistencyIssues({
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
        expect(issues).toEqual([]);
    });
    it("does not report unavailable badges for schema field coefficient codes", () => {
        const issues = collectTypicalWorkSchemaConsistencyIssues({
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
        expect(issues).toEqual([]);
    });
    it("does not report numeric by-value labor coefficients as unavailable", () => {
        const issues = collectTypicalWorkSchemaConsistencyIssues({
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
        expect(issues).toEqual([]);
    });
    it("reports broken pilot trigger split as schema/catalog mismatch", () => {
        const issues = collectTypicalWorkSchemaConsistencyIssues({
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
        expect(issues.some((issue) => issue.paramCode === "пилот_первичный")).toBe(true);
    });
    it("accepts pilot works bound to methodology catalog param", () => {
        const issues = collectTypicalWorkSchemaConsistencyIssues({
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
        expect(issues).toEqual([]);
    });
    it("resolves control type trigger to вид контроля field, not unrelated schema fields", () => {
        const issues = collectTypicalWorkSchemaConsistencyIssues({
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
        expect(issues).toEqual([]);
    });
    it("matches trigger enum values case-insensitively", () => {
        const issues = collectTypicalWorkSchemaConsistencyIssues({
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
        expect(issues).toEqual([]);
    });
});
describe("findCatalogPreviousCodeForSchemaParam", () => {
    it("matches catalog item by normalized title", () => {
        const code = findCatalogPreviousCodeForSchemaParam([{ code: "тип_системы_источника", name: "Тип системы-источника" }], { code: "type", name: "Тип системы-источника" });
        expect(code).toBe("тип_системы_источника");
    });
    it("falls back to slug when catalog has no dedicated item", () => {
        const code = findCatalogPreviousCodeForSchemaParam([], { code: "field_R3Lx-csF", name: "Двусторонний обмен данными" });
        expect(code).toBe("двусторонний_обмен_данными");
    });
});
describe("schemaEnumValueMatchesRule", () => {
    it("matches legacy lowercase trigger codes to schema enum labels", () => {
        expect(schemaEnumValueMatchesRule({ code: "Внутренний", label: "Внутренний" }, { valueCode: "внутренний", valueLabel: "Внутренний" })).toBe(true);
    });
});
