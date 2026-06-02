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

	it("computes unified Total = typicalTotal + atypicalTotal (ФТ-026)", () => {
		const result = service.evaluate(V2_DEFAULT_LOGIC_GRAPH, {
			mlPlatform: {
				typicalTasks: [{ estimateHoursPerDay: 2, coefficient: 1.5, total: 3 }],
			},
			atypicalTasks: [
				{ estimateHoursPerDay: 4, coefficient: 2, total: 8, includeInCalculation: true },
				{ estimateHoursPerDay: 5, coefficient: 1, total: 5, includeInCalculation: false },
			],
		});

		const summary = result.formData.summary as {
			typicalTotal: number;
			atypicalTotal: number;
			total: number;
		};
		expect(summary.typicalTotal).toBe(3);
		expect(summary.atypicalTotal).toBe(8);
		expect(summary.total).toBe(11);
		// единый расчёт → legacy v1-движок не запускается
		expect(result.legacyStageEvaluation).toBeNull();
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

	it("generates internal source typical works from catalog with real norms", () => {
		const result = service.evaluate(V2_DEFAULT_LOGIC_GRAPH, {
			detailInfo: {
				sourceSystems: [{ name: "CRM Retail", type: "Внутренний" }],
			},
		});

		const detailInfo = result.formData.detailInfo as {
			sourceTypicalTasks: Array<{ name: string; total: number; coefficient: number }>;
		};

		expect(detailInfo.sourceTypicalTasks.length).toBeGreaterThan(0);
		// норматив берётся из работы.csv; без весов параметров коэф. группы = 1
		expect(
			detailInfo.sourceTypicalTasks.every((t) => t.coefficient === 1),
		).toBe(true);
		expect(
			detailInfo.sourceTypicalTasks.some((t) =>
				t.name.includes("Анализ Данных"),
			),
		).toBe(true);
		// «Анализ Данных, Связок, Проверка качества» норматив = 3 ч/д
		expect(detailInfo.sourceTypicalTasks.some((t) => t.total === 3)).toBe(true);
	});

	it("applies multiplicative group coefficient from dictionary weights (ФТ-024)", () => {
		const result = service.evaluate(V2_DEFAULT_LOGIC_GRAPH, {
			detailInfo: {
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

		const detailInfo = result.formData.detailInfo as {
			sourceTypicalTasks: Array<{ name: string; total: number; coefficient: number }>;
		};
		// Высокая ×1.5 × Большое ×1.25 = 1.875
		expect(detailInfo.sourceTypicalTasks[0]?.coefficient).toBeCloseTo(1.875);
		const analysis = detailInfo.sourceTypicalTasks.find((t) =>
			t.name.includes("Анализ Данных"),
		);
		// норматив 3 × 1.875 = 5.625
		expect(analysis?.total).toBeCloseTo(5.625);
	});

	it("generates external source works (stage 214+) for external type", () => {
		const result = service.evaluate(V2_DEFAULT_LOGIC_GRAPH, {
			detailInfo: {
				sourceSystems: [{ name: "Внешний поставщик", type: "Внешний" }],
			},
		});
		const detailInfo = result.formData.detailInfo as {
			sourceTypicalTasks: Array<{ reason: string }>;
		};
		expect(detailInfo.sourceTypicalTasks.length).toBeGreaterThan(0);
		expect(
			detailInfo.sourceTypicalTasks.some((t) => t.reason.includes("214")),
		).toBe(true);
	});

	it("generates control-model works from selected control types", () => {
		const result = service.evaluate(V2_DEFAULT_LOGIC_GRAPH, {
			modelControl: { modelClass: "Розничные бизнес-модели", controlTypes: ["КД", "ОК"] },
		});
		const control = result.formData.modelControl as {
			controlTypicalTasks: Array<{ name: string }>;
		};
		expect(control.controlTypicalTasks).toHaveLength(2);
		expect(
			control.controlTypicalTasks.some((t) => t.name.includes("[КД]")),
		).toBe(true);
		expect(
			control.controlTypicalTasks.some((t) => t.name.includes("[ОК]")),
		).toBe(true);
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
				mlPlatform: { typicalTasks: [{ estimateHoursPerDay: 1, coefficient: 1 }] },
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
					{ var: "mlPlatform.typicalTasks" },
					{
						"+": [{ var: "accumulator" }, { max: [0, { var: "current.total" }] }],
					},
					0,
				],
			},
			{ mlPlatform: { typicalTasks: [{ total: 3 }, { total: 2 }] } },
		);
		expect(sum).toBe(5);
	});
});
