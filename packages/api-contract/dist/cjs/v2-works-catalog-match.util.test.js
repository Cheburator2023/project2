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
});
