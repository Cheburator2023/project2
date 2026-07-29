"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const v2_works_catalog_match_util_1 = require("./v2-works-catalog-match.util");
const v2_work_arch_count_coeff_util_1 = require("./v2-work-arch-count-coeff.util");
const v2_typical_work_types_1 = require("./v2-typical-work.types");
const v2_work_schema_params_match_util_1 = require("./v2-work-schema-params-match.util");
(0, vitest_1.describe)("v2-works-catalog-match.util", () => {
    (0, vitest_1.it)("resolves the unified source stream for any source row", () => {
        // Разделение внутр/внеш убрано: любой источник → единый стрим.
        (0, vitest_1.expect)((0, v2_works_catalog_match_util_1.resolveStreamFromSourceType)({ type: "Внутренний" })).toBe(v2_works_catalog_match_util_1.V2_SOURCE_STREAM);
        (0, vitest_1.expect)((0, v2_works_catalog_match_util_1.resolveStreamFromSourceType)({ type: "Внешний" })).toBe(v2_works_catalog_match_util_1.V2_SOURCE_STREAM);
        (0, vitest_1.expect)((0, v2_works_catalog_match_util_1.resolveStreamFromSourceType)({})).toBe(v2_works_catalog_match_util_1.V2_SOURCE_STREAM);
    });
    (0, vitest_1.it)("collects the unified source stream from source systems", () => {
        (0, vitest_1.expect)((0, v2_works_catalog_match_util_1.resolveStreamsFromSourceSystems)({
            streamDataSources: {
                sourceSystems: [{ type: "Внутренний" }, { type: "Внешний" }],
            },
        })).toEqual([v2_works_catalog_match_util_1.V2_SOURCE_STREAM]);
    });
    (0, vitest_1.it)("matches control type by bracket label", () => {
        const rules = [
            {
                paramCode: "вид_контроля_кд",
                paramName: "Вид контроля: КД",
                operator: "=",
                valueCode: null,
                valueLabel: "КД",
            },
        ];
        (0, vitest_1.expect)((0, v2_works_catalog_match_util_1.typicalWorkRulesMatchSource)(rules, {
            value: "Качество модельных данных [КД]",
        })).toBe(true);
        (0, vitest_1.expect)((0, v2_works_catalog_match_util_1.typicalWorkRulesMatchSource)(rules, { value: "Технический [ТМ]" })).toBe(false);
    });
    (0, vitest_1.it)("matches source type trigger by value code", () => {
        const rules = [
            {
                paramCode: "type",
                paramName: "Тип системы-источника",
                operator: "=",
                valueCode: "external",
                valueLabel: "Внешний",
            },
        ];
        (0, vitest_1.expect)((0, v2_works_catalog_match_util_1.typicalWorkRulesMatchSource)(rules, { type: "external" })).toBe(true);
        (0, vitest_1.expect)((0, v2_works_catalog_match_util_1.typicalWorkRulesMatchSource)(rules, { type: "Внешний" })).toBe(true);
        (0, vitest_1.expect)((0, v2_works_catalog_match_util_1.typicalWorkRulesMatchSource)(rules, { type: "internal" })).toBe(false);
    });
    (0, vitest_1.it)("reads source field from encoded paramName aliases", () => {
        const rules = [
            {
                paramCode: "field_primary",
                paramName: "Сложность @ field_alt|field_other",
                operator: "=",
                valueCode: "high",
                valueLabel: "Высокая",
            },
        ];
        (0, vitest_1.expect)((0, v2_works_catalog_match_util_1.typicalWorkRulesMatchSource)(rules, {
            field_alt: "high",
        })).toBe(true);
    });
    (0, vitest_1.it)("matches schema field trigger by label when rule stores dictionary code", () => {
        const rules = [
            {
                paramCode: "field_nE73kPQl",
                paramName: "Детализация и ясность запроса постановки задачи",
                operator: "=",
                valueCode: "Точечное",
                valueLabel: "Точечное",
            },
        ];
        (0, vitest_1.expect)((0, v2_works_catalog_match_util_1.typicalWorkRulesMatchSource)(rules, {
            field_nE73kPQl: "Точечное",
        })).toBe(true);
        (0, vitest_1.expect)((0, v2_works_catalog_match_util_1.typicalWorkRulesMatchSource)(rules, {
            field_nE73kPQl: "Масштабное",
        })).toBe(false);
    });
    (0, vitest_1.it)("matches source type trigger", () => {
        const rules = [
            {
                paramCode: "тип_источника_внутренний",
                paramName: "Тип источника (внутренний)",
                operator: "=",
                valueCode: null,
                valueLabel: "Внутренний",
            },
        ];
        (0, vitest_1.expect)((0, v2_works_catalog_match_util_1.typicalWorkRulesMatchSource)(rules, { type: "Внутренний" })).toBe(true);
    });
    (0, vitest_1.it)("does not match works without triggers", () => {
        (0, vitest_1.expect)((0, v2_works_catalog_match_util_1.typicalWorkRulesMatchSource)([], { type: "Внутренний" })).toBe(false);
    });
    (0, vitest_1.it)("matches always-shown trigger without reading form fields", () => {
        (0, vitest_1.expect)((0, v2_works_catalog_match_util_1.typicalWorkRulesMatchSource)([
            {
                paramCode: "__always__",
                paramName: "Нет — работа выводится всегда",
                operator: "=",
                valueCode: null,
                valueLabel: null,
            },
        ], {})).toBe(true);
        (0, vitest_1.expect)((0, v2_works_catalog_match_util_1.typicalWorkRulesMatchSource)([
            {
                paramCode: "нет_работа_выводится_всегда",
                paramName: "нет — работа выводится всегда.",
                operator: "=",
                valueCode: null,
                valueLabel: null,
            },
        ], {})).toBe(true);
    });
    (0, vitest_1.it)("matches numeric comparison operators", () => {
        const rule = {
            paramCode: "metric_count",
            paramName: "Количество метрик",
            operator: ">=",
            valueCode: "10",
            valueLabel: "10",
        };
        (0, vitest_1.expect)((0, v2_works_catalog_match_util_1.typicalWorkRulesMatchSource)([rule], { metric_count: 12 })).toBe(true);
        (0, vitest_1.expect)((0, v2_works_catalog_match_util_1.typicalWorkRulesMatchSource)([rule], { metric_count: 8 })).toBe(false);
    });
    (0, vitest_1.it)("matches in / not_in operators with value sets", () => {
        const rule = {
            paramCode: "region",
            paramName: "Регион",
            operator: "in",
            valueCode: null,
            valueLabel: null,
            values: [
                { code: "eu", label: "Европа" },
                { code: "us", label: "США" },
            ],
        };
        (0, vitest_1.expect)((0, v2_works_catalog_match_util_1.typicalWorkRulesMatchSource)([rule], { region: "eu" })).toBe(true);
        (0, vitest_1.expect)((0, v2_works_catalog_match_util_1.typicalWorkRulesMatchSource)([rule], { region: "Европа" })).toBe(true);
        (0, vitest_1.expect)((0, v2_works_catalog_match_util_1.typicalWorkRulesMatchSource)([rule], { region: "asia" })).toBe(false);
        const notIn = { ...rule, operator: "not_in" };
        (0, vitest_1.expect)((0, v2_works_catalog_match_util_1.typicalWorkRulesMatchSource)([notIn], { region: "asia" })).toBe(true);
        (0, vitest_1.expect)((0, v2_works_catalog_match_util_1.typicalWorkRulesMatchSource)([notIn], { region: "eu" })).toBe(false);
    });
    (0, vitest_1.it)("resolves labor any-of coefficient", () => {
        (0, vitest_1.expect)((0, v2_works_catalog_match_util_1.resolveLaborAnyOfCoefficient)({ flag: "yes" }, "flag", {
            valueCodes: ["yes"],
            valueLabels: ["Да"],
            coeffOn: 2,
            coeffOff: 0.5,
        })).toBe(2);
        (0, vitest_1.expect)((0, v2_works_catalog_match_util_1.resolveLaborAnyOfCoefficient)({ flag: "no" }, "flag", {
            valueCodes: ["yes"],
            valueLabels: ["Да"],
            coeffOn: 2,
            coeffOff: 0.5,
        })).toBe(0.5);
    });
    (0, vitest_1.it)("resolves labor any-of coefficient for boolean checkbox", () => {
        const anyOf = {
            valueCodes: ["true"],
            valueLabels: ["Да"],
            coeffOn: 1.5,
            coeffOff: 0.5,
        };
        (0, vitest_1.expect)((0, v2_works_catalog_match_util_1.resolveLaborAnyOfCoefficient)({ field_checkbox: true }, "field_checkbox", anyOf, "Чекбокс @ field_checkbox")).toBe(1.5);
        (0, vitest_1.expect)((0, v2_works_catalog_match_util_1.resolveLaborAnyOfCoefficient)({ field_checkbox: false }, "field_checkbox", anyOf, "Чекбокс @ field_checkbox")).toBe(0.5);
        (0, vitest_1.expect)((0, v2_works_catalog_match_util_1.resolveLaborAnyOfCoefficient)({}, "field_checkbox", anyOf, "Чекбокс @ field_checkbox")).toBe(0.5);
    });
    (0, vitest_1.it)("does not treat unrelated source.value as boolean labor answer", () => {
        const anyOf = {
            valueCodes: ["true"],
            valueLabels: ["Да"],
            coeffOn: 1,
            coeffOff: 2,
        };
        (0, vitest_1.expect)((0, v2_works_catalog_match_util_1.resolveLaborAnyOfCoefficient)({ name: "Источник", type: "Внутренний", value: "Да" }, "field_cb", anyOf, "Чекбокс @ field_cb")).toBe(2);
    });
    (0, vitest_1.it)("buildTypicalWorkFactorCoeffResolver falls back to any_of coeffOff", () => {
        const resolve = (0, v2_works_catalog_match_util_1.buildTypicalWorkFactorCoeffResolver)({
            paramCoefficients: {},
            anyOfParams: [
                {
                    paramCode: "field_cb",
                    paramName: "Чекбокс @ field_cb",
                    anyOf: {
                        valueCodes: ["true"],
                        valueLabels: ["Да"],
                        coeffOn: 1,
                        coeffOff: 2,
                    },
                },
            ],
            source: {},
        });
        (0, vitest_1.expect)(resolve("field_cb")).toBe(2);
        (0, vitest_1.expect)(resolve("missing")).toBe(1);
    });
    (0, vitest_1.it)("resolves by-value labor coefficients from schema dictionary answers", () => {
        (0, vitest_1.expect)((0, v2_works_catalog_match_util_1.resolveByValueLaborParamCoefficients)({ field_dict: "Да" }, [
            {
                paramCode: "field_dict",
                paramName: "Поле справочника @ field_dict",
                valueCode: "Да",
                valueLabel: "Да",
                coefficient: 20,
            },
            {
                paramCode: "field_dict",
                paramName: "Поле справочника @ field_dict",
                valueCode: "Нет",
                valueLabel: "Нет",
                coefficient: 10,
            },
        ])).toEqual({ field_dict: 20 });
    });
    (0, vitest_1.it)("treats an absent by-value boolean checkbox as false", () => {
        (0, vitest_1.expect)((0, v2_works_catalog_match_util_1.resolveByValueLaborParamCoefficients)({ name: "Источник", value: "Да" }, [
            {
                paramCode: "field_cb",
                paramName: "Чекбокс @ field_cb",
                valueCode: "true",
                valueLabel: "Да",
                coefficient: 1,
            },
            {
                paramCode: "field_cb",
                paramName: "Чекбокс @ field_cb",
                valueCode: "false",
                valueLabel: "Нет",
                coefficient: 2,
            },
        ])).toEqual({ field_cb: 2 });
    });
    (0, vitest_1.it)("matches boolean checkbox trigger by label and code", () => {
        const rules = [
            {
                paramCode: "field_cb",
                paramName: "Чекбокс @ field_cb",
                operator: "=",
                valueCode: "true",
                valueLabel: "Да",
            },
        ];
        (0, vitest_1.expect)((0, v2_works_catalog_match_util_1.typicalWorkRulesMatchSource)(rules, { field_cb: true })).toBe(true);
        (0, vitest_1.expect)((0, v2_works_catalog_match_util_1.typicalWorkRulesMatchSource)(rules, { field_cb: false })).toBe(false);
        (0, vitest_1.expect)((0, v2_works_catalog_match_util_1.typicalWorkRulesMatchSource)([{ ...rules[0], operator: "!=" }], { field_cb: false })).toBe(true);
    });
    (0, vitest_1.it)("resolves CSV trigger aliases to catalog params", () => {
        const catalog = [
            {
                code: "тип_источника_данных",
                values: [
                    { code: "внутренний", label: "Внутренний" },
                    { code: "внешний", label: "Внешний" },
                ],
            },
            {
                code: "вид_контроля",
                values: [
                    { code: "кд", label: "КД — Качество модельных данных" },
                ],
            },
        ];
        (0, vitest_1.expect)((0, v2_works_catalog_match_util_1.resolveTriggerStatusCatalogParam)({
            paramCode: "тип_источника_внутренний",
            paramName: "Тип источника (внутренний)",
        }, catalog)?.code).toBe("тип_источника_данных");
        (0, vitest_1.expect)((0, v2_works_catalog_match_util_1.resolveTriggerStatusCatalogParam)({
            paramCode: "вид_контроля_кд",
            paramName: "Вид контроля: КД",
        }, catalog)?.code).toBe("вид_контроля");
    });
    (0, vitest_1.it)("resolves schema `type` catalog for «Тип системы-источника» trigger", () => {
        const schemaCatalog = [
            {
                code: "type",
                values: [
                    { code: "internal", label: "Внутренний" },
                    { code: "external", label: "Внешний" },
                ],
            },
        ];
        (0, vitest_1.expect)((0, v2_works_catalog_match_util_1.isSourceTypeTriggerParam)("тип_системы_источника", "Тип системы-источника")).toBe(true);
        (0, vitest_1.expect)((0, v2_works_catalog_match_util_1.resolveTriggerStatusCatalogParam)({
            paramCode: "тип_системы_источника",
            paramName: "Тип системы-источника",
        }, schemaCatalog)?.code).toBe("type");
        (0, vitest_1.expect)((0, v2_works_catalog_match_util_1.triggerRuleCatalogGroupKey)({
            paramCode: "тип_системы_источника",
            paramName: "Тип системы-источника",
        }, schemaCatalog)).toBe("type");
    });
    (0, vitest_1.it)("matches control catalog labels by short code", () => {
        (0, vitest_1.expect)((0, v2_works_catalog_match_util_1.catalogValueMatchesTriggerRule)({ code: "кд", label: "КД — Качество модельных данных" }, {
            paramCode: "вид_контроля_кд",
            paramName: "Вид контроля: КД",
            valueCode: "кд",
            valueLabel: "КД",
        })).toBe(true);
    });
    (0, vitest_1.it)("matches source type by label when stored code is the label", () => {
        (0, vitest_1.expect)((0, v2_works_catalog_match_util_1.catalogValueMatchesTriggerRule)({ code: "внутренний", label: "Внутренний" }, {
            paramCode: "type",
            paramName: "Тип системы-источника",
            valueCode: "Внутренний",
            valueLabel: "Внутренний",
        })).toBe(true);
    });
    (0, vitest_1.it)("matches catalog codes case-insensitively", () => {
        (0, vitest_1.expect)((0, v2_works_catalog_match_util_1.catalogValueMatchesTriggerRule)({ code: "внутренний", label: "Внутренний" }, {
            paramCode: "type",
            paramName: "Тип системы-источника",
            valueCode: "ВНУТРЕННИЙ",
            valueLabel: null,
        })).toBe(true);
    });
    (0, vitest_1.it)("detects broken and methodology-only presence triggers", () => {
        (0, vitest_1.expect)((0, v2_works_catalog_match_util_1.isBrokenTypicalWorkTriggerRef)({ paramCode: "", paramName: "?" })).toBe(true);
        (0, vitest_1.expect)((0, v2_works_catalog_match_util_1.isMethodologyPresenceTriggerRule)({
            paramCode: "пилот_первичный",
            paramName: "? Пилот (первичный",
            valueCode: null,
            valueLabel: null,
        })).toBe(true);
        (0, vitest_1.expect)((0, v2_works_catalog_match_util_1.isMethodologyPresenceTriggerRule)({
            paramCode: "повторный",
            paramName: "повторный)",
            valueCode: null,
            valueLabel: null,
        })).toBe(true);
    });
    (0, vitest_1.it)("maps control trigger to вид контроля schema field without substring false positives", () => {
        const resolved = (0, v2_work_schema_params_match_util_1.resolveWorkSchemaParamForRule)({
            paramCode: "вид_контроля_ок",
            paramName: "Вид контроля: ОК",
        }, [
            {
                code: "field_adjacent",
                name: "Негативное влияние смежных проектов на показатели проекта",
            },
            {
                code: "field_control",
                name: "Вид контроля",
                values: [{ code: "ок", label: "ОК — Оперативный контроль" }],
            },
        ]);
        (0, vitest_1.expect)(resolved?.code).toBe("field_control");
    });
    (0, vitest_1.it)("archCountTriggerMatches uses minimum step threshold", () => {
        (0, vitest_1.expect)((0, v2_work_arch_count_coeff_util_1.archCountTriggerMatches)({ detailInfo: { dataMart: { name: "dm1" } } }, "dataMart", [{ count: 2, coefficient: 1 }])).toBe(false);
        (0, vitest_1.expect)((0, v2_work_arch_count_coeff_util_1.archCountTriggerMatches)({
            detailInfo: {
                dataMart: { name: "dm1" },
            },
        }, "dataMart", [{ count: 1, coefficient: 1 }])).toBe(true);
    });
    (0, vitest_1.it)("typicalWorkRulesMatchSource combines all params (AND) with global arch count", () => {
        const formData = {
            detailInfo: { dataMart: { name: "dm1" } },
        };
        const triggerArchCount = {
            kind: "dataMart",
            steps: [{ count: 1, coefficient: 1 }],
            combinator: "and",
        };
        (0, vitest_1.expect)((0, v2_works_catalog_match_util_1.typicalWorkRulesMatchSource)([
            {
                paramCode: "type",
                paramName: "Тип",
                operator: "=",
                valueCode: "internal",
                valueLabel: "Внутренний",
            },
            {
                paramCode: "region",
                paramName: "Регион",
                operator: "=",
                valueCode: "eu",
                valueLabel: "EU",
            },
        ], { type: "internal", region: "eu" }, formData, triggerArchCount)).toBe(true);
        (0, vitest_1.expect)((0, v2_works_catalog_match_util_1.typicalWorkRulesMatchSource)([
            {
                paramCode: "type",
                paramName: "Тип",
                operator: "=",
                valueCode: "internal",
                valueLabel: "Внутренний",
            },
        ], { type: "internal" }, formData, {
            kind: "dataMart",
            steps: [{ count: 3, coefficient: 1 }],
            combinator: "or",
        })).toBe(true);
    });
    (0, vitest_1.it)("matches arch-count-only trigger (model stream: Модельный сервис >= 1)", () => {
        const triggerArchCount = {
            kind: "modelService",
            steps: [{ count: 1, coefficient: 1 }],
            combinator: "and",
        };
        (0, vitest_1.expect)((0, v2_works_catalog_match_util_1.typicalWorkRulesMatchSource)([], {}, { generalInfo: { modelService: [{ workType: "x" }] } }, triggerArchCount)).toBe(true);
        (0, vitest_1.expect)((0, v2_works_catalog_match_util_1.typicalWorkRulesMatchSource)([], {}, { generalInfo: { modelService: [] } }, triggerArchCount)).toBe(false);
        (0, vitest_1.expect)((0, v2_works_catalog_match_util_1.typicalWorkRulesMatchSource)([], {}, { generalInfo: { modelService: { name: "svc" } } }, triggerArchCount)).toBe(true);
    });
    (0, vitest_1.it)("reads model-stream param triggers from formData when source is a sourceSystems row", () => {
        const rules = [
            {
                paramCode: "field_o_HRj6VO",
                paramName: "Необходимость пилота (MVP)",
                operator: "=",
                valueCode: "true",
                valueLabel: "Да",
            },
        ];
        const formDataObject = {
            generalInfo: {
                modelService: {
                    field_o_HRj6VO: true,
                },
            },
            detailInfo: {
                sourceSystems: [{ name: "SRC", type: "Внутренний" }],
            },
        };
        const formDataArray = {
            generalInfo: {
                modelService: [{ field_o_HRj6VO: true }],
            },
            detailInfo: {
                sourceSystems: [{ name: "SRC", type: "Внутренний" }],
            },
        };
        for (const formData of [formDataObject, formDataArray]) {
            (0, vitest_1.expect)((0, v2_works_catalog_match_util_1.typicalWorkRulesMatchSource)(rules, { name: "SRC", type: "Внутренний" }, formData, (0, v2_typical_work_types_1.defaultTriggerArchCount)(), {
                referencePath: "generalInfo.modelService.controlTypicalTasks",
            })).toBe(true);
        }
        (0, vitest_1.expect)((0, v2_works_catalog_match_util_1.typicalWorkRulesMatchSource)(rules, { name: "SRC", type: "Внутренний" }, {
            generalInfo: { modelService: [{ field_o_HRj6VO: false }] },
            detailInfo: { sourceSystems: [{ name: "SRC", type: "Внутренний" }] },
        }, (0, v2_typical_work_types_1.defaultTriggerArchCount)())).toBe(false);
    });
    (0, vitest_1.it)("normalizes snapshot-style trigger rule with label only", () => {
        (0, vitest_1.expect)((0, v2_works_catalog_match_util_1.typicalWorkRulesMatchSource)((0, v2_works_catalog_match_util_1.normalizeTypicalWorkTriggerRulesForMatch)([
            {
                paramCode: "field_o_HRj6VO",
                paramName: "MVP",
                operator: "=",
                valueCode: null,
                valueLabel: "Да",
            },
        ]), {}, { field_o_HRj6VO: true })).toBe(true);
    });
    (0, vitest_1.it)("normalizes factory snapshot values: [\"Да\"] string array", () => {
        (0, vitest_1.expect)((0, v2_works_catalog_match_util_1.typicalWorkRulesMatchSource)((0, v2_works_catalog_match_util_1.normalizeTypicalWorkTriggerRulesForMatch)([
            {
                paramCode: "field_o_HRj6VO",
                paramName: "Необходимость пилота (MVP)",
                operator: "=",
                valueCode: null,
                valueLabel: null,
                values: ["Да"],
            },
        ]), { field_o_HRj6VO: true })).toBe(true);
    });
    (0, vitest_1.it)("reads trigger values via schemaPointer when flat context misses them", () => {
        const rules = [
            {
                paramCode: "field_o_HRj6VO",
                paramName: "Необходимость пилота (MVP)",
                operator: "=",
                valueCode: "true",
                valueLabel: "Да",
            },
        ];
        const formData = {
            generalInfo: {
                modelService: [{ field_o_HRj6VO: true }],
            },
        };
        (0, vitest_1.expect)((0, v2_works_catalog_match_util_1.typicalWorkRulesMatchSource)(rules, {}, formData, (0, v2_typical_work_types_1.defaultTriggerArchCount)(), {
            referencePath: "generalInfo.modelService.controlTypicalTasks",
            schemaParams: [
                {
                    code: "field_o_HRj6VO",
                    schemaPointer: "/generalInfo/modelService/items/field_o_HRj6VO",
                },
            ],
        })).toBe(true);
    });
});
