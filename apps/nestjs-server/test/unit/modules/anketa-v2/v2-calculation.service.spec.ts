import { setGroupActivationAtPath, patchV2AnketaCalculationLogicRules } from "@smart-anketa/api-contract";
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
				"field_Khn6-HAW": [],
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
			detailInfo: {
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

	it("auto-injects catalog logic for new schema with source infrastructure", async () => {
		const result = await service.evaluate(
			patchV2AnketaCalculationLogicRules({ rules: [] }, {
				jsonSchema: V2_DEFAULT_TEMPLATE_SNAPSHOT.jsonSchema,
				uiSchema: V2_DEFAULT_TEMPLATE_SNAPSHOT.uiSchema,
			}),
			{
				detailInfo: {
					sourceSystems: [{ name: "CRM Retail", type: "Внутренний" }],
				},
			},
		);

		const streamDataSources = result.formData.streamDataSources as {
			sourceTypicalTasks: Array<{ name: string }>;
		};
		expect(streamDataSources.sourceTypicalTasks.length).toBeGreaterThan(0);
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

	it("evaluates catalog triggers from stream-level fields without sourceSystems", async () => {
		let capturedSource: Record<string, unknown> | undefined;
		const runtime = {
			buildCatalogTasks: async (params: BuildCatalogTasksParams) => {
				capturedSource = params.source;
				return [
					{
						taskCode: "kirill-work",
						name: "Работа Кирилла",
						workType: "Разработка",
						reason: "test",
						estimateHoursPerDay: 5,
						coefficient: 1,
						total: 5,
						match: {},
						workId: "kirill-work",
					},
				];
			},
		} as unknown as V2TypicalWorkRuntimeService;

		const streamOnlyService = new V2CalculationService(
			null as never,
			null as never,
			runtime,
		);

		const result = await streamOnlyService.evaluate(
			patchV2AnketaCalculationLogicRules(V2_DEFAULT_TEMPLATE_SNAPSHOT.logic, {
				jsonSchema: V2_DEFAULT_TEMPLATE_SNAPSHOT.jsonSchema,
				uiSchema: V2_DEFAULT_TEMPLATE_SNAPSHOT.uiSchema,
			}),
			{
				streamDataSources: {
					groupKirilla: { field_dropdown: "Кухня" },
				},
			},
		);

		expect(capturedSource?.field_dropdown).toBe("Кухня");
		const tasks = (
			result.formData.streamDataSources as {
				sourceTypicalTasks: Array<{ name: string }>;
			}
		).sourceTypicalTasks;
		expect(tasks.some((t) => t.name === "Работа Кирилла")).toBe(true);
	});

	it("ignores empty sourceSystems rows and uses stream-level triggers", async () => {
		let capturedSource: Record<string, unknown> | undefined;
		const runtime = {
			buildCatalogTasks: async (params: BuildCatalogTasksParams) => {
				capturedSource = params.source;
				return [
					{
						taskCode: "kirill-work",
						name: "Работа Кирилла",
						workType: "Разработка",
						reason: "test",
						estimateHoursPerDay: 5,
						coefficient: 1,
						total: 5,
						match: {},
						workId: "kirill-work",
					},
				];
			},
		} as unknown as V2TypicalWorkRuntimeService;

		const streamOnlyService = new V2CalculationService(
			null as never,
			null as never,
			runtime,
		);

		const result = await streamOnlyService.evaluate(
			patchV2AnketaCalculationLogicRules(V2_DEFAULT_TEMPLATE_SNAPSHOT.logic, {
				jsonSchema: V2_DEFAULT_TEMPLATE_SNAPSHOT.jsonSchema,
				uiSchema: V2_DEFAULT_TEMPLATE_SNAPSHOT.uiSchema,
			}),
			{
				detailInfo: {
					sourceSystems: [{}],
				},
				streamDataSources: {
					groupKirilla: { field_dropdown: "Кухня" },
				},
			},
		);

		expect(capturedSource?.field_dropdown).toBe("Кухня");
		const tasks = (
			result.formData.streamDataSources as {
				sourceTypicalTasks: Array<{ name: string }>;
			}
		).sourceTypicalTasks;
		expect(tasks.some((t) => t.name === "Работа Кирилла")).toBe(true);
	});

	it("injects catalog rule and reads root-level triggers for minimal test schema", async () => {
		let capturedSource: Record<string, unknown> | undefined;
		const runtime = {
			buildCatalogTasks: async (params: BuildCatalogTasksParams) => {
				capturedSource = params.source;
				return [
					{
						taskCode: "root-trigger-work",
						name: "Работа по справочнику",
						workType: "Разработка",
						reason: "test",
						estimateHoursPerDay: 3,
						coefficient: 1,
						total: 3,
						match: {},
						workId: "root-trigger-work",
					},
				];
			},
		} as unknown as V2TypicalWorkRuntimeService;

		const service = new V2CalculationService(
			null as never,
			null as never,
			runtime,
		);

		const minimalJsonSchema = {
			type: "object",
			properties: {
				field_KQX2OsDx: { type: "string" },
				field_SId8TZKZ: { type: "array", items: { type: "object" } },
			},
		};
		const minimalUiSchema = {
			field_SId8TZKZ: { "ui:options": { archComponent: "typicalWork" } },
		};

		const result = await service.evaluate(
			{ rules: [] },
			{ field_KQX2OsDx: "Непосредственно" },
			{ jsonSchema: minimalJsonSchema, uiSchema: minimalUiSchema },
		);

		expect(result.taskTriggers.some((t) => t.ruleId === "unified-source-typical-works")).toBe(
			true,
		);
		expect(capturedSource?.field_KQX2OsDx).toBe("Непосредственно");
		const tasks = (result.formData as { field_SId8TZKZ: Array<{ name: string }> })
			.field_SId8TZKZ;
		expect(tasks.some((t) => t.name === "Работа по справочнику")).toBe(true);
	});

	it("clears legacy fan-out typical work paths when root trigger stops matching", async () => {
		const staleRow = {
			taskCode: "CAT_38a49690",
			name: "ееее",
			total: 10,
			estimateHoursPerDay: 10,
			coefficient: 1,
		};
		let shouldGenerate = true;
		const runtime = {
			buildCatalogTasks: async () =>
				shouldGenerate
					? [
							{
								taskCode: "CAT_38a49690",
								name: "ееее",
								workType: "—",
								reason: "test",
								estimateHoursPerDay: 10,
								coefficient: 1,
								total: 10,
								match: {},
								workId: "CAT_38a49690",
							},
						]
					: [],
		} as unknown as V2TypicalWorkRuntimeService;

		const service = new V2CalculationService(
			null as never,
			null as never,
			runtime,
		);

		const minimalJsonSchema = {
			type: "object",
			properties: {
				field_OFmNQhnL: { type: "array", items: { type: "object" } },
				field_9t6xDZub: { type: "string" },
			},
		};
		const minimalUiSchema = {
			field_OFmNQhnL: { "ui:options": { archComponent: "typicalWork" } },
		};

		shouldGenerate = true;
		const active = await service.evaluate(
			{ rules: [] },
			{ field_9t6xDZub: "Да" },
			{ jsonSchema: minimalJsonSchema, uiSchema: minimalUiSchema },
		);
		expect(
			(active.formData as { field_OFmNQhnL: unknown[] }).field_OFmNQhnL.length,
		).toBeGreaterThan(0);

		shouldGenerate = false;
		const inactive = await service.evaluate(
			{ rules: [] },
			{
				field_9t6xDZub: "Нет",
				field_OFmNQhnL: [staleRow],
				streamDataSources: { sourceTypicalTasks: [staleRow] },
				detailInfo: { detailTypicalTasks: [staleRow] },
				streamModelControl: { "field_Khn6-HAW": [staleRow] },
			},
			{ jsonSchema: minimalJsonSchema, uiSchema: minimalUiSchema },
		);

		const formData = inactive.formData as {
			field_OFmNQhnL: unknown[];
			streamDataSources: { sourceTypicalTasks: unknown[] };
			detailInfo: { detailTypicalTasks: unknown[] };
			streamModelControl: { "field_Khn6-HAW": unknown[] };
			summary: {
				platformStreams: Array<{
					streamName: string;
					baseTypicalScore: number;
				}>;
			};
		};
		expect(formData.field_OFmNQhnL).toEqual([]);
		expect(formData.streamDataSources.sourceTypicalTasks).toEqual([]);
		expect(formData.detailInfo.detailTypicalTasks).toEqual([]);
		expect(formData.streamModelControl["field_Khn6-HAW"]).toEqual([]);
		const sourcesStream = formData.summary.platformStreams.find(
			(row) => row.streamName === "Источники данных",
		);
		expect(sourcesStream?.baseTypicalScore).toBe(0);
	});

	it("uses stream localParams for coefficient when source row has no weights (ФТ-024)", async () => {
		const result = await service.evaluate(V2_DEFAULT_TEMPLATE_SNAPSHOT.logic, {
			detailInfo: {
				sourceSystems: [{ name: "CRM", type: "Внутренний" }],
			},
			streamDataSources: {
				localParams: {
					domainComplexity: "Высокая",
					entityVolume: "Большое",
				},
			},
		});
		const streamDataSources = result.formData.streamDataSources as {
			sourceTypicalTasks: Array<{ coefficient: number }>;
		};
		expect(streamDataSources.sourceTypicalTasks[0]?.coefficient).toBe(1);
	});

	it("applies catalog coefficient from DB labor params (ФТ-024)", async () => {
		const result = await service.evaluate(V2_DEFAULT_TEMPLATE_SNAPSHOT.logic, {
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

		const streamDataSources = result.formData.streamDataSources as {
			sourceTypicalTasks: Array<{ name: string; coefficient: number }>;
		};
		expect(streamDataSources.sourceTypicalTasks[0]?.coefficient).toBe(1);
		const analysis = streamDataSources.sourceTypicalTasks.find((t) =>
			t.name.includes("Анализ Данных"),
		);
		expect(analysis?.coefficient).toBe(1);
	});

	it("generates external source works (stage 214+) for external type", async () => {
		const result = await service.evaluate(V2_DEFAULT_TEMPLATE_SNAPSHOT.logic, {
			detailInfo: {
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

	it("keeps control-model typical works disabled until control field exists in v5", async () => {
		const result = await service.evaluate(V2_DEFAULT_TEMPLATE_SNAPSHOT.logic, {
			streamModelControl: {
				control: {
					controlTypes: ["КД", "ОК"],
				},
			},
		});
		const controlTasks = (
			result.formData.streamModelControl as {
				"field_Khn6-HAW"?: Array<{ name: string }>;
				control?: { controlTypicalTasks?: Array<{ name: string }> };
			}
		)["field_Khn6-HAW"];
		expect(controlTasks ?? []).toHaveLength(0);
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

	it("computes atypical work row totals and summary.atypicalTotal", async () => {
		const uiSchema = {
			detailInfo: {
				field_npwqpBHt: {
					"ui:options": { archComponent: "atypicalWork" },
				},
			},
		};
		const result = await service.evaluate(
			patchV2AnketaCalculationLogicRules({ rules: [] }, { uiSchema }),
			{
				detailInfo: {
					field_npwqpBHt: [
						{
							name: "a",
							estimateHoursPerDay: 100,
							coefficient: 1.5,
							includeInCalculation: true,
						},
						{
							name: "b",
							estimateHoursPerDay: 666,
							coefficient: 10.5,
							includeInCalculation: true,
						},
					],
				},
				generalInfo: { implementationStream: "РБ (КМБ и КСБ)" },
			},
			{ uiSchema },
		);

		const detailInfo = result.formData.detailInfo as {
			field_npwqpBHt: Array<{ total: number }>;
		};
		expect(detailInfo.field_npwqpBHt[0]?.total).toBe(150);
		expect(detailInfo.field_npwqpBHt[1]?.total).toBe(6993);

		const summary = result.formData.summary as {
			atypicalTotal: number;
			scoreWithComplexityCoeff: number;
			detailedCalculation: Array<{
				stageName: string;
				complexityCoeff: number | null;
			}>;
		};
		expect(summary.atypicalTotal).toBe(7143);
		expect(
			result.items.find((item) => item.ruleId === "unified-atypical-total")?.value,
		).toBe(7143);
		const atypicalRow = summary.detailedCalculation.find(
			(row) => row.stageName === "Нетиповые задачи",
		);
		expect(atypicalRow?.complexityCoeff).toBe(7143);
		expect(summary.scoreWithComplexityCoeff).toBeGreaterThan(7143);
	});

	it("snapshot: complexity and modelsList change legacy scoreWithComplexityCoeff", async () => {
		const { jsonSchema, uiSchema, logic } = V2_DEFAULT_TEMPLATE_SNAPSHOT;
		const baseline = await service.evaluate(logic, {
			generalInfo: { complexity: "1 — Низкая ×1.00" },
		}, { jsonSchema, uiSchema });

		const richer = await service.evaluate(logic, {
			generalInfo: {
				complexity: "4 — Высокая ×2.00",
				modelService: [{ field_o_HRj6VO: true, field_jUm5syZf: ["Онлайн"] }],
			},
			detailInfo: {
				modelsList: [{ algorithmType: "CV", autoML: true }],
				sourceSystems: [{ name: "src-1", type: "Внутренний" }],
			},
			uncertaintyCalculation: {
				field_QCwwo5c5: 10,
				riskGroup: { sanctions: "Высокий" },
			},
		}, { jsonSchema, uiSchema });

		const baselineSummary = baseline.formData.summary as {
			scoreWithComplexityCoeff: number;
		};
		const richerSummary = richer.formData.summary as {
			scoreWithComplexityCoeff: number;
		};
		expect(richerSummary.scoreWithComplexityCoeff).toBeGreaterThan(
			baselineSummary.scoreWithComplexityCoeff,
		);
	});

	it("parses string atypical coefficients in row_computed", async () => {
		const uiSchema = {
			detailInfo: {
				field_npwqpBHt: {
					"ui:options": { archComponent: "atypicalWork" },
				},
			},
		};
		const result = await service.evaluate(
			patchV2AnketaCalculationLogicRules({ rules: [] }, { uiSchema }),
			{
				detailInfo: {
					field_npwqpBHt: [
						{
							name: "str-coeff",
							estimateHoursPerDay: "10",
							coefficient: "×1.5",
							includeInCalculation: true,
						},
					],
				},
			},
			{ uiSchema },
		);
		const rows = (result.formData.detailInfo as {
			field_npwqpBHt: Array<{ total: number }>;
		}).field_npwqpBHt;
		expect(rows[0]?.total).toBe(15);
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
