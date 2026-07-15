"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const v2_works_catalog_match_util_1 = require("./v2-works-catalog-match.util");
(0, vitest_1.describe)("numeric labor coefficient ranges", () => {
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
});
