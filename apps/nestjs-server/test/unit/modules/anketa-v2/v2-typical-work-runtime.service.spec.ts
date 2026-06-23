import { V2TypicalWorkRuntimeService } from "../../../../src/modules/anketa-v2/services/v2-typical-work-runtime.service";

type MockRepository<T> = {
	find: jest.Mock<Promise<T[]>, [unknown?]>;
};

function repo<T>(rows: T[]): MockRepository<T> {
	return {
		find: jest.fn(async () => rows),
	};
}

function createService({
	rules,
}: {
	rules: Array<{
		workId: string;
		streamExecutor: string;
		paramCode: string;
		paramName: string | null;
		operator: "=" | "!=" | ">=" | "<=" | ">" | "<";
		valueCode: string | null;
		valueLabel: string | null;
	}>;
}) {
	const workRepository = repo([
		{
			id: "11111111-1111-1111-1111-111111111111",
			name: "Работа с триггером",
			workType: "Типовая",
			archComponentType: "Система-источник",
		},
		{
			id: "22222222-2222-2222-2222-222222222222",
			name: "Работа без триггеров",
			workType: "Типовая",
			archComponentType: "Система-источник",
		},
	]);
	const normRepository = repo([
		{
			workId: "11111111-1111-1111-1111-111111111111",
			streamExecutor: "ИД. Внутренний",
			normValue: "2",
			validFrom: "2025-01-01",
			validTo: null,
		},
		{
			workId: "22222222-2222-2222-2222-222222222222",
			streamExecutor: "ИД. Внутренний",
			normValue: "3",
			validFrom: "2025-01-01",
			validTo: null,
		},
	]);
	const ruleRepository = repo(rules);
	const laborRepository = repo([]);
	const versionConfigRepository = repo([]);
	const paramCatalogService = {
		listTriggerStatusCatalog: jest.fn(async () => []),
	};

	return new V2TypicalWorkRuntimeService(
		workRepository as never,
		normRepository as never,
		ruleRepository as never,
		laborRepository as never,
		versionConfigRepository as never,
		paramCatalogService as never,
	);
}

describe("V2TypicalWorkRuntimeService", () => {
	it("includes work only when all trigger rules match and excludes works without triggers", async () => {
		const service = createService({
			rules: [
				{
					workId: "11111111-1111-1111-1111-111111111111",
					streamExecutor: "ИД. Внутренний",
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
			streamExecutor: "ИД. Внутренний",
			source: { type: "Внутренний" },
			templateVersionId: null,
			atDate: "2025-06-01",
		});
		const notMatched = await service.buildCatalogTasks({
			archComponentType: "Система-источник",
			streamExecutor: "ИД. Внутренний",
			source: { type: "Внешний" },
			templateVersionId: null,
			atDate: "2025-06-01",
		});

		expect(matched.map((task) => task.workId)).toEqual([
			"11111111-1111-1111-1111-111111111111",
		]);
		expect(notMatched).toEqual([]);
	});

	it("supports numeric trigger operators in runtime task generation", async () => {
		const service = createService({
			rules: [
				{
					workId: "11111111-1111-1111-1111-111111111111",
					streamExecutor: "ИД. Внутренний",
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
			streamExecutor: "ИД. Внутренний",
			source: { metricCount: 12 },
			templateVersionId: null,
			atDate: "2025-06-01",
		});
		const notMatched = await service.buildCatalogTasks({
			archComponentType: "Система-источник",
			streamExecutor: "ИД. Внутренний",
			source: { metricCount: 8 },
			templateVersionId: null,
			atDate: "2025-06-01",
		});

		expect(matched).toHaveLength(1);
		expect(notMatched).toHaveLength(0);
	});
});
