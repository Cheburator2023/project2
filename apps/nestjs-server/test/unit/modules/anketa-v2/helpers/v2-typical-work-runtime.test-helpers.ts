import { V2TypicalWorkRuntimeService } from "../../../../../src/modules/anketa-v2/services/v2-typical-work-runtime.service";

type MockRepository<T> = {
	find: jest.Mock<Promise<T[]>, [unknown?]>;
};

function repo<T>(rows: T[]): MockRepository<T> {
	return {
		find: jest.fn(async () => rows),
	};
}

export type InMemoryTypicalWorkRuntimeFixture = {
	workId: string;
	streamExecutor: string;
	templateVersionId: string;
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
	normValue?: string;
	workName?: string;
};

export function createInMemoryTypicalWorkRuntime(
	fixture: InMemoryTypicalWorkRuntimeFixture,
): V2TypicalWorkRuntimeService {
	const {
		workId,
		streamExecutor,
		rules,
		laborParams = [],
		laborRows = [],
		versionConfigs = [],
		normValue = "1.5",
		workName = "Тестовая работа",
	} = fixture;

	const workRepository = repo([
		{
			id: workId,
			name: workName,
			workType: "Типовая",
			archComponentType: "Система-источник",
		},
	]);
	const normRepository = repo([
		{
			workId,
			streamExecutor,
			normValue,
			validFrom: "2025-01-01",
			validTo: null,
		},
	]);
	const ruleRepository = repo(rules);
	const laborRepository = repo(laborRows);
	const laborParamRepository = repo(laborParams);
	const assignmentRepository = repo([
		{
			id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
			workId,
			streamExecutor,
			isActive: true,
		},
	]);
	const versionConfigRepository = repo(versionConfigs);
	const paramCatalogService = {
		listTriggerStatusCatalog: jest.fn(async () => []),
	};

	return new V2TypicalWorkRuntimeService(
		workRepository as never,
		normRepository as never,
		ruleRepository as never,
		laborRepository as never,
		laborParamRepository as never,
		assignmentRepository as never,
		versionConfigRepository as never,
		paramCatalogService as never,
	);
}

export const SOURCE_CATALOG_TASK_TRIGGER_RULE = {
	id: "test-source-catalog-works",
	kind: "task_trigger" as const,
	targetPath: "/streamDataSources/sourceTypicalTasks",
	condition: true,
	dependencies: ["/detailInfo/sourceSystems"],
	payload: {
		mode: "generated_rows",
		worksCatalog: true,
		worksCatalogArchComponent: "Система-источник",
		worksCatalogStream: "fromSourceType",
		outputArrayPath: "streamDataSources.sourceTypicalTasks",
		sourceArrayPath: "detailInfo.sourceSystems",
	},
};
