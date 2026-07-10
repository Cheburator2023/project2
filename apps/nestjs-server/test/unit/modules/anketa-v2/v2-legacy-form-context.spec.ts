import { parseFormNumber, parseLegacyMultiplierLabel } from "../../../../src/modules/anketa-v2/utils/v2-form-number.util";
import { resolveLegacyFormContext } from "../../../../src/modules/anketa-v2/utils/v2-legacy-form-context.util";
import { evaluateLegacyV2Summary } from "../../../../src/modules/anketa-v2/services/v2-legacy-stage-evaluation";

describe("v2-form-number.util", () => {
	it("parses numeric strings and multiplier labels", () => {
		expect(parseFormNumber("666")).toBe(666);
		expect(parseFormNumber("1.5")).toBe(1.5);
		expect(parseFormNumber("×1.25")).toBe(1.25);
		expect(parseFormNumber("x3")).toBe(3);
		expect(parseLegacyMultiplierLabel("4 — Высокая ×2.00")).toBe(2);
		expect(parseLegacyMultiplierLabel("x1.5")).toBe(1.5);
	});
});

describe("v2-legacy-form-context.util", () => {
	it("reads modelsList algorithmType and autoML from detailInfo", () => {
		const ctx = resolveLegacyFormContext({
			detailInfo: {
				modelsList: [
					{ algorithmType: "CV", autoML: true },
					{ algorithmType: "NLP", autoML: false },
				],
			},
		});
		expect(ctx.modelsCount).toBe(2);
		expect(ctx.algorithmTypes).toEqual(["CV", "NLP"]);
		expect(ctx.autoMlRequired).toBe("Да");
	});

	it("reads pilot and deployment channels from modelService array", () => {
		const ctx = resolveLegacyFormContext({
			generalInfo: {
				modelService: [
					{
						field_o_HRj6VO: true,
						field_jUm5syZf: ["Батч + Онлайн", "Онлайн"],
					},
				],
			},
		});
		expect(ctx.pilotModelRequired).toBe("Да");
		expect(ctx.deploymentChannels).toEqual(["Батч + Онлайн", "Онлайн"]);
	});

	it("counts sourceSystems for dataSourcesCount", () => {
		const ctx = resolveLegacyFormContext({
			detailInfo: {
				sourceSystems: [{ name: "A" }, { name: "B" }, { name: "" }],
			},
		});
		expect(ctx.dataSourcesCount).toBe(2);
	});

	it("reads uncertainty adjustment from field_QCwwo5c5", () => {
		const ctx = resolveLegacyFormContext({
			uncertaintyCalculation: {
				field_QCwwo5c5: 15,
				riskGroup: { sanctions: "Высокий" },
			},
		});
		expect(ctx.uncertaintyAdjustmentPercent).toBe(15);
	});

	it("derives readyPromReports from dataMart field_lovKvLZc", () => {
		const ctx = resolveLegacyFormContext({
			detailInfo: { dataMart: [{ field_lovKvLZc: true }] },
		});
		expect(ctx.readyPromReports).toBe("Да");
	});

	it("derives productionAdditionalReports from dataMart metricsCount", () => {
		const ctx = resolveLegacyFormContext({
			detailInfo: { dataMart: [{ metricsCount: 7 }] },
		});
		expect(ctx.productionAdditionalReports).toBe("7");
	});
});

describe("evaluateLegacyV2Summary snapshot sensitivity", () => {
	function stageScore(
		summary: ReturnType<typeof evaluateLegacyV2Summary>,
		stageName: string,
	): number | null {
		const row = summary.detailedCalculation.find((r) => r.stageName === stageName);
		return row?.complexityCoeff ?? null;
	}

	it("changes stage01 when complexity increases", () => {
		const low = evaluateLegacyV2Summary({
			generalInfo: { complexity: "1 — Низкая ×1.00" },
		});
		const high = evaluateLegacyV2Summary({
			generalInfo: { complexity: "4 — Высокая ×2.00" },
		});
		expect(stageScore(high, "01. Постановка задачи")).toBeGreaterThan(
			stageScore(low, "01. Постановка задачи") ?? 0,
		);
	});

	it("enables stage05A when pilot is required in modelService", () => {
		const without = evaluateLegacyV2Summary({ generalInfo: { modelService: {} } });
		const withPilot = evaluateLegacyV2Summary({
			generalInfo: { modelService: [{ field_o_HRj6VO: true }] },
		});
		expect(stageScore(without, "05A. Разработка MVP")).toBeNull();
		expect(stageScore(withPilot, "05A. Разработка MVP")).toBeGreaterThan(0);
	});

	it("changes stage05 with algorithmType from modelsList", () => {
		const tabular = evaluateLegacyV2Summary({
			detailInfo: { modelsList: [{ algorithmType: "Табличные данные" }] },
		});
		const cv = evaluateLegacyV2Summary({
			detailInfo: { modelsList: [{ algorithmType: "CV" }] },
		});
		expect(stageScore(cv, "05. Разработка модели")).toBeGreaterThan(
			stageScore(tabular, "05. Разработка модели") ?? 0,
		);
	});

	it("changes stage09 when deployment channels are set", () => {
		const none = evaluateLegacyV2Summary({ generalInfo: { modelService: {} } });
		const withChannels = evaluateLegacyV2Summary({
			generalInfo: {
				modelService: [{ field_jUm5syZf: ["Онлайн", "Батч + Онлайн"] }],
			},
		});
		expect(stageScore(none, "09. Адаптация и внедрение")).toBeNull();
		expect(stageScore(withChannels, "09. Адаптация и внедрение")).toBeGreaterThan(
			0,
		);
	});
});
