"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const v2_typical_work_schema_sync_util_1 = require("./v2-typical-work-schema-sync.util");
function card() {
    return {
        id: "work-1",
        name: "Работа",
        archComponentType: "Источник",
        workType: null,
        streamExecutor: "Источник",
        triggerStatus: "appears",
        norms: [],
        rules: [
            {
                id: "rule-1",
                streamExecutor: "Источник",
                schemaFieldUid: "field-1",
                paramCode: "old_code",
                paramName: "Старое имя",
                operator: "in",
                valueCode: null,
                valueLabel: null,
                values: [
                    { code: "keep", label: "Старое значение" },
                    { code: "drop", label: "Удалённое значение" },
                ],
            },
        ],
        laborParams: [
            {
                schemaFieldUid: "field-1",
                paramCode: "old_code",
                paramName: "Старое имя",
                kind: "by_value",
                coefficients: [
                    {
                        id: "coeff-1",
                        streamExecutor: "Источник",
                        paramCode: "old_code",
                        paramName: "Старое имя",
                        valueCode: "keep",
                        valueLabel: "Старое значение",
                        coefficient: 2,
                    },
                ],
            },
        ],
        formula: {
            tokens: [
                { kind: "norm" },
                { kind: "operator", op: "*" },
                { kind: "param_coeff", paramCode: "old_code" },
            ],
            text: "N × коэф(old_code)",
        },
        rounding: { mode: "NONE", step: null },
    };
}
(0, vitest_1.describe)("reconcileTypicalWorkCardWithSchemaField", () => {
    (0, vitest_1.it)("preserves matching dictionary values and refreshes names and codes", () => {
        const result = (0, v2_typical_work_schema_sync_util_1.reconcileTypicalWorkCardWithSchemaField)(card(), {
            templateVersionId: "version-1",
            mode: "apply",
            operation: "upsert",
            field: {
                schemaFieldUid: "field-1",
                previousCode: "old_code",
                code: "new_code",
                name: "Новое имя",
                values: [
                    { code: "keep", label: "Новое значение" },
                    { code: "new", label: "Новое" },
                ],
            },
        });
        (0, vitest_1.expect)(result.changed).toBe(true);
        (0, vitest_1.expect)(result.card.rules[0]).toMatchObject({
            paramCode: "new_code",
            paramName: "Новое имя @ new_code|old_code|старое_имя",
            values: [{ code: "keep", label: "Новое значение" }],
        });
        (0, vitest_1.expect)(result.card.laborParams[0]?.coefficients).toMatchObject([
            { valueCode: "keep", coefficient: 2, valueLabel: "Новое значение" },
            { valueCode: "new", coefficient: 1, valueLabel: "Новое" },
        ]);
        (0, vitest_1.expect)(result.card.formula.tokens[2]).toMatchObject({
            kind: "param_coeff",
            paramCode: "new_code",
            paramName: "Новое имя @ new_code|old_code|старое_имя",
        });
    });
    (0, vitest_1.it)("preserves factory coefficients when schema labels add spaces", () => {
        const legacy = card();
        legacy.laborParams[0] = {
            ...legacy.laborParams[0],
            paramName: "Количество сущностей (исходных таблиц)",
            coefficients: [
                {
                    id: "coeff-point",
                    streamExecutor: "Источники данных",
                    paramCode: "количество_сущностей_исходных_таблиц",
                    paramName: "Количество сущностей (исходных таблиц)",
                    valueCode: "точечное_1_4",
                    valueLabel: "Точечное(1-4)",
                    coefficient: 0.5,
                },
                {
                    id: "coeff-large",
                    streamExecutor: "Источники данных",
                    paramCode: "количество_сущностей_исходных_таблиц",
                    paramName: "Количество сущностей (исходных таблиц)",
                    valueCode: "масштабное_25",
                    valueLabel: "Масштабное(25+)",
                    coefficient: 1.75,
                },
            ],
        };
        const result = (0, v2_typical_work_schema_sync_util_1.reconcileTypicalWorkCardWithSchemaField)(legacy, {
            templateVersionId: "version-1",
            mode: "apply",
            operation: "upsert",
            field: {
                schemaFieldUid: "field-1",
                previousCode: "old_code",
                code: "field_Y_K0Hy0e",
                name: "Количество сущностей (исходных таблиц)",
                values: [
                    { code: "Точечное (1-4)", label: "Точечное (1-4)" },
                    { code: "Масштабное (25+)", label: "Масштабное (25+)" },
                ],
            },
        });
        (0, vitest_1.expect)(result.card.laborParams[0]?.coefficients).toMatchObject([
            {
                valueCode: "Точечное (1-4)",
                valueLabel: "Точечное (1-4)",
                coefficient: 0.5,
            },
            {
                valueCode: "Масштабное (25+)",
                valueLabel: "Масштабное (25+)",
                coefficient: 1.75,
            },
        ]);
    });
    (0, vitest_1.it)("remaps legacy trigger value codes to schema enum codes", () => {
        const legacy = card();
        legacy.rules[0] = {
            ...legacy.rules[0],
            operator: "=",
            valueCode: "keep",
            valueLabel: "Старое значение",
            values: undefined,
        };
        const result = (0, v2_typical_work_schema_sync_util_1.reconcileTypicalWorkCardWithSchemaField)(legacy, {
            templateVersionId: "version-1",
            mode: "apply",
            operation: "upsert",
            field: {
                schemaFieldUid: "field-1",
                previousCode: "old_code",
                code: "new_code",
                name: "Новое имя",
                values: [{ code: "KEEP", label: "Новое значение" }],
            },
        });
        (0, vitest_1.expect)(result.card.rules[0]).toMatchObject({
            valueCode: "KEEP",
            valueLabel: "Новое значение",
        });
    });
    (0, vitest_1.it)("removes field references and invalidates formula tokens", () => {
        const result = (0, v2_typical_work_schema_sync_util_1.reconcileTypicalWorkCardWithSchemaField)(card(), {
            templateVersionId: "version-1",
            mode: "apply",
            operation: "delete",
            field: {
                schemaFieldUid: "field-1",
                previousCode: "old_code",
            },
        });
        (0, vitest_1.expect)(result.card.rules).toEqual([]);
        (0, vitest_1.expect)(result.card.laborParams).toEqual([]);
        (0, vitest_1.expect)(result.card.formula.tokens[2]).toMatchObject({
            kind: "param_coeff",
            paramCode: "old_code",
            invalid: true,
        });
        (0, vitest_1.expect)(result.impact).toMatchObject({
            rulesRemoved: 1,
            laborParamsRemoved: 1,
            formulasInvalidated: 1,
        });
    });
    (0, vitest_1.it)("backfills legacy references only by the previous code", () => {
        const legacy = card();
        delete legacy.rules[0].schemaFieldUid;
        delete legacy.laborParams[0].schemaFieldUid;
        const result = (0, v2_typical_work_schema_sync_util_1.reconcileTypicalWorkCardWithSchemaField)(legacy, {
            templateVersionId: "version-1",
            mode: "apply",
            operation: "upsert",
            field: {
                schemaFieldUid: "field-1",
                previousCode: "old_code",
                code: "old_code",
                name: "Имя",
                values: [{ code: "keep", label: "Значение" }],
            },
        });
        (0, vitest_1.expect)(result.card.rules[0]?.schemaFieldUid).toBe("field-1");
        (0, vitest_1.expect)(result.card.laborParams[0]?.schemaFieldUid).toBe("field-1");
    });
    (0, vitest_1.it)("does not remap an already bound reference by a shared code or name", () => {
        const result = (0, v2_typical_work_schema_sync_util_1.reconcileTypicalWorkCardWithSchemaField)(card(), {
            templateVersionId: "version-1",
            mode: "apply",
            operation: "upsert",
            field: {
                schemaFieldUid: "field-2",
                previousCode: "old_code",
                code: "old_code",
                name: "Старое имя",
                values: [{ code: "keep", label: "Старое значение" }],
            },
        });
        (0, vitest_1.expect)(result.card.rules[0]?.schemaFieldUid).toBe("field-1");
        (0, vitest_1.expect)(result.card.laborParams[0]?.schemaFieldUid).toBe("field-1");
        (0, vitest_1.expect)(result.card.formula.tokens[2]).toMatchObject({
            kind: "param_coeff",
            paramCode: "old_code",
        });
    });
    (0, vitest_1.it)("matches legacy slug paramCode by field title without catalog entry", () => {
        const legacy = card();
        legacy.rules[0] = {
            ...legacy.rules[0],
            schemaFieldUid: undefined,
            paramCode: "двусторонний_обмен_данными",
            paramName: "Двусторонний обмен данными",
        };
        legacy.laborParams[0] = {
            ...legacy.laborParams[0],
            schemaFieldUid: undefined,
            paramCode: "двусторонний_обмен_данными",
            paramName: "Двусторонний обмен данными",
        };
        legacy.formula.tokens[2] = {
            kind: "param_coeff",
            paramCode: "двусторонний_обмен_данными",
            paramName: "Двусторонний обмен данными",
        };
        const result = (0, v2_typical_work_schema_sync_util_1.reconcileTypicalWorkCardWithSchemaField)(legacy, {
            templateVersionId: "version-1",
            mode: "apply",
            operation: "upsert",
            field: {
                schemaFieldUid: "field_9f1865ca-e9a1-4130-9ee7-d8dc37452bce",
                previousCode: "двусторонний_обмен_данными",
                code: "field_R3Lx-csF",
                name: "Двусторонний обмен данными",
                values: [
                    { code: "Да", label: "Да" },
                    { code: "Нет", label: "Нет" },
                ],
            },
        });
        (0, vitest_1.expect)(result.changed).toBe(true);
        (0, vitest_1.expect)(result.card.rules[0]).toMatchObject({
            paramCode: "field_R3Lx-csF",
            schemaFieldUid: "field_9f1865ca-e9a1-4130-9ee7-d8dc37452bce",
        });
        (0, vitest_1.expect)(result.card.formula.tokens[2]).toMatchObject({
            kind: "param_coeff",
            paramCode: "field_R3Lx-csF",
        });
        (0, vitest_1.expect)(result.card.formula.tokens[2]).not.toHaveProperty("invalid", true);
    });
    (0, vitest_1.it)("marks orphan formula tokens invalid when labor param is absent", () => {
        const legacy = card();
        legacy.laborParams = [];
        legacy.formula.tokens[2] = {
            kind: "param_coeff",
            paramCode: "field_HuOLfL4K",
            paramName: "Поле",
        };
        const result = (0, v2_typical_work_schema_sync_util_1.reconcileTypicalWorkCardWithSchemaField)(legacy, {
            templateVersionId: "version-1",
            mode: "apply",
            operation: "upsert",
            field: {
                schemaFieldUid: "field-other",
                previousCode: "other_code",
                code: "other_code",
                name: "Другое поле",
            },
        });
        (0, vitest_1.expect)(result.card.formula.tokens[2]).toMatchObject({
            kind: "param_coeff",
            paramCode: "field_HuOLfL4K",
            invalid: true,
        });
        (0, vitest_1.expect)(result.impact.formulasInvalidated).toBe(1);
    });
    (0, vitest_1.it)("stores short valueCode for long schema enum labels", () => {
        const longValue = "3 — Проведение регулярной валидации Регулятором нормативно не установлено. Заказчик запрашивает проведение первичной валидации модели";
        const legacy = card();
        legacy.laborParams[0] = {
            ...legacy.laborParams[0],
            paramCode: "complexity",
            paramName: "Сложность постановки",
            coefficients: [
                {
                    id: "coef-3",
                    streamExecutor: "Модельный стрим",
                    paramCode: "complexity",
                    paramName: "Сложность постановки",
                    valueCode: "3",
                    valueLabel: "3",
                    coefficient: 1.5,
                },
            ],
        };
        const result = (0, v2_typical_work_schema_sync_util_1.reconcileTypicalWorkCardWithSchemaField)(legacy, {
            templateVersionId: "version-1",
            mode: "apply",
            operation: "upsert",
            field: {
                schemaFieldUid: "field_61a51b98-b6a8-47c9-aa27-74ff2219513f",
                previousCode: "complexity",
                code: "complexity",
                name: "Регуляторные требования",
                values: [{ code: longValue, label: longValue }],
            },
        });
        (0, vitest_1.expect)(result.changed).toBe(true);
        (0, vitest_1.expect)(result.card.laborParams[0]?.coefficients[0]?.valueCode).toBe("3");
        (0, vitest_1.expect)((result.card.laborParams[0]?.coefficients[0]?.valueLabel ?? "").length).toBeLessThanOrEqual(255);
    });
    (0, vitest_1.it)("merges duplicate labor param groups after legacy and bound rows converge", () => {
        const legacy = card();
        legacy.laborParams = [
            {
                schemaFieldUid: "field_8cff1155-e458-4fea-a8c7-abad1260df8f",
                paramCode: "field_N9LFD6Hu",
                paramName: "Двусторонний обмен данными",
                kind: "by_value",
                coefficients: [],
            },
            {
                schemaFieldUid: undefined,
                paramCode: "двусторонний_обмен_данными",
                paramName: "Двусторонний обмен данными",
                kind: "by_value",
                coefficients: [
                    {
                        id: "coef-legacy",
                        streamExecutor: "Источники данных",
                        paramCode: "двусторонний_обмен_данными",
                        paramName: "Двусторонний обмен данными",
                        valueCode: "yes",
                        valueLabel: "Да",
                        coefficient: 1.2,
                    },
                ],
            },
        ];
        const result = (0, v2_typical_work_schema_sync_util_1.reconcileTypicalWorkCardWithSchemaField)(legacy, {
            templateVersionId: "version-1",
            mode: "apply",
            operation: "upsert",
            field: {
                schemaFieldUid: "field_8cff1155-e458-4fea-a8c7-abad1260df8f",
                previousCode: "двусторонний_обмен_данными",
                aliasCodes: ["field_N9LFD6Hu"],
                code: "field_N9LFD6Hu",
                name: "Двусторонний обмен данными",
                values: [
                    { code: "yes", label: "Да" },
                    { code: "no", label: "Нет" },
                ],
            },
        });
        (0, vitest_1.expect)(result.card.laborParams).toHaveLength(1);
        (0, vitest_1.expect)(result.card.laborParams[0]).toMatchObject({
            paramCode: "field_N9LFD6Hu",
            schemaFieldUid: "field_8cff1155-e458-4fea-a8c7-abad1260df8f",
        });
        (0, vitest_1.expect)(result.card.laborParams[0]?.coefficients).toHaveLength(2);
    });
    (0, vitest_1.it)("preserves admin coefficient rows that are not in the new schema values", () => {
        const legacy = card();
        legacy.laborParams = [
            {
                schemaFieldUid: "field-1",
                paramCode: "workType",
                paramName: "Тип работ",
                kind: "by_value",
                coefficients: [
                    {
                        id: "keep-custom",
                        streamExecutor: "Источники данных",
                        paramCode: "workType",
                        paramName: "Тип работ",
                        valueCode: "Разработка",
                        valueLabel: "Разработка",
                        coefficient: 2.5,
                    },
                    {
                        id: "remap-me",
                        streamExecutor: "Источники данных",
                        paramCode: "workType",
                        paramName: "Тип работ",
                        valueCode: "Обучение",
                        valueLabel: "Обучение",
                        coefficient: 1.7,
                    },
                ],
            },
        ];
        const result = (0, v2_typical_work_schema_sync_util_1.reconcileTypicalWorkCardWithSchemaField)(legacy, {
            templateVersionId: "version-1",
            mode: "apply",
            operation: "upsert",
            field: {
                schemaFieldUid: "field-1",
                previousCode: "workType",
                code: "workType",
                name: "Тип работ",
                values: [
                    { code: "обучение", label: "Обучение" },
                    { code: "калибровка", label: "Калибровка" },
                ],
            },
        });
        const coeffs = result.card.laborParams[0]?.coefficients ?? [];
        (0, vitest_1.expect)(coeffs).toEqual(vitest_1.expect.arrayContaining([
            vitest_1.expect.objectContaining({
                valueCode: "обучение",
                valueLabel: "Обучение",
                coefficient: 1.7,
            }),
            vitest_1.expect.objectContaining({
                valueCode: "калибровка",
                valueLabel: "Калибровка",
                coefficient: 1,
            }),
            vitest_1.expect.objectContaining({
                valueCode: "Разработка",
                valueLabel: "Разработка",
                coefficient: 2.5,
            }),
        ]));
    });
    (0, vitest_1.it)("does not rebuild coefficients when field.values is omitted (bulk binding sync)", () => {
        const legacy = card();
        legacy.laborParams = [
            {
                schemaFieldUid: "field-1",
                paramCode: "workType",
                paramName: "Тип работ",
                kind: "by_value",
                coefficients: [
                    {
                        id: "admin-edit",
                        streamExecutor: "Источники данных",
                        paramCode: "workType",
                        paramName: "Тип работ",
                        valueCode: "custom",
                        valueLabel: "Custom",
                        coefficient: 9,
                    },
                ],
            },
        ];
        const result = (0, v2_typical_work_schema_sync_util_1.reconcileTypicalWorkCardWithSchemaField)(legacy, {
            templateVersionId: "version-1",
            mode: "apply",
            operation: "upsert",
            field: {
                schemaFieldUid: "field-1",
                previousCode: "workType",
                code: "field_workType",
                name: "Тип работ",
            },
        });
        (0, vitest_1.expect)(result.card.laborParams[0]?.coefficients).toEqual([
            vitest_1.expect.objectContaining({
                valueCode: "custom",
                valueLabel: "Custom",
                coefficient: 9,
            }),
        ]);
        (0, vitest_1.expect)(result.card.laborParams[0]?.paramCode).toBe("field_workType");
    });
    (0, vitest_1.it)("dedupes labor coefficients that normalize to the same stored value_code", () => {
        const rows = (0, v2_typical_work_schema_sync_util_1.dedupeLaborCoefficientsByStoredValue)([
            {
                id: "a",
                streamExecutor: "Источники данных",
                paramCode: "workType",
                paramName: "Тип работ",
                valueCode: "разработка",
                valueLabel: "Разработка",
                coefficient: 1,
            },
            {
                id: "b",
                streamExecutor: "Источники данных",
                paramCode: "тип_работ",
                paramName: "Тип работ",
                valueCode: "разработка",
                valueLabel: "Разработка",
                coefficient: 1.5,
            },
        ]);
        (0, vitest_1.expect)(rows).toHaveLength(1);
        (0, vitest_1.expect)(rows[0]?.coefficient).toBe(1);
    });
    (0, vitest_1.it)("dedupes merged workType rows after legacy slug and bound field converge", () => {
        const legacy = card();
        legacy.laborParams = [
            {
                schemaFieldUid: "field-work-type",
                paramCode: "workType",
                paramName: "Тип работ",
                kind: "by_value",
                coefficients: [
                    {
                        id: "bound",
                        streamExecutor: "Источники данных",
                        paramCode: "workType",
                        paramName: "Тип работ",
                        valueCode: "разработка",
                        valueLabel: "Разработка",
                        coefficient: 1,
                    },
                ],
            },
            {
                schemaFieldUid: undefined,
                paramCode: "тип_работ",
                paramName: "Тип работ",
                kind: "by_value",
                coefficients: [
                    {
                        id: "legacy",
                        streamExecutor: "Источники данных",
                        paramCode: "тип_работ",
                        paramName: "Тип работ",
                        valueCode: "разработка",
                        valueLabel: "Разработка",
                        coefficient: 1.5,
                    },
                ],
            },
        ];
        const result = (0, v2_typical_work_schema_sync_util_1.reconcileTypicalWorkCardWithSchemaField)(legacy, {
            templateVersionId: "version-1",
            mode: "apply",
            operation: "upsert",
            field: {
                schemaFieldUid: "field-work-type",
                previousCode: "тип_работ",
                aliasCodes: ["workType"],
                code: "workType",
                name: "Тип работ",
                values: [{ code: "разработка", label: "Разработка" }],
            },
        });
        (0, vitest_1.expect)(result.card.laborParams).toHaveLength(1);
        (0, vitest_1.expect)(result.card.laborParams[0]?.coefficients).toHaveLength(1);
        (0, vitest_1.expect)(result.card.laborParams[0]?.coefficients[0]).toMatchObject({
            valueCode: "разработка",
            coefficient: 1,
        });
    });
});
