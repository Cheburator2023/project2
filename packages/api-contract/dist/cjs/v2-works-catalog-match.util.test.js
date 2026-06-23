"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const v2_works_catalog_match_util_1 = require("./v2-works-catalog-match.util");
(0, vitest_1.describe)("v2-works-catalog-match.util", () => {
    (0, vitest_1.it)("resolves stream from source type", () => {
        (0, vitest_1.expect)((0, v2_works_catalog_match_util_1.resolveStreamFromSourceType)({ type: "Внутренний" })).toBe("ИД. Внутренний");
        (0, vitest_1.expect)((0, v2_works_catalog_match_util_1.resolveStreamFromSourceType)({ type: "Внешний" })).toBe("ИД. Внешний");
    });
    (0, vitest_1.it)("collects streams from source systems", () => {
        (0, vitest_1.expect)((0, v2_works_catalog_match_util_1.resolveStreamsFromSourceSystems)({
            streamDataSources: {
                sourceSystems: [{ type: "Внутренний" }, { type: "Внешний" }],
            },
        })).toEqual(["ИД. Внутренний", "ИД. Внешний"]);
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
});
