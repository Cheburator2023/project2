"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const v2_overall_uncertainty_config_util_1 = require("./v2-overall-uncertainty-config.util");
const v2_overall_uncertainty_runtime_util_1 = require("./v2-overall-uncertainty-runtime.util");
(0, vitest_1.describe)("v2-overall-uncertainty-config.util v2", () => {
    (0, vitest_1.it)("returns coefficient 1 when section is not applicable", () => {
        const config = (0, v2_overall_uncertainty_config_util_1.createDefaultOverallUncertaintyConfig)();
        const preview = (0, v2_overall_uncertainty_config_util_1.createDefaultOverallUncertaintyPreviewState)(config);
        const result = (0, v2_overall_uncertainty_config_util_1.calculateOverallUncertaintyPreview)(config, preview);
        (0, vitest_1.expect)(result.coefficient).toBe(1);
        (0, vitest_1.expect)(result.applicable).toBe(false);
    });
    (0, vitest_1.it)("uses SA dictionary labels and methodology matrix by default", () => {
        const config = (0, v2_overall_uncertainty_config_util_1.createDefaultOverallUncertaintyConfig)();
        (0, vitest_1.expect)(config.severityLevels).toHaveLength(5);
        // Уровень 0 вероятности — «Не применимо», далее 5 значений СА.
        (0, vitest_1.expect)(config.probabilityLevels).toHaveLength(6);
        (0, vitest_1.expect)(config.probabilityLevels[0]?.label).toBe("Не применимо");
        (0, vitest_1.expect)(config.probabilityLevels[1]?.label).toContain("10 лет");
        (0, vitest_1.expect)(config.probabilityLevels[5]?.label).toContain("6 мес");
        // Группы: 4 значащих + «Не применимо» с коэффициентом 0.
        (0, vitest_1.expect)(config.groups).toHaveLength(5);
        (0, vitest_1.expect)(config.groups.find((g) => g.id === "grp_not_applicable")?.coef).toBe(0);
        (0, vitest_1.expect)(config.severityLevels[0]?.timelineLabel).toBe("Менее 1 мес.");
        // Столбец «Не применимо» всегда даёт ноль.
        (0, vitest_1.expect)(config.matrix.every((row) => row[0] === "grp_not_applicable")).toBe(true);
        // Низкая × очень высокая → Средний (0.05)
        (0, vitest_1.expect)(config.matrix[0]?.[5]).toBe("grp_medium");
        // Неприемлемая × средняя → Очень высокий
        (0, vitest_1.expect)(config.matrix[4]?.[3]).toBe("grp_very_high");
        (0, vitest_1.expect)(config.aggregation).toBe("sum");
        (0, vitest_1.expect)(config.adjustment).toMatchObject({
            minPct: 0,
            maxPct: 30,
            defaultPct: 0,
        });
    });
    (0, vitest_1.it)("sums risk coefs by default (aggregation = sum)", () => {
        const config = (0, v2_overall_uncertainty_config_util_1.createDefaultOverallUncertaintyConfig)();
        const preview = (0, v2_overall_uncertainty_config_util_1.createDefaultOverallUncertaintyPreviewState)(config);
        preview.enabled = true;
        preview.timelineIdx = 0;
        preview.costIdx = 0;
        // Two risks at lowest severity × highest prob → medium 0.05 each
        preview.risks[0].enabled = true;
        preview.risks[0].goalsIdx = 0;
        preview.risks[0].probIdx = 5;
        preview.risks[1].enabled = true;
        preview.risks[1].goalsIdx = 0;
        preview.risks[1].probIdx = 5;
        const result = (0, v2_overall_uncertainty_config_util_1.calculateOverallUncertaintyPreview)(config, preview);
        (0, vitest_1.expect)(result.aggregation).toBe("sum");
        (0, vitest_1.expect)(result.riskAggregate).toBe(0.1);
        (0, vitest_1.expect)(result.coefficient).toBe(1.1);
    });
    (0, vitest_1.it)("averages risk coefs when aggregation = avg", () => {
        const config = (0, v2_overall_uncertainty_config_util_1.createDefaultOverallUncertaintyConfig)();
        config.aggregation = "avg";
        const preview = (0, v2_overall_uncertainty_config_util_1.createDefaultOverallUncertaintyPreviewState)(config);
        preview.enabled = true;
        preview.risks[0].enabled = true;
        preview.risks[0].goalsIdx = 4; // ур.5 × макс. вероятность → 0.1
        preview.risks[0].probIdx = 5;
        preview.risks[1].enabled = true;
        preview.risks[1].goalsIdx = 0; // ур.1 × макс. вероятность → 0.05
        preview.risks[1].probIdx = 5;
        const result = (0, v2_overall_uncertainty_config_util_1.calculateOverallUncertaintyPreview)(config, preview);
        (0, vitest_1.expect)(result.riskAggregate).toBe(0.075);
        (0, vitest_1.expect)(result.coefficient).toBe(1.08);
    });
    (0, vitest_1.it)("probability «Не применимо» keeps risk enabled but contributes zero", () => {
        const config = (0, v2_overall_uncertainty_config_util_1.createDefaultOverallUncertaintyConfig)();
        const preview = (0, v2_overall_uncertainty_config_util_1.createDefaultOverallUncertaintyPreviewState)(config);
        preview.enabled = true;
        preview.risks[0].enabled = true;
        preview.risks[0].goalsIdx = 4;
        preview.risks[0].probIdx = 0; // «Не применимо»
        preview.risks[1].enabled = true;
        preview.risks[1].goalsIdx = 0;
        preview.risks[1].probIdx = 5; // 0.05
        const result = (0, v2_overall_uncertainty_config_util_1.calculateOverallUncertaintyPreview)(config, preview);
        (0, vitest_1.expect)(result.enabledRiskCount).toBe(2);
        (0, vitest_1.expect)(result.riskContributions[0]?.coef).toBe(0);
        (0, vitest_1.expect)(result.riskAggregate).toBe(0.05);
        (0, vitest_1.expect)(result.coefficient).toBe(1.05);
    });
    (0, vitest_1.it)("uses max severity of timeline/cost and matrix group coef", () => {
        const config = (0, v2_overall_uncertainty_config_util_1.createDefaultOverallUncertaintyConfig)();
        const preview = (0, v2_overall_uncertainty_config_util_1.createDefaultOverallUncertaintyPreviewState)(config);
        preview.enabled = true;
        preview.timelineIdx = 1;
        preview.costIdx = 3; // base severity = 3
        preview.risks[0].enabled = true;
        preview.risks[0].goalsIdx = 2; // max(3,2)=3
        preview.risks[0].probIdx = 5;
        const result = (0, v2_overall_uncertainty_config_util_1.calculateOverallUncertaintyPreview)(config, preview);
        (0, vitest_1.expect)(result.baseSeverityIdx).toBe(3);
        (0, vitest_1.expect)(result.riskContributions).toHaveLength(1);
        (0, vitest_1.expect)(result.coefficient).toBe(round2(1 + result.riskAggregate));
    });
    (0, vitest_1.it)("adjustment is added on top of risk aggregate (1 + agg + pct/100)", () => {
        const config = (0, v2_overall_uncertainty_config_util_1.createDefaultOverallUncertaintyConfig)();
        const preview = (0, v2_overall_uncertainty_config_util_1.createDefaultOverallUncertaintyPreviewState)(config);
        preview.enabled = true;
        preview.adjPct = 5;
        preview.risks[0].enabled = true;
        preview.risks[0].probIdx = 5;
        preview.risks[0].goalsIdx = 4; // очень высокий 0.1
        const result = (0, v2_overall_uncertainty_config_util_1.calculateOverallUncertaintyPreview)(config, preview);
        (0, vitest_1.expect)(result.riskAggregate).toBe(0.1);
        (0, vitest_1.expect)(result.adjustmentShare).toBe(0.05);
        // Сквозной пример методики: 1 + 0.15 нет, здесь 1 + 0.1 + 0.05 = 1.15
        (0, vitest_1.expect)(result.coefficient).toBe(1.15);
    });
    (0, vitest_1.it)("clamps adjustment to configured bounds", () => {
        const config = (0, v2_overall_uncertainty_config_util_1.createDefaultOverallUncertaintyConfig)();
        config.adjustment = { minPct: 0, maxPct: 10, defaultPct: 0, hint: "" };
        const preview = (0, v2_overall_uncertainty_config_util_1.createDefaultOverallUncertaintyPreviewState)(config);
        preview.enabled = true;
        preview.adjPct = 25; // выше maxPct → 10
        const result = (0, v2_overall_uncertainty_config_util_1.calculateOverallUncertaintyPreview)(config, preview);
        (0, vitest_1.expect)(result.adjustmentShare).toBe(0.1);
        (0, vitest_1.expect)(result.coefficient).toBe(1.1);
    });
    (0, vitest_1.it)("applies risk count multiplier", () => {
        (0, vitest_1.expect)((0, v2_overall_uncertainty_config_util_1.resolveUncertaintyRiskCountCoef)(2, [
            { minCount: 2, maxCount: 3, coef: 1.1 },
            { minCount: 4, maxCount: null, coef: 1.25 },
        ])).toBe(1.1);
        (0, vitest_1.expect)((0, v2_overall_uncertainty_config_util_1.resolveUncertaintyRiskCountCoef)(5, [
            { minCount: 2, maxCount: 3, coef: 1.1 },
            { minCount: 4, maxCount: null, coef: 1.25 },
        ])).toBe(1.25);
    });
    (0, vitest_1.it)("round-trips calculator state including Заполняется toggle", () => {
        const config = (0, v2_overall_uncertainty_config_util_1.createDefaultOverallUncertaintyConfig)();
        const preview = (0, v2_overall_uncertainty_config_util_1.createDefaultOverallUncertaintyPreviewState)(config);
        preview.enabled = true;
        preview.timelineIdx = 2;
        preview.costIdx = 1;
        preview.adjPct = 12;
        preview.risks[0].enabled = true;
        preview.risks[0].probIdx = 3;
        preview.risks[0].goalsIdx = 2;
        config.calculator = preview;
        const merged = (0, v2_overall_uncertainty_config_util_1.mergeOverallUncertaintyConfigIntoLogic)([], config);
        const parsed = (0, v2_overall_uncertainty_config_util_1.parseOverallUncertaintyConfigFromLogic)(merged);
        (0, vitest_1.expect)(parsed.calculator?.enabled).toBe(true);
        (0, vitest_1.expect)(parsed.calculator?.timelineIdx).toBe(2);
        (0, vitest_1.expect)(parsed.calculator?.costIdx).toBe(1);
        (0, vitest_1.expect)(parsed.calculator?.adjPct).toBe(12);
        (0, vitest_1.expect)(parsed.calculator?.risks[0]).toMatchObject({
            enabled: true,
            probIdx: 3,
            goalsIdx: 2,
        });
    });
    (0, vitest_1.it)("round-trips calculator defaults through formData.uncertaintyCalculation", () => {
        const config = (0, v2_overall_uncertainty_config_util_1.createDefaultOverallUncertaintyConfig)();
        const preview = (0, v2_overall_uncertainty_config_util_1.createDefaultOverallUncertaintyPreviewState)(config);
        preview.enabled = true;
        preview.timelineIdx = 1;
        preview.costIdx = 2;
        preview.risks[0].enabled = true;
        preview.risks[0].probIdx = 2;
        preview.risks[0].goalsIdx = 1;
        const formData = (0, v2_overall_uncertainty_runtime_util_1.mapOverallUncertaintyPreviewToFormData)({}, config, preview);
        const back = (0, v2_overall_uncertainty_runtime_util_1.mapFormDataToOverallUncertaintyPreview)(formData, config);
        (0, vitest_1.expect)(back.enabled).toBe(true);
        (0, vitest_1.expect)(back.timelineIdx).toBe(1);
        (0, vitest_1.expect)(back.costIdx).toBe(2);
        (0, vitest_1.expect)(back.risks[0]).toMatchObject({
            enabled: true,
            probIdx: 2,
            goalsIdx: 1,
        });
        preview.enabled = false;
        const off = (0, v2_overall_uncertainty_runtime_util_1.mapOverallUncertaintyPreviewToFormData)({}, config, preview);
        (0, vitest_1.expect)((0, v2_overall_uncertainty_runtime_util_1.mapFormDataToOverallUncertaintyPreview)(off, config).enabled).toBe(false);
    });
    (0, vitest_1.it)("round-trips v2 config through logic and migrates v1", () => {
        const config = (0, v2_overall_uncertainty_config_util_1.createDefaultOverallUncertaintyConfig)();
        config.groups[0].coef = 0.042;
        config.aggregation = "avg";
        config.adjustment = {
            minPct: 0,
            maxPct: 20,
            defaultPct: 5,
            hint: "экспертная надбавка",
        };
        const merged = (0, v2_overall_uncertainty_config_util_1.mergeOverallUncertaintyConfigIntoLogic)([], config);
        const parsed = (0, v2_overall_uncertainty_config_util_1.parseOverallUncertaintyConfigFromLogic)(merged);
        (0, vitest_1.expect)(parsed.version).toBe(2);
        (0, vitest_1.expect)(parsed.groups[0].coef).toBe(0.042);
        (0, vitest_1.expect)(parsed.aggregation).toBe("avg");
        (0, vitest_1.expect)(parsed.adjustment).toMatchObject({
            maxPct: 20,
            defaultPct: 5,
            hint: "экспертная надбавка",
        });
        (0, vitest_1.expect)(parsed.matrix.length).toBe(parsed.severityLevels.length);
        const v1Migrated = (0, v2_overall_uncertainty_config_util_1.parseOverallUncertaintyConfigFromLogic)([
            {
                id: "v2-overall-uncertainty-config",
                kind: "computed",
                targetPath: "/uncertaintyCalculation",
                dependencies: [],
                condition: true,
                payload: {
                    role: "overall_uncertainty_config",
                    version: 1,
                    config: {
                        version: 1,
                        tiers: [{ label: "Низкая", coef: 1 }],
                        timelineOpts: [{ label: "коротко", coef: 1 }],
                        costOpts: [{ label: "дёшево", coef: 1 }],
                        probOpts: [{ label: "редко", weight: 0.1 }],
                        riskWeight: 0.5,
                        risks: [{ id: "r1", name: "Риск 1", defaultProbIdx: 0, defaultImpactIdx: 0 }],
                    },
                },
            },
        ]);
        (0, vitest_1.expect)(v1Migrated.version).toBe(2);
        (0, vitest_1.expect)(v1Migrated.severityLevels[0]?.timelineLabel).toBe("коротко");
        (0, vitest_1.expect)(v1Migrated.severityLevels[0]?.costLabel).toBe("дёшево");
        (0, vitest_1.expect)(v1Migrated.severityLevels[0]?.goalsLabel).toBe("Низкая");
    });
});
function round2(n) {
    return Math.round(n * 100) / 100;
}
