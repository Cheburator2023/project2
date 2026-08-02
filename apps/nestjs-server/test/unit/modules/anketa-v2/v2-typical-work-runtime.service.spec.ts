import { V2TypicalWorkRuntimeService } from "../../../../src/modules/anketa-v2/services/v2-typical-work-runtime.service";

type MockRepository<T> = {
	find: jest.Mock<Promise<T[]>, [unknown?]>;
};

function repo<T>(rows: T[]): MockRepository<T> {
	return {
		find: jest.fn(async () => rows),
	};
}

const WORK_WITH_TRIGGER = "11111111-1111-1111-1111-111111111111";
const WORK_WITHOUT_TRIGGERS = "22222222-2222-2222-2222-222222222222";
const STREAM = "ИД. Внутренний";

const DEFAULT_ASSIGNMENTS = [
	{
		id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
		workId: WORK_WITH_TRIGGER,
		streamExecutor: STREAM,
		isActive: true,
	},
	{
		id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
		workId: WORK_WITHOUT_TRIGGERS,
		streamExecutor: STREAM,
		isActive: true,
	},
];

function createService({
	rules,
	assignments = DEFAULT_ASSIGNMENTS,
	laborParams = [],
	laborRows = [],
	versionConfigs = [],
	works,
	norms,
	templateVersion = null,
}: {
	rules: Array<{
		workId: string;
		streamExecutor: string;
		paramCode: string;
		paramName: string | null;
		operator: string;
		valueCode: string | null;
		valueLabel: string | null;
		valueCodes?: Array<{ code: string; label: string | null }> | null;
	}>;
	assignments?: Array<{
		id: string;
		workId: string;
		streamExecutor: string;
		isActive: boolean;
		triggerMode?: string;
		triggerFormula?: {
			tokens: unknown[];
			text: string;
		} | null;
		triggerArchCountKind?: string | null;
		triggerArchCountSteps?: Array<{ count: number; coefficient: number }> | null;
		triggerArchCountCombinator?: string;
	}>;
	laborParams?: Array<{
		workId: string;
		streamExecutor: string;
		paramCode: string;
		paramName?: string | null;
		kind: string;
		schemaFieldUid?: string | null;
		anyOfValueCodes?: string[] | null;
		anyOfValueLabels?: string[] | null;
		coeffOn?: string;
		coeffOff?: string;
	}>;
	laborRows?: Array<{
		workId: string;
		streamExecutor: string;
		paramCode: string;
		paramName?: string | null;
		valueCode: string | null;
		valueLabel: string | null;
		coefficient: string;
	}>;
	versionConfigs?: Array<{
		workId: string;
		streamExecutor: string;
		templateVersionId: string;
		formula: unknown;
		formulaText: string | null;
		roundingMode: string;
		roundingStep: string | null;
		calculationLogic: unknown;
	}>;
	works?: Array<{
		id: string;
		name: string;
		workType: string;
		archComponentType: string;
	}>;
	norms?: Array<{
		workId: string;
		streamExecutor: string;
		normValue: string;
		validFrom: string;
		validTo: string | null;
	}>;
	templateVersion?: {
		id: string;
		jsonSchema?: Record<string, unknown>;
		uiSchema?: Record<string, unknown>;
	} | null;
}) {
	const workRepository = repo(
		works ?? [
			{
				id: WORK_WITH_TRIGGER,
				name: "Работа с триггером",
				workType: "Типовая",
				archComponentType: "Система-источник",
			},
			{
				id: WORK_WITHOUT_TRIGGERS,
				name: "Работа без триггеров",
				workType: "Типовая",
				archComponentType: "Система-источник",
			},
		],
	);
	const normRepository = repo(
		norms ?? [
			{
				workId: WORK_WITH_TRIGGER,
				streamExecutor: STREAM,
				normValue: "2",
				validFrom: "2025-01-01",
				validTo: null,
			},
			{
				workId: WORK_WITHOUT_TRIGGERS,
				streamExecutor: STREAM,
				normValue: "3",
				validFrom: "2025-01-01",
				validTo: null,
			},
		],
	);
	const ruleRepository = repo(rules);
	const laborRepository = repo(laborRows);
	const laborParamRepository = repo(laborParams);
	const assignmentRepository = repo(assignments);
	const versionConfigRepository = repo(versionConfigs);
	const templateVersionRepository = {
		findOne: jest.fn(async () => templateVersion),
	};
	const paramCatalogService = {
		listTriggerStatusCatalog: jest.fn(async () => []),
	};
	const streamCatalog = {
		getCatalog: jest.fn(async () => []),
		getCachedCatalog: jest.fn(() => []),
		invalidate: jest.fn(),
		refresh: jest.fn(async () => []),
	};

	return new V2TypicalWorkRuntimeService(
		workRepository as never,
		normRepository as never,
		ruleRepository as never,
		laborRepository as never,
		laborParamRepository as never,
		assignmentRepository as never,
		versionConfigRepository as never,
		templateVersionRepository as never,
		paramCatalogService as never,
		streamCatalog as never,
	);
}

describe("V2TypicalWorkRuntimeService", () => {
	it("includes work only when all trigger rules match and excludes works without triggers", async () => {
		const service = createService({
			rules: [
				{
					workId: WORK_WITH_TRIGGER,
					streamExecutor: STREAM,
					paramCode: "type",
					paramName: "Тип источника",
					operator: "=",
					valueCode: "internal",
					valueLabel: "Внутренний",
				},
			],
		});

		const matched = await service.buildCatalogTasks({
			archComponentType: "Система-источник",
			streamExecutor: STREAM,
			source: { type: "Внутренний" },
			templateVersionId: null,
			atDate: "2025-06-01",
		});
		const notMatched = await service.buildCatalogTasks({
			archComponentType: "Система-источник",
			streamExecutor: STREAM,
			source: { type: "Внешний" },
			templateVersionId: null,
			atDate: "2025-06-01",
		});

		expect(matched.map((task) => task.workId)).toEqual([WORK_WITH_TRIGGER]);
		expect(notMatched).toEqual([]);
	});

	it("filters catalog tasks by allowedWorkIds when block binding is set", async () => {
		const service = createService({
			rules: [
				{
					workId: WORK_WITH_TRIGGER,
					streamExecutor: STREAM,
					paramCode: "type",
					paramName: "Тип источника",
					operator: "=",
					valueCode: "internal",
					valueLabel: "Внутренний",
				},
			],
		});

		const allowed = await service.buildCatalogTasks({
			archComponentType: "Система-источник",
			streamExecutor: STREAM,
			source: { type: "Внутренний" },
			templateVersionId: null,
			atDate: "2025-06-01",
			allowedWorkIds: [WORK_WITH_TRIGGER],
		});
		const blocked = await service.buildCatalogTasks({
			archComponentType: "Система-источник",
			streamExecutor: STREAM,
			source: { type: "Внутренний" },
			templateVersionId: null,
			atDate: "2025-06-01",
			allowedWorkIds: [WORK_WITHOUT_TRIGGERS],
		});
		const empty = await service.buildCatalogTasks({
			archComponentType: "Система-источник",
			streamExecutor: STREAM,
			source: { type: "Внутренний" },
			templateVersionId: null,
			atDate: "2025-06-01",
			allowedWorkIds: [],
		});

		expect(allowed.map((task) => task.workId)).toEqual([WORK_WITH_TRIGGER]);
		expect(blocked).toEqual([]);
		expect(empty).toEqual([]);
		const workFind = (service as unknown as {
			workRepository: { find: jest.Mock };
		}).workRepository.find;
		const allowedWhere = workFind.mock.calls[0]?.[0]?.where;
		expect(allowedWhere).toHaveProperty("id");
		expect(allowedWhere).not.toHaveProperty("archComponentType");
	});

	it("ignores stale allowedWorkIds that miss all stream assignments", async () => {
		const service = createService({
			rules: [
				{
					workId: WORK_WITH_TRIGGER,
					streamExecutor: STREAM,
					paramCode: "type",
					paramName: "Тип источника",
					operator: "=",
					valueCode: "internal",
					valueLabel: "Внутренний",
				},
			],
		});

		const tasks = await service.buildCatalogTasks({
			archComponentType: "Система-источник",
			streamExecutor: STREAM,
			source: { type: "Внутренний" },
			templateVersionId: null,
			atDate: "2025-06-01",
			// Устаревшие id из старого snapshot — ни одного нет среди назначений.
			allowedWorkIds: ["00000000-0000-4000-8000-000000000099"],
			worksCatalogAllArchComponents: true,
		});

		expect(tasks.map((task) => task.workId)).toEqual([WORK_WITH_TRIGGER]);
	});

	it("returns empty when work is not assigned to stream", async () => {
		const service = createService({
			rules: [
				{
					workId: WORK_WITH_TRIGGER,
					streamExecutor: STREAM,
					paramCode: "type",
					paramName: "Тип источника",
					operator: "=",
					valueCode: null,
					valueLabel: "Внутренний",
				},
			],
			assignments: [],
		});

		const tasks = await service.buildCatalogTasks({
			archComponentType: "Система-источник",
			streamExecutor: STREAM,
			source: { type: "Внутренний" },
			templateVersionId: null,
			atDate: "2025-06-01",
		});

		expect(tasks).toEqual([]);
	});

	it("supports numeric trigger operators in runtime task generation", async () => {
		const service = createService({
			rules: [
				{
					workId: WORK_WITH_TRIGGER,
					streamExecutor: STREAM,
					paramCode: "metricCount",
					paramName: "Количество метрик",
					operator: ">=",
					valueCode: "10",
					valueLabel: "10",
				},
			],
		});

		const matched = await service.buildCatalogTasks({
			archComponentType: "Система-источник",
			streamExecutor: STREAM,
			source: { metricCount: 12 },
			templateVersionId: null,
			atDate: "2025-06-01",
		});
		const notMatched = await service.buildCatalogTasks({
			archComponentType: "Система-источник",
			streamExecutor: STREAM,
			source: { metricCount: 8 },
			templateVersionId: null,
			atDate: "2025-06-01",
		});

		expect(matched).toHaveLength(1);
		expect(notMatched).toHaveLength(0);
	});

	it("supports in / not_in trigger operators", async () => {
		const service = createService({
			rules: [
				{
					workId: WORK_WITH_TRIGGER,
					streamExecutor: STREAM,
					paramCode: "region",
					paramName: "Регион",
					operator: "in",
					valueCode: null,
					valueLabel: null,
					valueCodes: [
						{ code: "eu", label: "Европа" },
						{ code: "us", label: "США" },
					],
				},
			],
		});

		const matched = await service.buildCatalogTasks({
			archComponentType: "Система-источник",
			streamExecutor: STREAM,
			source: { region: "eu" },
			templateVersionId: null,
			atDate: "2025-06-01",
		});
		const excluded = await service.buildCatalogTasks({
			archComponentType: "Система-источник",
			streamExecutor: STREAM,
			source: { region: "asia" },
			templateVersionId: null,
			atDate: "2025-06-01",
		});

		expect(matched).toHaveLength(1);
		expect(matched[0]?.formulaBreakdown?.triggerConditions).toBe(
			"Регион ∈ {Европа, США}",
		);
		expect(excluded).toHaveLength(0);
	});

	it("applies labor any-of coefficient in runtime calculation", async () => {
		const service = createService({
			rules: [
				{
					workId: WORK_WITH_TRIGGER,
					streamExecutor: STREAM,
					paramCode: "type",
					paramName: "Тип",
					operator: "=",
					valueCode: null,
					valueLabel: "Внутренний",
				},
			],
			laborParams: [
				{
					workId: WORK_WITH_TRIGGER,
					streamExecutor: STREAM,
					paramCode: "flag",
					kind: "any_of",
					anyOfValueCodes: ["yes"],
					anyOfValueLabels: ["Да"],
					coeffOn: "2",
					coeffOff: "1",
				},
			],
			versionConfigs: [
				{
					workId: WORK_WITH_TRIGGER,
					streamExecutor: STREAM,
					templateVersionId: "tpl-v1",
					formula: [{ kind: "norm" }, { kind: "param_coeff", paramCode: "flag" }],
					formulaText: null,
					roundingMode: "none",
					roundingStep: null,
					calculationLogic: null,
				},
			],
		});

		const on = await service.buildCatalogTasks({
			archComponentType: "Система-источник",
			streamExecutor: STREAM,
			source: { type: "Внутренний", flag: "yes" },
			templateVersionId: "tpl-v1",
			atDate: "2025-06-01",
		});
		const off = await service.buildCatalogTasks({
			archComponentType: "Система-источник",
			streamExecutor: STREAM,
			source: { type: "Внутренний", flag: "no" },
			templateVersionId: "tpl-v1",
			atDate: "2025-06-01",
		});

		expect(on[0]?.coefficient).toBe(2);
		expect(off[0]?.coefficient).toBe(1);
	});

	it("applies boolean checkbox any-of coefficient in runtime calculation", async () => {
		const service = createService({
			rules: [
				{
					workId: WORK_WITH_TRIGGER,
					streamExecutor: STREAM,
					paramCode: "type",
					paramName: "Тип",
					operator: "=",
					valueCode: null,
					valueLabel: "Внутренний",
				},
			],
			laborParams: [
				{
					workId: WORK_WITH_TRIGGER,
					streamExecutor: STREAM,
					paramCode: "field_flag",
					paramName: "Флаг @ field_flag",
					kind: "any_of",
					anyOfValueCodes: ["true"],
					anyOfValueLabels: ["Да"],
					coeffOn: "1.5",
					coeffOff: "0.5",
				},
			],
			versionConfigs: [
				{
					workId: WORK_WITH_TRIGGER,
					streamExecutor: STREAM,
					templateVersionId: "tpl-v1",
					formula: [
						{ kind: "norm" },
						{ kind: "param_anyof", paramCode: "field_flag" },
					],
					formulaText: null,
					roundingMode: "none",
					roundingStep: null,
					calculationLogic: null,
				},
			],
		});

		const on = await service.buildCatalogTasks({
			archComponentType: "Система-источник",
			streamExecutor: STREAM,
			source: { type: "Внутренний", field_flag: true },
			templateVersionId: "tpl-v1",
			atDate: "2025-06-01",
		});
		const off = await service.buildCatalogTasks({
			archComponentType: "Система-источник",
			streamExecutor: STREAM,
			source: { type: "Внутренний", field_flag: false },
			templateVersionId: "tpl-v1",
			atDate: "2025-06-01",
		});

		expect(on[0]?.coefficient).toBe(1.5);
		expect(off[0]?.coefficient).toBe(0.5);
	});

	it("treats absent boolean checkbox as coeffOff when typical work activates", async () => {
		const service = createService({
			rules: [
				{
					workId: WORK_WITH_TRIGGER,
					streamExecutor: STREAM,
					paramCode: "type",
					paramName: "Тип",
					operator: "=",
					valueCode: null,
					valueLabel: "Внутренний",
				},
			],
			laborParams: [
				{
					workId: WORK_WITH_TRIGGER,
					streamExecutor: STREAM,
					paramCode: "field_flag",
					paramName: "Флаг @ field_flag",
					kind: "any_of",
					anyOfValueCodes: ["true"],
					anyOfValueLabels: ["Да"],
					coeffOn: "1",
					coeffOff: "2",
				},
			],
			versionConfigs: [
				{
					workId: WORK_WITH_TRIGGER,
					streamExecutor: STREAM,
					templateVersionId: "tpl-v1",
					formula: [
						{ kind: "norm" },
						{ kind: "param_anyof", paramCode: "field_flag" },
					],
					formulaText: null,
					roundingMode: "none",
					roundingStep: null,
					calculationLogic: null,
				},
			],
		});

		const absent = await service.buildCatalogTasks({
			archComponentType: "Система-источник",
			streamExecutor: STREAM,
			source: { type: "Внутренний" },
			templateVersionId: "tpl-v1",
			atDate: "2025-06-01",
			hiddenParamCodes: new Set(["field_flag"]),
		});

		expect(absent[0]?.coefficient).toBe(2);
		expect(absent[0]?.total).toBe(4);
	});

	it("applies by-value schema dictionary coefficient in runtime calculation", async () => {
		const service = createService({
			rules: [
				{
					workId: WORK_WITH_TRIGGER,
					streamExecutor: STREAM,
					paramCode: "type",
					paramName: "Тип",
					operator: "=",
					valueCode: null,
					valueLabel: "Внутренний",
				},
			],
			laborParams: [
				{
					workId: WORK_WITH_TRIGGER,
					streamExecutor: STREAM,
					paramCode: "field_dict",
					paramName: "Поле справочника @ field_dict",
					kind: "by_value",
				},
			],
			laborRows: [
				{
					workId: WORK_WITH_TRIGGER,
					streamExecutor: STREAM,
					paramCode: "field_dict",
					paramName: "Поле справочника @ field_dict",
					valueCode: "Да",
					valueLabel: "Да",
					coefficient: "20",
				},
				{
					workId: WORK_WITH_TRIGGER,
					streamExecutor: STREAM,
					paramCode: "field_dict",
					paramName: "Поле справочника @ field_dict",
					valueCode: "Нет",
					valueLabel: "Нет",
					coefficient: "10",
				},
			],
			versionConfigs: [
				{
					workId: WORK_WITH_TRIGGER,
					streamExecutor: STREAM,
					templateVersionId: "tpl-v1",
					formula: [
						{ kind: "norm" },
						{ kind: "param_coeff", paramCode: "field_dict" },
					],
					formulaText: null,
					roundingMode: "none",
					roundingStep: null,
					calculationLogic: null,
				},
			],
		});

		const yes = await service.buildCatalogTasks({
			archComponentType: "Система-источник",
			streamExecutor: STREAM,
			source: { type: "Внутренний", field_dict: "Да" },
			templateVersionId: "tpl-v1",
			atDate: "2025-06-01",
		});
		const no = await service.buildCatalogTasks({
			archComponentType: "Система-источник",
			streamExecutor: STREAM,
			source: { type: "Внутренний", field_dict: "Нет" },
			templateVersionId: "tpl-v1",
			atDate: "2025-06-01",
		});

		expect(yes[0]?.coefficient).toBe(20);
		expect(no[0]?.coefficient).toBe(10);
	});

	it("applies schema-bound readyPromReports coeffs even when methodology catalog is empty", async () => {
		const service = createService({
			rules: [
				{
					workId: WORK_WITH_TRIGGER,
					streamExecutor: STREAM,
					paramCode: "type",
					paramName: "Тип",
					operator: "=",
					valueCode: null,
					valueLabel: "Внутренний",
				},
			],
			laborParams: [
				{
					workId: WORK_WITH_TRIGGER,
					streamExecutor: STREAM,
					paramCode: "readyPromReports",
					paramName: "Наличие готовых промышленных витрин",
					kind: "by_value",
					schemaFieldUid: "field_ready-prom",
				},
			],
			laborRows: [
				{
					workId: WORK_WITH_TRIGGER,
					streamExecutor: STREAM,
					paramCode: "readyPromReports",
					paramName: "Наличие готовых промышленных витрин",
					valueCode: null,
					valueLabel: "Да",
					coefficient: "0.5",
				},
				{
					workId: WORK_WITH_TRIGGER,
					streamExecutor: STREAM,
					paramCode: "readyPromReports",
					paramName: "Наличие готовых промышленных витрин",
					valueCode: null,
					valueLabel: "Нет",
					coefficient: "666",
				},
			],
			versionConfigs: [
				{
					workId: WORK_WITH_TRIGGER,
					streamExecutor: STREAM,
					templateVersionId: "tpl-v1",
					formula: [
						{ kind: "norm" },
						{ kind: "param_coeff", paramCode: "readyPromReports" },
					],
					formulaText: null,
					roundingMode: "none",
					roundingStep: null,
					calculationLogic: null,
				},
			],
		});

		const yes = await service.buildCatalogTasks({
			archComponentType: "Система-источник",
			streamExecutor: STREAM,
			source: { type: "Внутренний", readyPromReports: true },
			formData: { readyPromReports: true },
			templateVersionId: "tpl-v1",
			atDate: "2025-06-01",
		});
		const no = await service.buildCatalogTasks({
			archComponentType: "Система-источник",
			streamExecutor: STREAM,
			source: { type: "Внутренний", readyPromReports: false },
			formData: { readyPromReports: false },
			templateVersionId: "tpl-v1",
			atDate: "2025-06-01",
		});

		expect(yes[0]?.coefficient).toBe(0.5);
		expect(no[0]?.coefficient).toBe(666);
	});

	it("falls back to global catalog works when template has no own works", async () => {
		const service = createService({
			rules: [
				{
					workId: WORK_WITH_TRIGGER,
					streamExecutor: STREAM,
					paramCode: "type",
					paramName: "Тип источника",
					operator: "eq",
					valueCode: "internal",
					valueLabel: "Внутренний",
				},
			],
		});

		const tasks = await service.buildCatalogTasks({
			archComponentType: "Система-источник",
			streamExecutor: STREAM,
			source: { type: "Внутренний" },
			templateId: "new-empty-template",
			templateVersionId: null,
			atDate: "2025-06-01",
		});

		expect(tasks.length).toBeGreaterThan(0);
	});

	it("work 07 appears without dataMart when productization + workType match", async () => {
		const workId = WORK_WITH_TRIGGER;
		const service = createService({
			works: [
				{
					id: workId,
					name: "Разработка витрины для применения модели",
					workType: "Опциональная",
					archComponentType: "Объект / Витрина данных",
				},
			],
			rules: [],
			assignments: [
				{
					id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
					workId,
					streamExecutor: STREAM,
					isActive: true,
					triggerMode: "formula",
					triggerFormula: {
						tokens: [
							{
								kind: "param",
								paramCode: "productionAdditionalReports",
								paramName:
									"Необходимость продуктивизации и количество дополнительных витрин",
								operator: "!=",
								valueCode: "не_требуется",
								valueLabel: "Не требуется",
							},
							{ kind: "logic", op: "and" },
							{ kind: "paren_open" },
							{
								kind: "param",
								paramCode: "prePromEval",
								paramName: "Необходимость поддержки проведения пилота",
								operator: "=",
								valueCode: "true",
								valueLabel: "Да",
							},
							{ kind: "logic", op: "or" },
							{
								kind: "param",
								paramCode: "workType",
								paramName: "Тип работ модельного сервиса",
								operator: "in",
								values: [
									{ code: "Разработка", label: "Разработка" },
									{ code: "Внедрение", label: "Внедрение" },
									{
										code: "Разработка и внедрение",
										label: "Разработка и внедрение",
									},
								],
							},
							{ kind: "paren_close" },
						],
						text: "Необходимость продуктивизации и количество дополнительных витрин ≠ Не требуется И (Необходимость поддержки проведения пилота = Да ИЛИ Тип работ ∈ {Разработка, Внедрение, Разработка и внедрение})",
					},
				},
			],
			versionConfigs: [
				{
					workId,
					streamExecutor: STREAM,
					templateVersionId: "tpl-07",
					formula: [{ kind: "norm" }],
					formulaText: "N",
					roundingMode: "none",
					roundingStep: null,
					calculationLogic: null,
				},
			],
		});

		const formData = {
			generalInfo: {
				productionAdditionalReports: "1",
				modelService: [
					{
						field_dEVFQVQn: "мс1",
						prePromEval: false,
						workType: "Разработка",
					},
				],
			},
			detailInfo: { dataMart: [] },
		};
		const tasks = await service.buildCatalogTasks({
			archComponentType: "Объект / Витрина данных",
			streamExecutor: STREAM,
			source: formData.generalInfo.modelService[0]!,
			formData,
			templateVersionId: "tpl-07",
			atDate: "2025-06-01",
		});

		expect(tasks.map((task) => task.workId)).toEqual([workId]);
		expect(tasks[0]?.total).toBeGreaterThan(0);
	});

	it("MVP on modelService appears without any models (fan-out empty)", async () => {
		const mvpWorkId = WORK_WITH_TRIGGER;
		const service = createService({
			works: [
				{
					id: mvpWorkId,
					name: "Разработка пилотной модели (MVP)",
					workType: "Опциональная",
					archComponentType: "Модель",
				},
			],
			rules: [
				{
					workId: mvpWorkId,
					streamExecutor: STREAM,
					paramCode: "field_o_HRj6VO",
					paramName: "Необходимость пилота (MVP)",
					operator: "=",
					valueCode: "true",
					valueLabel: "Да",
				},
			],
			assignments: [
				{
					id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
					workId: mvpWorkId,
					streamExecutor: STREAM,
					isActive: true,
					triggerArchCountKind: "modelService",
					triggerArchCountSteps: [{ count: 1, coefficient: 1 }],
					triggerArchCountCombinator: "and",
				},
			],
			versionConfigs: [
				{
					workId: mvpWorkId,
					streamExecutor: STREAM,
					templateVersionId: "tpl-mvp",
					formula: [{ kind: "norm" }],
					formulaText: "N",
					roundingMode: "none",
					roundingStep: null,
					calculationLogic: null,
				},
			],
		});

		const formData = {
			generalInfo: {
				modelService: [
					{
						field_dEVFQVQn: "мс1",
						field_o_HRj6VO: true,
						workType: "Внедрение",
					},
				],
			},
			detailInfo: { modelsList: [] },
		};
		const tasks = await service.buildCatalogTasks({
			archComponentType: "Модель",
			streamExecutor: STREAM,
			source: formData.generalInfo.modelService[0]!,
			formData,
			templateVersionId: "tpl-mvp",
			atDate: "2025-06-01",
		});

		expect(tasks.map((task) => task.workId)).toEqual([mvpWorkId]);
		expect(tasks[0]?.total).toBe(2);
		expect(tasks[0]?.formulaBreakdown?.expanded).not.toContain(
			"нет заполненных",
		);
		expect(
			tasks[0]?.formulaBreakdown?.instanceBreakdown?.map(
				(row) => row.sourceLabel,
			),
		).toEqual(["мс1"]);
	});

	it("этап 09 (formula-триггер, arch=Модель) считается по каждой подходящей модели", async () => {
		const workId = WORK_WITH_TRIGGER;
		// Конфиг как у «09. Адаптация и внедрение модели»: formula-триггер,
		// triggerArchCount = null, арх. компонент «Модель».
		const buildService = () =>
			createService({
				works: [
					{
						id: workId,
						name: "Адаптация и внедрение модели",
						workType: "Типовая",
						archComponentType: "Модель",
					},
				],
				rules: [
					{
						workId,
						streamExecutor: STREAM,
						paramCode: "workType",
						paramName: "Тип работ модельного сервиса",
						operator: "in",
						valueCode: null,
						valueLabel: null,
						valueCodes: [
							{ code: "Внедрение", label: "Внедрение" },
							{
								code: "Разработка и внедрение",
								label: "Разработка и внедрение",
							},
						],
					},
					{
						workId,
						streamExecutor: STREAM,
						paramCode: "field_jUm5syZf",
						paramName: "Каналы внедрения",
						operator: "=",
						valueCode: null,
						valueLabel: null,
					},
				],
				assignments: [
					{
						id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
						workId,
						streamExecutor: STREAM,
						isActive: true,
						triggerMode: "formula",
						triggerFormula: {
							text: "Тип работ ∈ {Внедрение, Разработка и внедрение} И Каналы внедрения ≠ пусто",
							tokens: [
								{
									kind: "param",
									paramCode: "workType",
									paramName: "Тип работ модельного сервиса",
									operator: "in",
									values: [
										{ code: "Внедрение", label: "Внедрение" },
										{
											code: "Разработка и внедрение",
											label: "Разработка и внедрение",
										},
									],
								},
								{ kind: "logic", op: "and" },
								{
									kind: "param",
									paramCode: "field_jUm5syZf",
									paramName: "Каналы внедрения",
									operator: "=",
									valueCode: null,
									valueLabel: null,
								},
							],
						},
					},
				],
				versionConfigs: [
					{
						workId,
						streamExecutor: STREAM,
						templateVersionId: "tpl-09",
						formula: [{ kind: "norm" }],
						formulaText: "N",
						roundingMode: "none",
						roundingStep: null,
						calculationLogic: null,
					},
				],
			});

		const run = (modelsList: Array<Record<string, unknown>>) =>
			buildService().buildCatalogTasks({
				archComponentType: "Модель",
				streamExecutor: STREAM,
				source: { workType: "Разработка и внедрение" },
				formData: {
					generalInfo: {
						modelService: [{ workType: "Разработка и внедрение" }],
					},
					detailInfo: { modelsList },
				},
				templateVersionId: "tpl-09",
				atDate: "2025-06-01",
			});

		const allWithChannels = await run([
			{ name: "М1", field_jUm5syZf: ["Батч"] },
			{ name: "М2", field_jUm5syZf: ["Онлайн"] },
			{ name: "М3", field_jUm5syZf: ["Батч"] },
		]);
		expect(
			allWithChannels[0]?.formulaBreakdown?.instanceBreakdown?.map(
				(row) => row.sourceLabel,
			),
		).toEqual(["М1", "М2", "М3"]);
		expect(allWithChannels[0]?.total).toBe(6);
		// «Подробный расчёт» объясняет, по каким условиям работа появилась.
		expect(allWithChannels[0]?.formulaBreakdown?.triggerConditions).toBe(
			"Тип работ ∈ {Внедрение, Разработка и внедрение} И Каналы внедрения ≠ пусто",
		);

		// Модели без каналов внедрения не попадают в сумму (триггер по строке).
		const partial = await run([
			{ name: "М1", field_jUm5syZf: ["Батч"] },
			{ name: "М2" },
			{ name: "М3", field_jUm5syZf: [] },
		]);
		expect(
			partial[0]?.formulaBreakdown?.instanceBreakdown?.map(
				(row) => row.sourceLabel,
			),
		).toEqual(["М1"]);
		expect(partial[0]?.total).toBe(2);
	});

	it("empty algorithmType on a model does not inherit sibling model's labor coeff", async () => {
		const workId = WORK_WITH_TRIGGER;
		const service = createService({
			works: [
				{
					id: workId,
					name: "Разработка пилотной модели (MVP)",
					workType: "Типовая",
					archComponentType: "Модель",
				},
			],
			rules: [],
			assignments: [
				{
					id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
					workId,
					streamExecutor: STREAM,
					isActive: true,
					triggerArchCountKind: "model",
					triggerArchCountSteps: [{ count: 1, coefficient: 1 }],
					triggerArchCountCombinator: "and",
				},
			],
			laborParams: [
				{
					workId,
					streamExecutor: STREAM,
					paramCode: "algorithmType",
					paramName: "Сложность алгоритма / тип ML задачи",
					kind: "by_value",
					schemaFieldUid: "field_bd100464-101d-4d4e-8096-751dab52e01f",
				},
			],
			laborRows: [
				{
					workId,
					streamExecutor: STREAM,
					paramCode: "algorithmType",
					paramName: "Сложность алгоритма / тип ML задачи",
					valueCode: "Графовая аналитика",
					valueLabel: "Графовая аналитика",
					coefficient: "3.5",
				},
				{
					workId,
					streamExecutor: STREAM,
					paramCode: "algorithmType",
					paramName: "Сложность алгоритма / тип ML задачи",
					valueCode: "Гео-аналитика",
					valueLabel: "Гео-аналитика",
					coefficient: "2.5",
				},
			],
			versionConfigs: [
				{
					workId,
					streamExecutor: STREAM,
					templateVersionId: "tpl-algo",
					formula: [
						{ kind: "norm" },
						{ kind: "operator", op: "*" },
						{ kind: "param_coeff", paramCode: "algorithmType" },
					],
					formulaText: "N × коэф(algorithmType)",
					roundingMode: "none",
					roundingStep: null,
					calculationLogic: null,
				},
			],
			templateVersion: {
				id: "tpl-algo",
				jsonSchema: {
					type: "object",
					properties: {
						detailInfo: {
							type: "object",
							properties: {
								modelsList: {
									type: "array",
									items: {
										type: "object",
										properties: {
											name: { type: "string", title: "Название" },
											algorithmType: {
												type: "string",
												title: "Сложность алгоритма / тип ML задачи",
												enum: ["Гео-аналитика", "Графовая аналитика"],
											},
										},
									},
								},
							},
						},
					},
				},
				uiSchema: {
					detailInfo: {
						modelsList: {
							items: {
								algorithmType: {
									"ui:options": {
										schemaFieldUid:
											"field_bd100464-101d-4d4e-8096-751dab52e01f",
									},
								},
							},
						},
					},
				},
			},
		});

		// source имитирует flatten last-write (последняя модель = графовая)
		const tasks = await service.buildCatalogTasks({
			archComponentType: "Модель",
			streamExecutor: STREAM,
			source: { algorithmType: "Графовая аналитика" },
			formData: {
				detailInfo: {
					modelsList: [
						{ name: "Модели 1", algorithmType: "Гео-аналитика" },
						{ name: "Модели 2" },
						{ name: "Модели 3", algorithmType: "Графовая аналитика" },
					],
				},
			},
			templateVersionId: "tpl-algo",
			atDate: "2025-06-01",
		});

		expect(tasks).toHaveLength(1);
		const breakdown = tasks[0]?.formulaBreakdown?.instanceBreakdown ?? [];
		expect(breakdown).toHaveLength(3);
		// Норматив 2: geo → 2*2.5=5; empty → 2*1=2; graph → 2*3.5=7
		expect(breakdown.map((line) => line.total)).toEqual([5, 2, 7]);
		expect(tasks[0]?.total).toBeCloseTo(14, 5);
		expect(breakdown[1]?.expanded).not.toContain("3.5");
	});

	it("суммирует коэффициенты всех каналов внедрения модели (09 этап)", async () => {
		const workId = WORK_WITH_TRIGGER;
		const service = createService({
			works: [
				{
					id: workId,
					name: "Адаптация и внедрение модели",
					workType: "Типовая",
					archComponentType: "Модель",
				},
			],
			rules: [],
			assignments: [
				{
					id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
					workId,
					streamExecutor: STREAM,
					isActive: true,
					triggerArchCountKind: "model",
					triggerArchCountSteps: [{ count: 1, coefficient: 1 }],
					triggerArchCountCombinator: "and",
				},
			],
			laborParams: [
				{
					workId,
					streamExecutor: STREAM,
					paramCode: "channels",
					paramName: "Каналы внедрения",
					kind: "by_value",
					schemaFieldUid: "field_4fb7d302-c5f0-49e6-9cd2-959a1fbe1f4e",
				},
			],
			laborRows: [
				{
					workId,
					streamExecutor: STREAM,
					paramCode: "channels",
					paramName: "Каналы внедрения",
					valueCode: "Батч",
					valueLabel: "Батч",
					coefficient: "0.5",
				},
				{
					workId,
					streamExecutor: STREAM,
					paramCode: "channels",
					paramName: "Каналы внедрения",
					valueCode: "Стриминг",
					valueLabel: "Стриминг",
					coefficient: "1.5",
				},
			],
			versionConfigs: [
				{
					workId,
					streamExecutor: STREAM,
					templateVersionId: "tpl-channels",
					formula: [
						{ kind: "norm" },
						{ kind: "operator", op: "*" },
						{ kind: "param_coeff", paramCode: "channels" },
					],
					formulaText: "N × коэф(channels)",
					roundingMode: "none",
					roundingStep: null,
					calculationLogic: null,
				},
			],
			templateVersion: {
				id: "tpl-channels",
				jsonSchema: {
					type: "object",
					properties: {
						detailInfo: {
							type: "object",
							properties: {
								modelsList: {
									type: "array",
									items: {
										type: "object",
										properties: {
											name: { type: "string", title: "Название" },
											channels: {
												type: "array",
												title: "Каналы внедрения",
												items: {
													type: "string",
													enum: ["Батч", "Стриминг"],
												},
											},
										},
									},
								},
							},
						},
					},
				},
				uiSchema: {
					detailInfo: {
						modelsList: {
							items: {
								channels: {
									"ui:options": {
										schemaFieldUid:
											"field_4fb7d302-c5f0-49e6-9cd2-959a1fbe1f4e",
									},
								},
							},
						},
					},
				},
			},
		});

		const tasks = await service.buildCatalogTasks({
			archComponentType: "Модель",
			streamExecutor: STREAM,
			source: {},
			formData: {
				detailInfo: {
					modelsList: [
						{ name: "Модель 1", channels: ["Батч", "Стриминг"] },
						{ name: "Модель 2", channels: ["Батч"] },
						{ name: "Модель 3" },
					],
				},
			},
			templateVersionId: "tpl-channels",
			atDate: "2025-06-01",
		});

		const breakdown = tasks[0]?.formulaBreakdown?.instanceBreakdown ?? [];
		// Норматив 2: два канала → 2×(0,5+1,5)=4; один канал → 2×0,5=1;
		// без каналов → нейтральный коэффициент 2×1=2.
		expect(breakdown.map((line) => line.total)).toEqual([4, 1, 2]);
		expect(tasks[0]?.total).toBeCloseTo(7, 5);
	});

	it("распределяет скидку по числу моделей на per-model работе", async () => {
		const workId = WORK_WITH_TRIGGER;
		const buildService = () =>
			createService({
				works: [
					{
						id: workId,
						name: "Адаптация и внедрение модели",
						workType: "Типовая",
						archComponentType: "Модель",
					},
				],
				rules: [
					{
						workId,
						streamExecutor: STREAM,
						paramCode: "modelClass",
						paramName: "Класс модели",
						operator: "=",
						valueCode: "A",
						valueLabel: "A",
					},
				],
				assignments: [
					{
						id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
						workId,
						streamExecutor: STREAM,
						isActive: true,
					},
				],
				versionConfigs: [
					{
						workId,
						streamExecutor: STREAM,
						templateVersionId: "tpl-models",
						formula: [
							{ kind: "norm" },
							{ kind: "operator", op: "*" },
							{
								kind: "arch_count_coeff",
								archComponentKind: "model",
								steps: [
									{ count: 1, coefficient: 1 },
									{ count: 2, coefficient: 1.75 },
									{ count: 3, coefficient: 2.5 },
								],
							},
						],
						formulaText: null,
						roundingMode: "none",
						roundingStep: null,
						calculationLogic: null,
					},
				],
			});

		const run = (modelsList: Array<Record<string, unknown>>) =>
			buildService().buildCatalogTasks({
				archComponentType: "Модель",
				streamExecutor: STREAM,
				source: { modelClass: "A" },
				formData: { detailInfo: { modelsList } },
				templateVersionId: "tpl-models",
				atDate: "2025-06-01",
			});

		const one = await run([{ name: "М1", modelClass: "A" }]);
		const two = await run([
			{ name: "М1", modelClass: "A" },
			{ name: "М2", modelClass: "A" },
		]);

		// Норматив 2 чд. Архкоэф задаёт множитель на весь набор моделей,
		// поэтому за 2 модели платится 1.75 норматива, а не 2 полных.
		expect(one[0]?.total).toBeCloseTo(2, 5);
		expect(two[0]?.total).toBeCloseTo(3.5, 5);
		expect(two[0]?.formulaBreakdown?.expanded).toContain(
			"1.75 (М1) + 1.75 (М2) = 3.5",
		);
	});

	it("uses computed overallUncertainty from uncertaintyCalculation in formula total", async () => {
		const service = createService({
			rules: [
				{
					workId: WORK_WITH_TRIGGER,
					streamExecutor: STREAM,
					paramCode: "type",
					paramName: "Тип источника",
					operator: "eq",
					valueCode: "internal",
					valueLabel: "Внутренний",
				},
			],
			laborRows: [
				{
					workId: WORK_WITH_TRIGGER,
					streamExecutor: STREAM,
					paramCode: "overallUncertainty",
					paramName: "Общая неопределённость",
					valueCode: "default",
					valueLabel: "По умолчанию",
					coefficient: "2",
				},
			],
			versionConfigs: [
				{
					workId: WORK_WITH_TRIGGER,
					streamExecutor: STREAM,
					templateVersionId: "tpl-v1",
					formula: [
						{ kind: "norm" },
						{ kind: "param_coeff", paramCode: "overallUncertainty" },
					],
					formulaText: null,
					roundingMode: "none",
					roundingStep: null,
					calculationLogic: null,
				},
			],
		});

		const withoutUncertainty = await service.buildCatalogTasks({
			archComponentType: "Система-источник",
			streamExecutor: STREAM,
			source: { type: "Внутренний" },
			formData: {},
			templateVersionId: "tpl-v1",
			atDate: "2025-06-01",
		});
		const withUncertainty = await service.buildCatalogTasks({
			archComponentType: "Система-источник",
			streamExecutor: STREAM,
			source: { type: "Внутренний" },
			formData: {
				uncertaintyCalculation: {
					riskGroup: { sanctions: "Средний" },
					uncertaintyAdjustment: 10,
				},
			},
			templateVersionId: "tpl-v1",
			atDate: "2025-06-01",
		});

		expect(withoutUncertainty[0]?.total).toBe(2);
		expect(withoutUncertainty[0]?.coefficient).toBe(1);
		expect(withUncertainty[0]?.total).toBeCloseTo(2 * 1.15, 5);
		expect(withUncertainty[0]?.coefficient).toBeCloseTo(1.15, 5);
	});

	/**
	 * Заводской блок ПиРМ ищет работы по legacy-подписи «ПиРМ», а назначение
	 * работы, созданной из конструктора, пишется кодом стрима из каталога.
	 * Если scope блока не покрывает код, добавленная работа не выводится.
	 */
	it("finds work assigned by stream code when block uses legacy stream label", async () => {
		const workId = WORK_WITH_TRIGGER;
		const modelServiceField = "field_o_HRj6VO";
		const service = createService({
			works: [
				{
					id: workId,
					name: "Работа на модельный сервис",
					workType: "Типовая",
					archComponentType: "Модельный сервис",
				},
			],
			rules: [
				{
					workId,
					streamExecutor: "pirm",
					paramCode: modelServiceField,
					paramName: "Необходимость пилота (MVP)",
					operator: "=",
					valueCode: "true",
					valueLabel: "Да",
				},
			],
			assignments: [
				{
					id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
					workId,
					streamExecutor: "pirm",
					isActive: true,
				},
			],
			norms: [
				{
					workId,
					streamExecutor: "pirm",
					normValue: "5",
					validFrom: "2025-01-01",
					validTo: null,
				},
			],
		});

		const tasks = await service.buildCatalogTasks({
			archComponentType: "Система-источник",
			streamExecutor: "ПиРМ",
			source: { [modelServiceField]: true },
			formData: {
				generalInfo: { modelService: [{ [modelServiceField]: true }] },
			},
			templateVersionId: null,
			atDate: "2026-08-01",
			allowedWorkIds: [workId],
			worksCatalogAllArchComponents: true,
		});

		expect(tasks.map((task) => task.workId)).toEqual([workId]);
		expect(tasks[0]?.total).toBe(5);
	});
});

describe("устаревшая привязка блока (boundWorkIds)", () => {
	const BOUND_STREAM = "pirm";
	const TRIGGER_FIELD = "field_trigger";
	const LIVE_IDS = [
		"aaaaaaaa-1111-1111-1111-111111111111",
		"bbbbbbbb-2222-2222-2222-222222222222",
		"cccccccc-3333-3333-3333-333333333333",
	];
	const STALE_IDS = [
		"dddddddd-4444-4444-4444-444444444444",
		"eeeeeeee-5555-5555-5555-555555555555",
	];

	const workRows = LIVE_IDS.map((id) => ({
		id,
		name: `Работа ${id.slice(0, 4)}`,
		workType: "Типовая",
		archComponentType: "Модельный сервис",
		templateId: null,
	}));

	/**
	 * Отличить протухший id от снятого назначения можно только через
	 * существование работы, поэтому мок обязан уважать where.id = In([...]).
	 */
	function workRepo() {
		return {
			find: jest.fn(async (options?: { where?: Record<string, unknown> }) => {
				const wanted = (options?.where?.id as { _value?: string[] } | undefined)
					?._value;
				return wanted
					? workRows.filter((row) => wanted.includes(row.id))
					: workRows;
			}),
		};
	}

	function buildService() {
		return new V2TypicalWorkRuntimeService(
			workRepo() as never,
			repo(
				LIVE_IDS.map((id) => ({
					workId: id,
					streamExecutor: BOUND_STREAM,
					normValue: "5",
					validFrom: "2025-01-01",
					validTo: null,
				})),
			) as never,
			repo(
				LIVE_IDS.map((id) => ({
					workId: id,
					streamExecutor: BOUND_STREAM,
					paramCode: TRIGGER_FIELD,
					paramName: "Триггер",
					operator: "=",
					valueCode: "true",
					valueLabel: "Да",
				})),
			) as never,
			repo([]) as never,
			repo([]) as never,
			repo(
				LIVE_IDS.map((id, index) => ({
					id: `assignment-${index}`,
					workId: id,
					streamExecutor: BOUND_STREAM,
					isActive: true,
				})),
			) as never,
			repo([]) as never,
			{ findOne: jest.fn(async () => null) } as never,
			{ listTriggerStatusCatalog: jest.fn(async () => []) } as never,
			{
				getCatalog: jest.fn(async () => []),
				getCachedCatalog: jest.fn(() => []),
			} as never,
		);
	}

	const buildTasks = (allowedWorkIds: string[] | undefined) =>
		buildService().buildCatalogTasks({
			archComponentType: "Система-источник",
			streamExecutor: "ПиРМ",
			source: { [TRIGGER_FIELD]: true },
			formData: { [TRIGGER_FIELD]: true },
			templateVersionId: null,
			atDate: "2026-08-01",
			allowedWorkIds,
			worksCatalogAllArchComponents: true,
		});

	it("сохраняет намеренно суженную привязку, когда все id живы", async () => {
		const tasks = await buildTasks([LIVE_IDS[0] as string]);
		expect(tasks.map((task) => task.workId)).toEqual([LIVE_IDS[0]]);
	});

	it("не теряет работы стрима, когда привязка протухла частично", async () => {
		// Пересид каталога выдаёт работам новые uuid. Если довериться уцелевшему
		// хвосту привязки, остальные назначенные работы молча пропадут из блока —
		// это и есть баг «заводская работа не появляется в блоке стрима».
		const tasks = await buildTasks([LIVE_IDS[0] as string, ...STALE_IDS]);
		expect(tasks.map((task) => task.workId).sort()).toEqual([...LIVE_IDS].sort());
	});

	it("не теряет работы стрима, когда привязка протухла полностью", async () => {
		const tasks = await buildTasks([...STALE_IDS]);
		expect(tasks.map((task) => task.workId).sort()).toEqual([...LIVE_IDS].sort());
	});
});
