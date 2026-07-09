import {
	collectAtypicalWorkArrayPaths,
	patchV2AnketaCalculationLogicRules,
	setGroupActivationAtPath,
} from "@smart-anketa/api-contract";
import { V2_STAGE_DISPLAY_NAMES } from "../../../../src/modules/anketa-v2/constants/v2-stage-catalog";
import { evaluateLegacyV2Summary } from "../../../../src/modules/anketa-v2/services/v2-legacy-stage-evaluation";
import {
	createCalculationService,
	readNestedFormValue,
	setNestedFormValue,
	SNAPSHOT,
} from "./helpers/v2-calculation-test.helpers";

const service = createCalculationService();
const { jsonSchema, uiSchema, logic } = SNAPSHOT;

function evaluateSnapshot(formData: Record<string, unknown> = {}) {
	return service.evaluate(logic, formData, { jsonSchema, uiSchema });
}

function summaryOf(result: Awaited<ReturnType<typeof evaluateSnapshot>>) {
	return result.formData.summary as {
		typicalTotal?: number;
		atypicalTotal?: number;
		total?: number;
		baseScoreStream?: number;
		scoreWithComplexityCoeff?: number;
		deviationFromBaseline?: number;
		detailedCalculation: Array<{
			stageName: string;
			baseScore: number;
			complexityCoeff: number | null;
			disabled?: boolean;
		}>;
		platformStreams: Array<{
			streamName: string;
			baseTypicalScore: number;
			adjustedTypicalScore: number;
			atypicalScore: number;
		}>;
	};
}

describe("V2 calculation coverage — snapshot logic graph", () => {
	it("injects row_computed for every atypicalWork path in factory uiSchema", () => {
		const paths = collectAtypicalWorkArrayPaths(uiSchema);
		expect(paths.length).toBeGreaterThanOrEqual(7);
		const patched = patchV2AnketaCalculationLogicRules({ rules: [] }, { uiSchema });
		for (const path of paths) {
			const ruleId = `unified-atypical-row-total:${path.replace(/\./g, "_")}`;
			expect(patched.rules.some((rule) => rule.id === ruleId)).toBe(true);
		}
		expect(patched.rules.some((rule) => rule.id === "unified-atypical-total")).toBe(
			true,
		);
		expect(patched.rules.some((rule) => rule.id === "unified-source-typical-works")).toBe(
			true,
		);
	});

	it("returns calculation items for unified totals and legacy meta", async () => {
		const result = await evaluateSnapshot({
			detailInfo: {
				sourceSystems: [{ name: "CRM", type: "Внутренний" }],
				field_npwqpBHt: [
					{
						name: "task",
						estimateHoursPerDay: 2,
						coefficient: 3,
						includeInCalculation: true,
					},
				],
			},
		});
		expect(result.legacyStageEvaluation?.applied).toBe(true);
		expect(result.items.some((item) => item.ruleId === "unified-typical-total")).toBe(
			true,
		);
		expect(result.items.some((item) => item.ruleId === "unified-atypical-total")).toBe(
			true,
		);
		expect(result.items.some((item) => item.ruleId === "unified-grand-total")).toBe(
			true,
		);
	});

	it("reports computed dependency cycles without crashing", async () => {
		const result = await service.evaluate(
			{
				rules: [
					{
						id: "a",
						kind: "computed",
						targetPath: "/summary/a",
						dependencies: ["/summary/b"],
						condition: { var: "summary.b" },
					},
					{
						id: "b",
						kind: "computed",
						targetPath: "/summary/b",
						dependencies: ["/summary/a"],
						condition: { var: "summary.a" },
					},
				],
			},
			{},
		);
		expect(result.cycles.length).toBeGreaterThan(0);
	});
});

describe("V2 calculation coverage — typicalWork (sourceSystem → catalog → totals)", () => {
	it("computes per-row total on generated sourceTypicalTasks", async () => {
		const result = await evaluateSnapshot({
			detailInfo: {
				sourceSystems: [{ name: "CRM", type: "Внутренний" }],
			},
		});
		const tasks = (
			result.formData.streamDataSources as {
				sourceTypicalTasks: Array<{ total?: number; estimateHoursPerDay: number }>;
			}
		).sourceTypicalTasks;
		expect(tasks.length).toBeGreaterThan(0);
		for (const task of tasks) {
			expect(task.total).toBeGreaterThan(0);
			expect(task.total).toBe(task.estimateHoursPerDay);
		}
	});

	it("increases typicalTotal when a source system is added", async () => {
		const empty = await evaluateSnapshot({});
		const withSource = await evaluateSnapshot({
			detailInfo: { sourceSystems: [{ name: "CRM", type: "Внутренний" }] },
		});
		const emptyTotal = summaryOf(empty).typicalTotal ?? 0;
		const withSourceTotal = summaryOf(withSource).typicalTotal ?? 0;
		expect(withSourceTotal).toBeGreaterThan(emptyTotal);
	});

	it("feeds platform stream «Источники данных» from sourceTypicalTasks", async () => {
		const result = await evaluateSnapshot({
			detailInfo: { sourceSystems: [{ name: "CRM", type: "Внутренний" }] },
		});
		const summary = summaryOf(result);
		const sourceStream = summary.platformStreams.find(
			(s) => s.streamName === "Источники данных",
		);
		expect(sourceStream?.baseTypicalScore).toBeGreaterThan(0);
		expect(sourceStream?.adjustedTypicalScore).toBeGreaterThanOrEqual(
			sourceStream?.baseTypicalScore ?? 0,
		);
	});

	it("sums control typical tasks into unified typicalTotal when rows exist", async () => {
		const totalsOnlyGraph = {
			rules: logic.rules.filter((rule) =>
				[
					"default-row-source-typical-task-total",
					"unified-control-row-total",
					"unified-typical-total",
					"unified-grand-total",
				].includes(rule.id),
			),
		};
		const result = await service.evaluate(totalsOnlyGraph, {
			streamDataSources: {
				sourceTypicalTasks: [{ estimateHoursPerDay: 4, coefficient: 1 }],
			},
			streamModelControl: {
				"field_Khn6-HAW": [{ estimateHoursPerDay: 6, coefficient: 1 }],
			},
			summary: { atypicalTotal: 0 },
		});
		const summary = summaryOf(result);
		expect(summary.typicalTotal).toBe(10);
		expect(summary.total).toBe(10);
	});
});

describe("V2 calculation coverage — atypicalWork (all snapshot paths)", () => {
	const paths = collectAtypicalWorkArrayPaths(uiSchema);

	it.each(paths)("row total + atypicalTotal for %s", async (path) => {
		const row = {
			name: `atypical-${path}`,
			estimateHoursPerDay: 4,
			coefficient: 2.5,
			includeInCalculation: true,
		};
		const formData = setNestedFormValue({}, path, [row]);
		const result = await service.evaluate(
			patchV2AnketaCalculationLogicRules({ rules: [] }, { uiSchema }),
			formData,
			{ uiSchema },
		);
		const rows = readNestedFormValue(result.formData, path) as Array<{ total: number }>;
		expect(rows[0]?.total).toBe(10);
		expect(summaryOf(result).atypicalTotal).toBe(10);
	});

	it("excludes rows with includeInCalculation=false from atypicalTotal", async () => {
		const result = await evaluateSnapshot({
			detailInfo: {
				field_npwqpBHt: [
					{
						name: "included",
						estimateHoursPerDay: 2,
						coefficient: 2,
						includeInCalculation: true,
					},
					{
						name: "excluded",
						estimateHoursPerDay: 100,
						coefficient: 10,
						includeInCalculation: false,
					},
				],
			},
		});
		expect(summaryOf(result).atypicalTotal).toBe(4);
	});

	it("aggregates multiple atypical blocks into one atypicalTotal", async () => {
		const result = await evaluateSnapshot({
			detailInfo: {
				field_npwqpBHt: [
					{
						name: "a",
						estimateHoursPerDay: 1,
						coefficient: 2,
						includeInCalculation: true,
					},
				],
			},
			streamDataSources: {
				field_eCyDEFw3: [
					{
						name: "b",
						estimateHoursPerDay: 3,
						coefficient: 2,
						includeInCalculation: true,
					},
				],
			},
		});
		expect(summaryOf(result).atypicalTotal).toBe(8);
		expect(summaryOf(result).total).toBe(8);
	});
});

describe("V2 calculation coverage — legacy E2E stages", () => {
	const allStageNames = [
		...Object.values(V2_STAGE_DISPLAY_NAMES),
		"Итого",
		"ИС/Сервисы/Интеграции",
		"Нетиповые задачи",
	];

	it("always returns full detailedCalculation table from factory snapshot", async () => {
		const summary = summaryOf(await evaluateSnapshot({}));
		expect(summary.detailedCalculation.map((r) => r.stageName)).toEqual(
			allStageNames,
		);
		expect(summary.platformStreams).toHaveLength(3);
		expect(summary.baseScoreStream).toBeGreaterThan(0);
		expect(summary.scoreWithComplexityCoeff).toBeGreaterThan(0);
	});

	it("stage01 reacts to regulatory complexity", () => {
		const low = evaluateLegacyV2Summary({
			generalInfo: { complexity: "1 — Низкая ×1.00" },
		});
		const high = evaluateLegacyV2Summary({
			generalInfo: { complexity: "5 — Максимальная ×2.50" },
		});
		const lowRow = low.detailedCalculation.find(
			(r) => r.stageName === "01. Постановка задачи",
		);
		const highRow = high.detailedCalculation.find(
			(r) => r.stageName === "01. Постановка задачи",
		);
		expect(highRow?.complexityCoeff).toBeGreaterThan(lowRow?.complexityCoeff ?? 0);
	});

	it("stage02 reacts to sourceSystems count", () => {
		const one = evaluateLegacyV2Summary({
			detailInfo: { sourceSystems: [{ name: "A" }] },
		});
		const three = evaluateLegacyV2Summary({
			detailInfo: {
				sourceSystems: [{ name: "A" }, { name: "B" }, { name: "C" }],
			},
		});
		const oneScore = one.detailedCalculation.find(
			(r) => r.stageName === "02. Поиск данных",
		)?.complexityCoeff;
		const threeScore = three.detailedCalculation.find(
			(r) => r.stageName === "02. Поиск данных",
		)?.complexityCoeff;
		expect(threeScore).toBeGreaterThan(oneScore ?? 0);
	});

	it("AML stages activate when any model has autoML", () => {
		const off = evaluateLegacyV2Summary({});
		const on = evaluateLegacyV2Summary({
			detailInfo: { modelsList: [{ algorithmType: "NLP", autoML: true }] },
		});
		expect(
			off.detailedCalculation.find((r) => r.stageName === "AML разработка")
				?.complexityCoeff,
		).toBeNull();
		expect(
			on.detailedCalculation.find((r) => r.stageName === "AML разработка")
				?.complexityCoeff,
		).toBeGreaterThan(0);
	});

	it("integration row reacts to createIS/createService booleans", () => {
		const off = evaluateLegacyV2Summary({ generalInfo: {} });
		const isOn = evaluateLegacyV2Summary({ generalInfo: { createIS: true } });
		const serviceOn = evaluateLegacyV2Summary({
			generalInfo: { createService: true },
		});
		const offRow = off.detailedCalculation.find(
			(r) => r.stageName === "ИС/Сервисы/Интеграции",
		);
		const isRow = isOn.detailedCalculation.find(
			(r) => r.stageName === "ИС/Сервисы/Интеграции",
		);
		const serviceRow = serviceOn.detailedCalculation.find(
			(r) => r.stageName === "ИС/Сервисы/Интеграции",
		);
		expect(offRow?.complexityCoeff).toBeNull();
		expect(isRow?.complexityCoeff).toBeGreaterThan(0);
		expect(serviceRow?.complexityCoeff).toBeGreaterThan(0);
	});

	it("uncertainty risk group increases scoreWithComplexityCoeff", () => {
		const low = evaluateLegacyV2Summary({
			uncertaintyCalculation: { riskGroup: { sanctions: "Низкий" } },
		});
		const high = evaluateLegacyV2Summary({
			uncertaintyCalculation: {
				field_QCwwo5c5: 20,
				riskGroup: { sanctions: "Высокий", staffShortage: "Высокий" },
			},
		});
		expect(high.scoreWithComplexityCoeff).toBeGreaterThan(
			low.scoreWithComplexityCoeff,
		);
	});

	it("stage07 reacts to dataMart metricsCount via productionAdditionalReports", () => {
		const low = evaluateLegacyV2Summary({});
		const high = evaluateLegacyV2Summary({
			detailInfo: { dataMart: [{ metricsCount: 5 }] },
		});
		const lowScore = low.detailedCalculation.find(
			(r) => r.stageName === "07. Разработка витрины для применения модели",
		)?.complexityCoeff;
		const highScore = high.detailedCalculation.find(
			(r) => r.stageName === "07. Разработка витрины для применения модели",
		)?.complexityCoeff;
		expect(highScore).toBeGreaterThan(lowScore ?? 0);
	});
});

describe("V2 calculation coverage — rule kinds & guards", () => {
	it("task_trigger pilot rules report passes=false when pilotNeed is absent", async () => {
		const result = await evaluateSnapshot({});
		const pilotTriggers = result.taskTriggers.filter(
			(t) => t.taskCode === "PILOT_SUPPORT",
		);
		expect(pilotTriggers.length).toBeGreaterThan(0);
		expect(pilotTriggers.every((t) => t.passes === false)).toBe(true);
	});

	it("skips row_computed under inactive activatable stream groups", async () => {
		const inactive = setGroupActivationAtPath(
			{
				streamDigitalAgents: {
					field_r8nz3JWH: [{ estimateHoursPerDay: 2, coefficient: 2 }],
				},
			},
			"streamDigitalAgents",
			false,
		);
		const result = await service.evaluate(logic, inactive, { jsonSchema, uiSchema });
		const rows = (
			result.formData.streamDigitalAgents as {
				field_r8nz3JWH: Array<{ total?: number }>;
			}
		).field_r8nz3JWH;
		expect(rows[0]?.total).toBeUndefined();
	});

	it("full snapshot end-to-end: typical + atypical + legacy headline metrics", async () => {
		const result = await evaluateSnapshot({
			generalInfo: {
				complexity: "3 — Повышенная ×1.50",
				createIS: true,
				modelService: [
					{
						field_o_HRj6VO: true,
						field_jUm5syZf: ["Онлайн"],
					},
				],
			},
			detailInfo: {
				sourceSystems: [{ name: "src", type: "Внутренний" }],
				modelsList: [{ algorithmType: "NLP", autoML: false }],
				field_npwqpBHt: [
					{
						name: "custom",
						estimateHoursPerDay: 5,
						coefficient: 2,
						includeInCalculation: true,
					},
				],
			},
			uncertaintyCalculation: {
				field_QCwwo5c5: 5,
				riskGroup: { sanctions: "Средний" },
			},
		});
		const summary = summaryOf(result);
		expect(summary.typicalTotal).toBeGreaterThan(0);
		expect(summary.atypicalTotal).toBe(10);
		expect(summary.total).toBe((summary.typicalTotal ?? 0) + 10);
		expect(summary.scoreWithComplexityCoeff).toBeGreaterThan(summary.total ?? 0);
		expect(summary.deviationFromBaseline).not.toBeNull();
	});
});

describe("V2 calculation coverage — form number coercion", () => {
	it("accepts x/× multiplier strings in atypical row_computed", async () => {
		const result = await evaluateSnapshot({
			detailInfo: {
				field_npwqpBHt: [
					{
						name: "mul",
						estimateHoursPerDay: "8",
						coefficient: "x2.5",
						includeInCalculation: true,
					},
				],
			},
		});
		const rows = (
			result.formData.detailInfo as { field_npwqpBHt: Array<{ total: number }> }
		).field_npwqpBHt;
		expect(rows[0]?.total).toBe(20);
	});
});

describe("V2 calculation coverage — migration & validation", () => {
	it("migrates detailInfo.dataMart before legacy stage07 uses metricsCount", async () => {
		const result = await evaluateSnapshot({
			detailInfo: {
				dataMart: [{ metricsCount: 4, field_lovKvLZc: true }],
			},
		});
		const stage07 = summaryOf(result).detailedCalculation.find(
			(r) => r.stageName === "07. Разработка витрины для применения модели",
		);
		expect(stage07?.complexityCoeff).toBeGreaterThan(0);
		const smc = result.formData.streamModelControl as { dataObjects?: unknown };
		expect(smc.dataObjects).toBeDefined();
	});

	it("returns no validationIssues when validation rule passes", async () => {
		const result = await service.evaluate(
			{
				rules: [
					{
						id: "ok",
						kind: "validation",
						targetPath: "/detailInfo/parameters/algorithmType",
						dependencies: [],
						condition: {
							"==": [{ var: "detailInfo.parameters.algorithmType" }, "NLP"],
						},
						payload: { message: "Должен быть NLP" },
					},
				],
			},
			{ detailInfo: { parameters: { algorithmType: "NLP" } } },
		);
		expect(result.validationIssues).toHaveLength(0);
	});

	it("differentiates internal vs external source catalog streams", async () => {
		const internal = await evaluateSnapshot({
			detailInfo: { sourceSystems: [{ name: "int", type: "Внутренний" }] },
		});
		const external = await evaluateSnapshot({
			detailInfo: { sourceSystems: [{ name: "ext", type: "Внешний" }] },
		});
		const intTasks = (
			internal.formData.streamDataSources as {
				sourceTypicalTasks: Array<{ reason: string }>;
			}
		).sourceTypicalTasks;
		const extTasks = (
			external.formData.streamDataSources as {
				sourceTypicalTasks: Array<{ reason: string }>;
			}
		).sourceTypicalTasks;
		expect(intTasks.some((t) => !t.reason.includes("214"))).toBe(true);
		expect(extTasks.some((t) => t.reason.includes("214"))).toBe(true);
	});
});
