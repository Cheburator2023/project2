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
});
