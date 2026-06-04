import { V2_DEFAULT_LOGIC_GRAPH } from "../../../../src/modules/anketa-v2/constants/v2-default-logic";
import { V2CalculationService } from "../../../../src/modules/anketa-v2/services/v2-calculation.service";
import {
	applyJsonLogic,
	isJsonLogicTruthy,
} from "../../../../src/modules/anketa-v2/services/v2-json-logic";

describe("V2CalculationService", () => {
	const service = new V2CalculationService(null as never, null as never);

	it("applies row_computed totals on atypicalTasks rows", () => {
		const result = service.evaluate(V2_DEFAULT_LOGIC_GRAPH, {
			streamModelControl: {
				atypicalTasks: [
					{ estimateHoursPerDay: 2, coefficient: 1.5 },
					{ estimateHoursPerDay: 1, coefficient: 2 },
				],
			},
		});

		const tasks = (
			result.formData.streamModelControl as {
				atypicalTasks: Array<{ total: number }>;
			}
		).atypicalTasks;

		expect(tasks[0]?.total).toBe(3);
		expect(tasks[1]?.total).toBe(2);
	});

	it("computes unified Total = typicalTotal + atypicalTotal (ФТ-026)", () => {
		const summaryOnlyGraph = {
			rules: V2_DEFAULT_LOGIC_GRAPH.rules.filter((r) =>
				["unified-typical-total", "unified-atypical-total", "unified-grand-total"].includes(
					r.id,
				),
			),
		};
		const result = service.evaluate(summaryOnlyGraph, {
			streamDataSources: {
				sourceTypicalTasks: [{ total: 3 }],
				atypicalTasks: [{ total: 8, includeInCalculation: true }],
			},
			streamModelControl: {
				control: { controlTypicalTasks: [] },
				atypicalTasks: [{ total: 5, includeInCalculation: false }],
			},
		});

		const summary = result.formData.summary as {
			typicalTotal: number;
			atypicalTotal: number;
			total: number;
		};
		expect(summary.typicalTotal).toBe(3);
		expect(summary.atypicalTotal).toBe(8);
		expect(summary.total).toBe(11);
		expect(result.legacyStageEvaluation?.applied).toBe(true);
		expect(
			(result.formData.summary as { detailedCalculation?: unknown[] })
				.detailedCalculation?.length,
		).toBeGreaterThan(0);
	});

	it("generates internal source typical works from catalog with real norms", () => {
		const result = service.evaluate(V2_DEFAULT_LOGIC_GRAPH, {
			streamDataSources: {
				sourceSystems: [{ name: "CRM Retail", type: "Внутренний" }],
			},
		});

		const streamDataSources = result.formData.streamDataSources as {
			sourceTypicalTasks: Array<{ name: string; total: number; coefficient: number }>;
		};

		expect(streamDataSources.sourceTypicalTasks.length).toBeGreaterThan(0);
		expect(
			streamDataSources.sourceTypicalTasks.every((t) => t.coefficient === 1),
		).toBe(true);
		expect(
			streamDataSources.sourceTypicalTasks.some((t) =>
				t.name.includes("Анализ Данных"),
			),
		).toBe(true);
		expect(streamDataSources.sourceTypicalTasks.some((t) => t.total === 3)).toBe(true);
	});

	it("migrates detailInfo.sourceSystems before source typical works generation", () => {
		const result = service.evaluate(V2_DEFAULT_LOGIC_GRAPH, {
			detailInfo: {
				sourceSystems: [{ name: "CRM Retail", type: "Внутренний" }],
			},
		});

		const streamDataSources = result.formData.streamDataSources as {
			sourceTypicalTasks: Array<{ name: string }>;
		};
		expect(streamDataSources.sourceTypicalTasks.length).toBeGreaterThan(0);
	});

	it("applies multiplicative group coefficient from dictionary weights (ФТ-024)", () => {
		const result = service.evaluate(V2_DEFAULT_LOGIC_GRAPH, {
			streamDataSources: {
				sourceSystems: [
					{
						name: "Внешний банк",
						type: "Внутренний",
						domainComplexity: "Высокая",
						entityVolume: "Большое",
					},
				],
			},
		});

		const streamDataSources = result.formData.streamDataSources as {
			sourceTypicalTasks: Array<{ name: string; total: number; coefficient: number }>;
		};
		// Высокая ×1.5 × Большое ×1.25 = 1.875
		expect(streamDataSources.sourceTypicalTasks[0]?.coefficient).toBeCloseTo(1.875);
		const analysis = streamDataSources.sourceTypicalTasks.find((t) =>
			t.name.includes("Анализ Данных"),
		);
		// норматив 3 × 1.875 = 5.625
		expect(analysis?.total).toBeCloseTo(5.625);
	});

	it("generates external source works (stage 214+) for external type", () => {
		const result = service.evaluate(V2_DEFAULT_LOGIC_GRAPH, {
			streamDataSources: {
				sourceSystems: [{ name: "Внешний поставщик", type: "Внешний" }],
			},
		});
		const streamDataSources = result.formData.streamDataSources as {
			sourceTypicalTasks: Array<{ reason: string }>;
		};
		expect(streamDataSources.sourceTypicalTasks.length).toBeGreaterThan(0);
		expect(
			streamDataSources.sourceTypicalTasks.some((t) => t.reason.includes("214")),
		).toBe(true);
	});

	it("generates control-model works from selected control types", () => {
		const result = service.evaluate(V2_DEFAULT_LOGIC_GRAPH, {
			streamModelControl: {
				control: {
					modelClass: "Розничные бизнес-модели",
					controlTypes: ["КД", "ОК"],
				},
			},
		});
		const control = (
			result.formData.streamModelControl as {
				control: { controlTypicalTasks: Array<{ name: string }> };
			}
		).control;
		expect(control.controlTypicalTasks).toHaveLength(2);
		expect(
			control.controlTypicalTasks.some((t) => t.name.includes("[КД]")),
		).toBe(true);
		expect(
			control.controlTypicalTasks.some((t) => t.name.includes("[ОК]")),
		).toBe(true);
	});

	it("returns validationIssues when validation rule condition is false", () => {
		const result = service.evaluate(
			{
				rules: [
					{
						id: "v1",
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
			{ detailInfo: { parameters: { algorithmType: "CV" } } },
		);

		expect(result.validationIssues).toHaveLength(1);
		expect(result.validationIssues[0]?.message).toBe("Должен быть NLP");
		expect(result.validationIssues[0]?.path).toBe(
			"/detailInfo/parameters/algorithmType",
		);
	});

	it("skips validation on fields hidden by visibility", () => {
		const result = service.evaluate(
			{
				rules: [
					{
						id: "hide",
						kind: "visibility",
						targetPath: "/detailInfo/parameters/algorithmType",
						dependencies: [],
						condition: false,
					},
					{
						id: "v1",
						kind: "validation",
						targetPath: "/detailInfo/parameters/algorithmType",
						dependencies: [],
						condition: false,
						payload: { message: "Ошибка" },
					},
				],
			},
			{ detailInfo: { parameters: { algorithmType: "CV" } } },
		);

		expect(result.validationIssues).toHaveLength(0);
	});

	it("runs legacy v1 stage engine for non-unified graphs (back-compat)", () => {
		// Граф без флага calcModel: "unified" → legacy v1-движок этапов работает.
		const result = service.evaluate(
			{ rules: [] },
			{
				detailInfo: { parameters: { modelsCount: 1, algorithmType: "NLP" } },
				generalInfo: { complexity: "1 — Низкая ×1.00" },
				streamMlPlatform: {
					typicalTasks: [{ estimateHoursPerDay: 1, coefficient: 1 }],
				},
			},
		);

		const summary = result.formData.summary as {
			detailedCalculation: Array<{ stageName: string }>;
			platformStreams: unknown[];
		};
		expect(result.legacyStageEvaluation?.applied).toBe(true);
		expect(result.legacyStageEvaluation?.source).toBe("v1_stages");
		expect(summary.detailedCalculation.length).toBeGreaterThan(0);
		expect(summary.platformStreams).toHaveLength(3);
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
					{ var: "streamDataSources.sourceTypicalTasks" },
					{
						"+": [{ var: "accumulator" }, { max: [0, { var: "current.total" }] }],
					},
					0,
				],
			},
			{
				streamDataSources: {
					sourceTypicalTasks: [{ total: 3 }, { total: 2 }],
				},
			},
		);
		expect(sum).toBe(5);
	});
});
