import { describe, expect, it } from "vitest";
import {
	calculateOverallUncertaintyPreview,
	createDefaultOverallUncertaintyConfig,
	createDefaultOverallUncertaintyPreviewState,
	mergeOverallUncertaintyConfigIntoLogic,
	parseOverallUncertaintyConfigFromLogic,
	resolveUncertaintyRiskCountCoef,
} from "./v2-overall-uncertainty-config.util";
import {
	mapFormDataToOverallUncertaintyPreview,
	mapOverallUncertaintyPreviewToFormData,
} from "./v2-overall-uncertainty-runtime.util";

describe("v2-overall-uncertainty-config.util v2", () => {
	it("returns coefficient 1 when section is not applicable", () => {
		const config = createDefaultOverallUncertaintyConfig();
		const preview = createDefaultOverallUncertaintyPreviewState(config);
		const result = calculateOverallUncertaintyPreview(config, preview);
		expect(result.coefficient).toBe(1);
		expect(result.applicable).toBe(false);
	});

	it("uses SA dictionary labels and methodology matrix by default", () => {
		const config = createDefaultOverallUncertaintyConfig();
		expect(config.severityLevels).toHaveLength(5);
		expect(config.probabilityLevels).toHaveLength(5);
		expect(config.groups).toHaveLength(4);
		expect(config.severityLevels[0]?.timelineLabel).toBe("Менее 1 мес.");
		expect(config.probabilityLevels[0]?.label).toContain("10 лет");
		expect(config.probabilityLevels[4]?.label).toContain("6 мес");
		// Низкая × очень высокая → Средний (0.05)
		expect(config.matrix[0]?.[4]).toBe("grp_medium");
		// Неприемлемая × средняя → Очень высокий
		expect(config.matrix[4]?.[2]).toBe("grp_very_high");
		expect(config.riskCountRanges[0]).toEqual({
			minCount: 1,
			maxCount: 1,
			coef: 1,
		});
	});

	it("averages risk coefs and multiplies by risk-count factor", () => {
		const config = createDefaultOverallUncertaintyConfig();
		const preview = createDefaultOverallUncertaintyPreviewState(config);
		preview.enabled = true;
		preview.timelineIdx = 0;
		preview.costIdx = 0;
		// Two risks at lowest severity × highest prob → medium 0.05 each; count 2 → ×1.1
		preview.risks[0]!.enabled = true;
		preview.risks[0]!.goalsIdx = 0;
		preview.risks[0]!.probIdx = 4;
		preview.risks[1]!.enabled = true;
		preview.risks[1]!.goalsIdx = 0;
		preview.risks[1]!.probIdx = 4;

		const result = calculateOverallUncertaintyPreview(config, preview);
		expect(result.riskAvgCoef).toBe(0.05);
		expect(result.riskCountCoef).toBe(1.1);
		expect(result.autoAdj).toBe(0.055);
		expect(result.coefficient).toBe(1.06);
	});

	it("uses max severity of timeline/cost and matrix group coef", () => {
		const config = createDefaultOverallUncertaintyConfig();
		const preview = createDefaultOverallUncertaintyPreviewState(config);
		preview.enabled = true;
		preview.timelineIdx = 1;
		preview.costIdx = 3; // base severity = 3
		preview.risks[0]!.enabled = true;
		preview.risks[0]!.goalsIdx = 2; // max(3,2)=3
		preview.risks[0]!.probIdx = 4;

		const result = calculateOverallUncertaintyPreview(config, preview);
		expect(result.baseSeverityIdx).toBe(3);
		expect(result.riskContributions).toHaveLength(1);
		expect(result.manualOverridesRisks).toBe(false);
		expect(result.coefficient).toBe(round2(1 + result.autoAdj));
	});

	it("manual adjustment fully overrides risk auto calculation", () => {
		const config = createDefaultOverallUncertaintyConfig();
		const preview = createDefaultOverallUncertaintyPreviewState(config);
		preview.enabled = true;
		preview.adjPct = 10;
		preview.risks[0]!.enabled = true;
		preview.risks[0]!.probIdx = 4;
		preview.risks[0]!.goalsIdx = 4;

		const result = calculateOverallUncertaintyPreview(config, preview);
		expect(result.manualOverridesRisks).toBe(true);
		expect(result.coefficient).toBe(1.1);
	});

	it("applies risk count multiplier", () => {
		expect(
			resolveUncertaintyRiskCountCoef(2, [
				{ minCount: 2, maxCount: 3, coef: 1.1 },
				{ minCount: 4, maxCount: null, coef: 1.25 },
			]),
		).toBe(1.1);
		expect(
			resolveUncertaintyRiskCountCoef(5, [
				{ minCount: 2, maxCount: 3, coef: 1.1 },
				{ minCount: 4, maxCount: null, coef: 1.25 },
			]),
		).toBe(1.25);
	});

	it("round-trips calculator state including Заполняется toggle", () => {
		const config = createDefaultOverallUncertaintyConfig();
		const preview = createDefaultOverallUncertaintyPreviewState(config);
		preview.enabled = true;
		preview.timelineIdx = 2;
		preview.costIdx = 1;
		preview.adjPct = 12;
		preview.risks[0]!.enabled = true;
		preview.risks[0]!.probIdx = 3;
		preview.risks[0]!.goalsIdx = 2;
		config.calculator = preview;

		const merged = mergeOverallUncertaintyConfigIntoLogic([], config);
		const parsed = parseOverallUncertaintyConfigFromLogic(merged);
		expect(parsed.calculator?.enabled).toBe(true);
		expect(parsed.calculator?.timelineIdx).toBe(2);
		expect(parsed.calculator?.costIdx).toBe(1);
		expect(parsed.calculator?.adjPct).toBe(12);
		expect(parsed.calculator?.risks[0]).toMatchObject({
			enabled: true,
			probIdx: 3,
			goalsIdx: 2,
		});
	});

	it("round-trips calculator defaults through formData.uncertaintyCalculation", () => {
		const config = createDefaultOverallUncertaintyConfig();
		const preview = createDefaultOverallUncertaintyPreviewState(config);
		preview.enabled = true;
		preview.timelineIdx = 1;
		preview.costIdx = 2;
		preview.risks[0]!.enabled = true;
		preview.risks[0]!.probIdx = 2;
		preview.risks[0]!.goalsIdx = 1;

		const formData = mapOverallUncertaintyPreviewToFormData({}, config, preview);
		const back = mapFormDataToOverallUncertaintyPreview(formData, config);
		expect(back.enabled).toBe(true);
		expect(back.timelineIdx).toBe(1);
		expect(back.costIdx).toBe(2);
		expect(back.risks[0]).toMatchObject({
			enabled: true,
			probIdx: 2,
			goalsIdx: 1,
		});

		preview.enabled = false;
		const off = mapOverallUncertaintyPreviewToFormData({}, config, preview);
		expect(mapFormDataToOverallUncertaintyPreview(off, config).enabled).toBe(
			false,
		);
	});

	it("round-trips v2 config through logic and migrates v1", () => {
		const config = createDefaultOverallUncertaintyConfig();
		config.groups[0]!.coef = 0.042;
		const merged = mergeOverallUncertaintyConfigIntoLogic([], config);
		const parsed = parseOverallUncertaintyConfigFromLogic(merged);
		expect(parsed.version).toBe(2);
		expect(parsed.groups[0]!.coef).toBe(0.042);
		expect(parsed.matrix.length).toBe(parsed.severityLevels.length);

		const v1Migrated = parseOverallUncertaintyConfigFromLogic([
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
		expect(v1Migrated.version).toBe(2);
		expect(v1Migrated.severityLevels[0]?.timelineLabel).toBe("коротко");
		expect(v1Migrated.severityLevels[0]?.costLabel).toBe("дёшево");
		expect(v1Migrated.severityLevels[0]?.goalsLabel).toBe("Низкая");
	});
});

function round2(n: number): number {
	return Math.round(n * 100) / 100;
}
