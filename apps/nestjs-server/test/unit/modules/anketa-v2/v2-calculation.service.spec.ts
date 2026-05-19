import { V2_DEFAULT_LOGIC_GRAPH } from "../../../../src/modules/anketa-v2/constants/v2-default-logic";
import { V2CalculationService } from "../../../../src/modules/anketa-v2/services/v2-calculation.service";
import {
	applyJsonLogic,
	isJsonLogicTruthy,
} from "../../../../src/modules/anketa-v2/services/v2-json-logic";

describe("V2CalculationService", () => {
	const service = new V2CalculationService(null as never, null as never);

	it("applies row_computed totals on typicalTasks rows", () => {
		const result = service.evaluate(V2_DEFAULT_LOGIC_GRAPH, {
			mlPlatform: {
				typicalTasks: [
					{ estimateHoursPerDay: 2, coefficient: 1.5 },
					{ estimateHoursPerDay: 1, coefficient: 2 },
				],
			},
		});

		const tasks = (
			result.formData.mlPlatform as {
				typicalTasks: Array<{ total: number }>;
			}
		).typicalTasks;

		expect(tasks[0]?.total).toBe(3);
		expect(tasks[1]?.total).toBe(2);
	});

	it("sums baseScoreStream from row totals (typical_total)", () => {
		const result = service.evaluate(V2_DEFAULT_LOGIC_GRAPH, {
			mlPlatform: {
				typicalTasks: [
					{ estimateHoursPerDay: 2, coefficient: 1.5, total: 3 },
					{ estimateHoursPerDay: 1, coefficient: 2, total: 2 },
				],
			},
		});

		const base = result.items.find((i) => i.role === "typical_total");
		expect(base?.value).toBe(5);
		// summary.baseScoreStream — legacy E2E (сумма баз этапов), не Σ typicalTasks
		expect(
			(result.formData.summary as { baseScoreStream: number }).baseScoreStream,
		).toBeGreaterThan(0);
	});

	it("maps algorithmType to algorithmCoeffValue (NLP → 1.25)", () => {
		const result = service.evaluate(V2_DEFAULT_LOGIC_GRAPH, {
			detailInfo: { parameters: { algorithmType: "NLP" } },
		});

		expect(result.formData.detailInfo).toMatchObject({
			parameters: { algorithmCoeffValue: 1.25 },
		});
	});

	it("evaluates task_trigger when pilotNeed is required", () => {
		const result = service.evaluate(V2_DEFAULT_LOGIC_GRAPH, {
			generalInfo: { pilotNeed: "Требуется" },
		});

		const trigger = result.taskTriggers.find(
			(t) => t.taskCode === "PILOT_SUPPORT",
		);
		expect(trigger?.passes).toBe(true);
	});

	it("fills legacy summary with 11 E2E stages in detailedCalculation", () => {
		const result = service.evaluate(V2_DEFAULT_LOGIC_GRAPH, {
			detailInfo: {
				parameters: { modelsCount: 1, algorithmType: "NLP" },
			},
			generalInfo: { complexity: "1 — Низкая ×1.00" },
		});

		const summary = result.formData.summary as {
			detailedCalculation: Array<{ stageName: string }>;
			platformStreams: unknown[];
			deviationFromBaseline: number;
		};

		expect(summary.detailedCalculation.length).toBeGreaterThanOrEqual(13);
		expect(
			summary.detailedCalculation.some((r) =>
				r.stageName.includes("01. Постановка"),
			),
		).toBe(true);
		expect(summary.platformStreams).toHaveLength(3);
		expect(typeof summary.deviationFromBaseline).toBe("number");
	});

	it("does not fire task_trigger when pilotNeed is empty", () => {
		const result = service.evaluate(V2_DEFAULT_LOGIC_GRAPH, {
			generalInfo: { pilotNeed: "" },
		});

		const trigger = result.taskTriggers.find(
			(t) => t.taskCode === "PILOT_SUPPORT",
		);
		expect(trigger?.passes).toBe(false);
	});
});

describe("v2-json-logic", () => {
	it("isJsonLogicTruthy matches common json-logic truthiness", () => {
		expect(isJsonLogicTruthy(true)).toBe(true);
		expect(isJsonLogicTruthy(1)).toBe(true);
		expect(isJsonLogicTruthy("x")).toBe(true);
		expect(isJsonLogicTruthy(false)).toBe(false);
		expect(isJsonLogicTruthy(0)).toBe(false);
		expect(isJsonLogicTruthy("")).toBe(false);
		expect(isJsonLogicTruthy("0")).toBe(false);
	});

	it("evaluates reduce sum used in default logic", () => {
		const sum = applyJsonLogic(
			{
				reduce: [
					{
						var: "mlPlatform.typicalTasks",
					},
					{
						"+": [{ var: "accumulator" }, { max: [0, { var: "current.total" }] }],
					},
					0,
				],
			},
			{
				mlPlatform: {
					typicalTasks: [{ total: 3 }, { total: 2 }],
				},
			},
		);
		expect(sum).toBe(5);
	});
});
