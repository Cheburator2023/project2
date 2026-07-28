"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const v2_works_catalog_match_util_1 = require("./v2-works-catalog-match.util");
(0, vitest_1.describe)("numeric labor coefficient ranges", () => {
    (0, vitest_1.it)("coerces string numbers for matching", () => {
        (0, vitest_1.expect)((0, v2_works_catalog_match_util_1.coerceNumericLaborActual)("7")).toBe(7);
        (0, vitest_1.expect)((0, v2_works_catalog_match_util_1.laborValueMatches)("7", "7", "7")).toBe(true);
        (0, vitest_1.expect)((0, v2_works_catalog_match_util_1.laborValueMatches)("Не требуется", null, "Не требуется")).toBe(true);
    });
    (0, vitest_1.it)("matches regulatory enum prefix against short labor labels", () => {
        (0, vitest_1.expect)((0, v2_works_catalog_match_util_1.laborValueMatches)("4 — Банком не планируется предоставление Модели Регулятору, но регулярная валидация установлена Регулятором", "4", "4")).toBe(true);
        (0, vitest_1.expect)((0, v2_works_catalog_match_util_1.laborValueMatches)("1 — Проведение регулярной валидации Регулятором нормативно не установлено", null, "1")).toBe(true);
        (0, vitest_1.expect)((0, v2_works_catalog_match_util_1.laborValueMatches)("4 — …", null, "5")).toBe(false);
    });
    (0, vitest_1.it)("matches enum prefix when only valueCode is set", () => {
        (0, vitest_1.expect)((0, v2_works_catalog_match_util_1.laborValueMatches)("4 — Банком не планируется предоставление Модели Регулятору", "4", null)).toBe(true);
    });
    (0, vitest_1.it)("matches non-digit short codes with enum prefix", () => {
        (0, vitest_1.expect)((0, v2_works_catalog_match_util_1.laborValueMatches)("ОК — Оперативный контроль", "ОК", "ОК")).toBe(true);
        (0, vitest_1.expect)((0, v2_works_catalog_match_util_1.laborValueMatches)("КД — Качество данных", null, "КД")).toBe(true);
    });
    (0, vitest_1.it)("matches boolean productivization Да/Нет labels", () => {
        (0, vitest_1.expect)((0, v2_works_catalog_match_util_1.laborValueMatches)(true, null, "Да")).toBe(true);
        (0, vitest_1.expect)((0, v2_works_catalog_match_util_1.laborValueMatches)(false, null, "Нет")).toBe(true);
        (0, vitest_1.expect)((0, v2_works_catalog_match_util_1.laborValueMatches)("Да", null, "Да")).toBe(true);
        (0, vitest_1.expect)((0, v2_works_catalog_match_util_1.laborValueMatches)("Нет", null, "Нет")).toBe(true);
        (0, vitest_1.expect)((0, v2_works_catalog_match_util_1.laborValueMatches)(true, null, "Нет")).toBe(false);
    });
    (0, vitest_1.it)("matches labor values against array answers", () => {
        (0, vitest_1.expect)((0, v2_works_catalog_match_util_1.laborValueMatches)(["Низкая", "Высокая"], "Высокая", "Высокая")).toBe(true);
        (0, vitest_1.expect)((0, v2_works_catalog_match_util_1.laborValueMatches)(["Нет", "Иногда"], "Да", "Да")).toBe(false);
    });
    (0, vitest_1.it)("resolves complexity and readyPromReports coefficients from form answers", () => {
        const coeffs = (0, v2_works_catalog_match_util_1.resolveByValueLaborParamCoefficients)({
            complexity: "4 — Банком не планируется предоставление Модели Регулятору, но регулярная валидация установлена Регулятором",
            readyPromReports: true,
        }, [
            {
                paramCode: "complexity",
                paramName: "Сложность постановки",
                valueCode: "4",
                valueLabel: "4",
                coefficient: 1.75,
            },
            {
                paramCode: "readyPromReports",
                paramName: "Наличие готовых промышленных витрин",
                valueCode: "Да",
                valueLabel: "Да",
                coefficient: 0.5,
            },
        ]);
        (0, vitest_1.expect)(coeffs).toEqual({
            complexity: 1.75,
            readyPromReports: 0.5,
        });
    });
    (0, vitest_1.it)("matches non-overlapping Russian range labels", () => {
        (0, vitest_1.expect)((0, v2_works_catalog_match_util_1.laborValueMatches)(20, "do_20", "до 20 метрик")).toBe(true);
        (0, vitest_1.expect)((0, v2_works_catalog_match_util_1.laborValueMatches)(35, "20_50", "20–50 метрик")).toBe(true);
        (0, vitest_1.expect)((0, v2_works_catalog_match_util_1.laborValueMatches)(51, "over_50", ">50 метрик")).toBe(true);
        (0, vitest_1.expect)((0, v2_works_catalog_match_util_1.laborValueMatches)(20, "20_50", "20–50 метрик")).toBe(false);
    });
    (0, vitest_1.it)("resolves metric count into the imported coefficient", () => {
        const rows = [
            {
                paramCode: "kolichestvo_metrik",
                paramName: "Количество метрик",
                valueCode: "do_20",
                valueLabel: "до 20 метрик",
                coefficient: 1,
            },
            {
                paramCode: "kolichestvo_metrik",
                paramName: "Количество метрик",
                valueCode: "20_50",
                valueLabel: "20–50 метрик",
                coefficient: 1.2,
            },
            {
                paramCode: "kolichestvo_metrik",
                paramName: "Количество метрик",
                valueCode: "over_50",
                valueLabel: ">50 метрик",
                coefficient: 1.4,
            },
        ];
        (0, vitest_1.expect)((0, v2_works_catalog_match_util_1.resolveByValueLaborParamCoefficients)({ kolichestvo_metrik: 42 }, rows)).toEqual({ kolichestvo_metrik: 1.2 });
    });
    (0, vitest_1.it)("reads generalInfo numeric params from formData when absent on arch row", () => {
        const rows = [
            {
                paramCode: "assessedInitiativesCount",
                paramName: "Количество оцениваемых инициатив",
                valueCode: "to_99",
                valueLabel: "до 99",
                coefficient: 1.5,
            },
        ];
        const source = { name: "Витрина 1", field_28IPlEQu: 10 };
        const formData = {
            generalInfo: { assessedInitiativesCount: 4 },
            detailInfo: { dataMart: source },
        };
        const lookup = (0, v2_works_catalog_match_util_1.buildLaborCoefficientLookupSource)(source, formData, [
            {
                code: "assessedInitiativesCount",
                schemaPointer: "/generalInfo/assessedInitiativesCount",
            },
        ], ["assessedInitiativesCount"]);
        (0, vitest_1.expect)(lookup.assessedInitiativesCount).toBe(4);
        (0, vitest_1.expect)((0, v2_works_catalog_match_util_1.resolveByValueLaborParamCoefficients)(lookup, rows)).toEqual({
            assessedInitiativesCount: 1.5,
        });
    });
    (0, vitest_1.it)("falls back to same-titled field on source when formula code points elsewhere", () => {
        const source = {
            name: "Источник 1",
            field_L1lRlgf1: "Высокая",
        };
        const lookup = (0, v2_works_catalog_match_util_1.buildLaborCoefficientLookupSource)(source, { detailInfo: { dataProcess: {}, sourceSystems: [source] } }, [
            {
                code: "field_UEzs5Q87",
                name: "Сложность реализации",
                schemaPointer: "/detailInfo/dataProcess/field_UEzs5Q87",
            },
            {
                code: "field_L1lRlgf1",
                name: "Сложность реализации",
                schemaPointer: "/detailInfo/sourceSystems/items/field_L1lRlgf1",
            },
        ], ["field_UEzs5Q87"]);
        (0, vitest_1.expect)(lookup.field_UEzs5Q87).toBe("Высокая");
        (0, vitest_1.expect)((0, v2_works_catalog_match_util_1.resolveByValueLaborParamCoefficients)(lookup, [
            {
                paramCode: "field_UEzs5Q87",
                paramName: "Сложность реализации",
                valueCode: "Высокая",
                valueLabel: "Высокая",
                coefficient: 1.2,
            },
            {
                paramCode: "field_UEzs5Q87",
                paramName: "Сложность реализации",
                valueCode: "Средняя",
                valueLabel: "Средняя",
                coefficient: 0.8,
            },
        ])).toEqual({ field_UEzs5Q87: 1.2 });
    });
    (0, vitest_1.it)("reads boolean checkbox from array-shaped dataProcess without schemaParams", () => {
        const formData = {
            detailInfo: {
                dataProcess: [
                    {
                        name: "Процесс 1",
                        field_qMxSfHk1: true,
                        field_yJ51GkCR: "Разработка",
                    },
                ],
            },
        };
        const lookup = (0, v2_works_catalog_match_util_1.buildLaborCoefficientLookupSource)({ name: "Источник 1", type: "Внутренний" }, formData, [], ["field_qMxSfHk1", "field_yJ51GkCR"]);
        (0, vitest_1.expect)(lookup.field_qMxSfHk1).toBe(true);
        (0, vitest_1.expect)(lookup.field_yJ51GkCR).toBe("Разработка");
        (0, vitest_1.expect)((0, v2_works_catalog_match_util_1.resolveByValueLaborParamCoefficients)(lookup, [
            {
                paramCode: "field_qMxSfHk1",
                paramName: "Требуется интеграция",
                valueCode: "Да",
                valueLabel: "Да",
                coefficient: 1.5,
            },
            {
                paramCode: "field_qMxSfHk1",
                paramName: "Требуется интеграция",
                valueCode: "Нет",
                valueLabel: "Нет",
                coefficient: 1,
            },
        ])).toEqual({ field_qMxSfHk1: 1.5 });
    });
    (0, vitest_1.it)("collects all matching field values from multiple arch components", () => {
        const formData = {
            detailInfo: {
                dataProcess: [
                    { field_archComplexity: "Низкая" },
                    { field_archComplexity: "Высокая" },
                ],
            },
        };
        (0, vitest_1.expect)((0, v2_works_catalog_match_util_1.findFieldValueInFormData)(formData, "field_archComplexity")).toEqual([
            "Низкая",
            "Высокая",
        ]);
    });
    (0, vitest_1.it)("resolves multi-model readyPromReports with max and source labels", () => {
        const formData = {
            detailInfo: {
                modelsList: [
                    { name: "вава", readyPromReports: true },
                    { name: "вавыаы" },
                    { name: "выавыавы", readyPromReports: false },
                ],
            },
        };
        const lookup = (0, v2_works_catalog_match_util_1.buildLaborCoefficientLookupSource)({}, formData, [], ["readyPromReports"]);
        (0, vitest_1.expect)(lookup.readyPromReports).toEqual([true, false]);
        const details = (0, v2_works_catalog_match_util_1.resolveByValueLaborParamCoefficientDetails)(lookup, [
            {
                paramCode: "readyPromReports",
                paramName: "Наличие готовых промышленных витрин",
                valueCode: "Да",
                valueLabel: "Да",
                coefficient: 0.5,
            },
            {
                paramCode: "readyPromReports",
                paramName: "Наличие готовых промышленных витрин",
                valueCode: "Нет",
                valueLabel: "Нет",
                coefficient: 1,
            },
        ], formData);
        (0, vitest_1.expect)(details.readyPromReports).toMatchObject({
            value: 1,
            aggregation: "max",
            formulaValueLabel: "max(0.5, 1)",
        });
        (0, vitest_1.expect)(details.readyPromReports?.parts).toEqual([
            { sourceLabel: "вава", answerLabel: "Да", coefficient: 0.5 },
            { sourceLabel: "выавыавы", answerLabel: "Нет", coefficient: 1 },
        ]);
    });
    (0, vitest_1.it)("uses max coefficient when several component values match", () => {
        const coeffs = (0, v2_works_catalog_match_util_1.resolveByValueLaborParamCoefficients)({
            complexity: ["Низкая", "Высокая"],
        }, [
            {
                paramCode: "complexity",
                paramName: "Сложность",
                valueCode: "Низкая",
                valueLabel: "Низкая",
                coefficient: 0.8,
            },
            {
                paramCode: "complexity",
                paramName: "Сложность",
                valueCode: "Высокая",
                valueLabel: "Высокая",
                coefficient: 1.4,
            },
        ]);
        (0, vitest_1.expect)(coeffs).toEqual({ complexity: 1.4 });
    });
    (0, vitest_1.it)("flattenSourceContextValue unwraps arch-object arrays", () => {
        (0, vitest_1.expect)((0, v2_works_catalog_match_util_1.flattenSourceContextValue)([{ field_qMxSfHk1: true, a: 1 }])).toEqual({ field_qMxSfHk1: true, a: 1 });
        (0, vitest_1.expect)((0, v2_works_catalog_match_util_1.flattenSourceContextValue)({ field_qMxSfHk1: false })).toEqual({
            field_qMxSfHk1: false,
        });
        (0, vitest_1.expect)((0, v2_works_catalog_match_util_1.flattenSourceContextValue)([])).toEqual({});
    });
});
