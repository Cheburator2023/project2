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
	}>;
	laborParams?: Array<{
		workId: string;
		streamExecutor: string;
		paramCode: string;
		paramName?: string | null;
		kind: string;
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
}) {
	const workRepository = repo([
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
	]);
	const normRepository = repo([
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
	]);
	const ruleRepository = repo(rules);
	const laborRepository = repo(laborRows);
	const laborParamRepository = repo(laborParams);
	const assignmentRepository = repo(assignments);
	const versionConfigRepository = repo(versionConfigs);
	const templateVersionRepository = {
		findOne: jest.fn(async () => null),
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
});
