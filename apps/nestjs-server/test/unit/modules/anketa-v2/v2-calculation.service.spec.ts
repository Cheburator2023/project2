import { setGroupActivationAtPath } from "@smart-anketa/api-contract";
import {
	CONTROL_TYPICAL_TASKS,
	SOURCE_TYPICAL_TASKS,
} from "../../../../src/modules/anketa-v2/constants/v2-source-works.builder";
import { V2_DEFAULT_TEMPLATE_SNAPSHOT } from "../../../../src/modules/anketa-v2/constants/v2-default-template-snapshot";
import { V2CalculationService } from "../../../../src/modules/anketa-v2/services/v2-calculation.service";
import type {
	BuildCatalogTasksParams,
	V2TypicalWorkRuntimeService,
} from "../../../../src/modules/anketa-v2/services/v2-typical-work-runtime.service";
import {
	applyJsonLogic,
	isJsonLogicTruthy,
} from "../../../../src/modules/anketa-v2/services/v2-json-logic";

/** Имитация справочника БД для unit-тестов без PostgreSQL. */
function createStubWorkRuntime(): V2TypicalWorkRuntimeService {
	return {
		buildCatalogTasks: async (params: BuildCatalogTasksParams) => {
			if (params.archComponentType === "Система-источник") {
				const type = String(params.source.type ?? "");
				return SOURCE_TYPICAL_TASKS.filter(
					(t) => !type || t.match.type === type,
				).map((t) => ({
					taskCode: t.taskCode,
					name: t.name,
					workType: t.workType,
					reason: t.reason,
					estimateHoursPerDay: t.estimateHoursPerDay,
					coefficient: 1,
					match: t.match,
					workId: t.taskCode,
				}));
			}
			if (params.archComponentType === "Модельный сервис") {
				const label = String(
					params.source.value ?? params.source.controlType ?? "",
				);
				return CONTROL_TYPICAL_TASKS.filter((t) => {
					const code = String(t.match.controlType ?? "");
					return (
						label.includes(`[${code}]`) ||
						label === code ||
						label.includes(code)
					);
				}).map((t) => ({
					taskCode: t.taskCode,
					name: t.name,
					workType: t.workType,
					reason: t.reason,
					estimateHoursPerDay: t.estimateHoursPerDay,
					coefficient: 1,
					match: t.match,
					workId: t.taskCode,
				}));
			}
			return [];
		},
		buildSourceCatalogTasks: async (source, templateVersionId, atDate) => {
			const type = String(source.type ?? "");
			const stream =
				type === "Внешний" ? "ИД. Внешний" : "ИД. Внутренний";
			return createStubWorkRuntime().buildCatalogTasks({
				archComponentType: "Система-источник",
				streamExecutor: stream,
				source,
				templateVersionId,
				atDate,
			});
		},
	} as unknown as V2TypicalWorkRuntimeService;
}

describe("V2CalculationService", () => {
	const service = new V2CalculationService(
		null as never,
		null as never,
		createStubWorkRuntime(),
	);

	it("applies row_computed totals on atypicalTasks rows", async () => {
		const result = await service.evaluate(
			{
				rules: [
					{
						id: "row-atypical-total",
						kind: "row_computed",
						targetPath: "/streamModelControl/atypicalTasks",
						dependencies: [],
						condition: {
							"*": [{ var: "estimateHoursPerDay" }, { var: "coefficient" }],
						},
						payload: {
							fieldVar: "total",
							arrayPath: "streamModelControl.atypicalTasks",
						},
					},
				],
			},
			{
				streamModelControl: {
					atypicalTasks: [
						{ estimateHoursPerDay: 2, coefficient: 1.5 },
						{ estimateHoursPerDay: 1, coefficient: 2 },
					],
				},
			},
		);

		const tasks = (
			result.formData.streamModelControl as {
				atypicalTasks: Array<{ total: number }>;
			}
		).atypicalTasks;

		expect(tasks[0]?.total).toBe(3);
		expect(tasks[1]?.total).toBe(2);
	});

	it("skips rules under inactive activatable groups", async () => {
		const inactive = setGroupActivationAtPath(
			{
				streamModelControl: {
					atypicalTasks: [{ estimateHoursPerDay: 2, coefficient: 1.5 }],
				},
			},
			"streamModelControl",
			false,
		);
		const result = await service.evaluate(
			{
				rules: [
					{
						id: "row-atypical-total",
						kind: "row_computed",
						targetPath: "/streamModelControl/atypicalTasks",
						dependencies: [],
						condition: {
							"*": [{ var: "estimateHoursPerDay" }, { var: "coefficient" }],
						},
						payload: {
							fieldVar: "total",
							arrayPath: "streamModelControl.atypicalTasks",
						},
					},
				],
			},
			inactive,
		);
		const tasks = (
			result.formData.streamModelControl as {
				atypicalTasks: Array<{ total?: number }>;
			}
		).atypicalTasks;
		expect(tasks[0]?.total).toBeUndefined();
	});

	it("computes unified Total = typicalTotal + atypicalTotal (ФТ-026)", async () => {
		const summaryOnlyGraph = {
			rules: V2_DEFAULT_TEMPLATE_SNAPSHOT.logic.rules.filter((r) =>
				["unified-typical-total", "unified-grand-total"].includes(r.id),
			),
		};
		const result = await service.evaluate(summaryOnlyGraph, {
			streamDataSources: {
				sourceTypicalTasks: [{ total: 3 }],
			},
			detailInfo: { detailTypicalTasks: [] },
			streamModelControl: {
				control: { controlTypicalTasks: [] },
			},
			summary: { atypicalTotal: 8 },
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

	it("generates internal source typical works from factory default logic", async () => {
		const result = await service.evaluate(V2_DEFAULT_TEMPLATE_SNAPSHOT.logic, {
			streamDataSources: {
				sourceSystems: [{ name: "CRM Retail", type: "Внутренний" }],
			},
		});

		const streamDataSources = result.formData.streamDataSources as {
			sourceTypicalTasks: Array<{
				name: string;
				estimateHoursPerDay: number;
				coefficient: number;
			}>;
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
		expect(
			streamDataSources.sourceTypicalTasks.some(
				(t) => t.estimateHoursPerDay === 3,
			),
		).toBe(true);
	});

	it("migrates detailInfo.sourceSystems before source typical works generation", async () => {
		const result = await service.evaluate(V2_DEFAULT_TEMPLATE_SNAPSHOT.logic, {
			detailInfo: {
				sourceSystems: [{ name: "CRM Retail", type: "Внутренний" }],
			},
		});

		const streamDataSources = result.formData.streamDataSources as {
			sourceTypicalTasks: Array<{ name: string }>;
		};
		expect(streamDataSources.sourceTypicalTasks.length).toBeGreaterThan(0);
	});

	it("uses stream localParams for coefficient when source row has no weights (ФТ-024)", async () => {
		const result = await service.evaluate(V2_DEFAULT_TEMPLATE_SNAPSHOT.logic, {
			streamDataSources: {
				localParams: {
					domainComplexity: "Высокая",
					entityVolume: "Большое",
				},
				sourceSystems: [{ name: "CRM", type: "Внутренний" }],
			},
		});
		const streamDataSources = result.formData.streamDataSources as {
			sourceTypicalTasks: Array<{ coefficient: number }>;
		};
		expect(streamDataSources.sourceTypicalTasks[0]?.coefficient).toBeCloseTo(1.875);
	});

	it("applies multiplicative group coefficient from dictionary weights (ФТ-024)", async () => {
		const result = await service.evaluate(V2_DEFAULT_TEMPLATE_SNAPSHOT.logic, {
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
			sourceTypicalTasks: Array<{ name: string; coefficient: number }>;
		};
		expect(streamDataSources.sourceTypicalTasks[0]?.coefficient).toBeCloseTo(1.875);
		const analysis = streamDataSources.sourceTypicalTasks.find((t) =>
			t.name.includes("Анализ Данных"),
		);
		expect(analysis?.coefficient).toBeCloseTo(1.875);
	});

	it("generates external source works (stage 214+) for external type", async () => {
		const result = await service.evaluate(V2_DEFAULT_TEMPLATE_SNAPSHOT.logic, {
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

	it("generates control-model works from selected control types", async () => {
		const result = await service.evaluate(V2_DEFAULT_TEMPLATE_SNAPSHOT.logic, {
			streamModelControl: {
				control: {
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

	it("returns validationIssues when validation rule condition is false", async () => {
		const result = await service.evaluate(
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

	it("skips validation on fields hidden by visibility", async () => {
		const result = await service.evaluate(
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

	it("runs legacy v1 stage engine for non-unified graphs (back-compat)", async () => {
		const result = await service.evaluate(
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
