import { V2TypicalWorkWriteService } from "../../../../src/modules/anketa-v2/services/v2-typical-work-write.service";

/**
 * copyWork должен создавать НОВУЮ работу и переносить на неё все дочерние
 * записи (нормы/триггеры/параметры/конфиги версий) с новым workId — это то,
 * что позволяет использовать одну базовую работу в нескольких схемах.
 */
const SOURCE_ID = "11111111-1111-1111-1111-111111111111";
const COPY_ID = "99999999-9999-9999-9999-999999999999";
const STREAM = "Источники данных";
const TARGET_TEMPLATE = "tttttttt-tttt-tttt-tttt-tttttttttttt";

function collectRepo<T extends Record<string, unknown>>(rows: T[]) {
	const saved: Array<Record<string, unknown>> = [];
	return {
		saved,
		find: jest.fn(async () => rows),
		findOne: jest.fn(async (): Promise<Record<string, unknown> | null> => null),
		create: jest.fn((input: Record<string, unknown>) => ({ ...input })),
		save: jest.fn(async (input: Record<string, unknown>) => {
			saved.push(input);
			return input;
		}),
	};
}

describe("V2TypicalWorkWriteService.copyWork", () => {
	it("deep-clones a work into a new template-bound work", async () => {
		const sourceWork = {
			id: SOURCE_ID,
			name: "Уточнение требований",
			archComponentType: "Система-источник",
			workType: "Разработка",
			catalogKey: null,
			templateId: null,
		};

		const workRepo = {
			findOne: jest.fn(async () => sourceWork),
			create: jest.fn((input: Record<string, unknown>) => ({ ...input })),
			save: jest.fn(async (input: Record<string, unknown>) => ({
				...input,
				id: COPY_ID,
			})),
		};

		const assignmentRepo = collectRepo([
			{ id: "a1", workId: SOURCE_ID, streamExecutor: STREAM, isActive: true },
		]);
		// ensureAssignment после клонирования находит уже созданное назначение
		assignmentRepo.findOne = jest.fn(async () => ({ id: "copy-assign" }));

		const normRepo = collectRepo([
			{ id: "n1", workId: SOURCE_ID, streamExecutor: STREAM, normValue: "5", validFrom: "2024-01-01", validTo: null },
		]);
		const ruleRepo = collectRepo([
			{ id: "r1", workId: SOURCE_ID, streamExecutor: STREAM, paramCode: "type", paramName: "Тип", operator: "=", valueCode: "int", valueLabel: "Внутр", valueCodes: null, sortOrder: 0 },
		]);
		const laborRepo = collectRepo([
			{ id: "l1", workId: SOURCE_ID, streamExecutor: STREAM, paramCode: "cnt", paramName: "Кол-во", valueCode: null, valueLabel: null, coefficient: "1.5" },
		]);
		const laborParamRepo = collectRepo([
			{ id: "lp1", workId: SOURCE_ID, streamExecutor: STREAM, paramCode: "cnt", paramName: "Кол-во", kind: "by_value", anyOfValueCodes: null, anyOfValueLabels: null, coeffOn: null, coeffOff: null },
		]);
		const versionConfigRepo = collectRepo([
			{ id: "vc1", workId: SOURCE_ID, templateVersionId: "v1", streamExecutor: STREAM, formula: [], formulaText: "H", roundingMode: "CEIL", roundingStep: null, calculationLogic: null },
		]);

		const getWorkCard = jest.fn(async (id: string, stream: string) => ({
			id,
			name: "Уточнение требований (копия)",
			streamExecutor: stream,
		}));

		const service = new V2TypicalWorkWriteService(
			workRepo as never,
			normRepo as never,
			ruleRepo as never,
			laborRepo as never,
			laborParamRepo as never,
			assignmentRepo as never,
			versionConfigRepo as never,
			{} as never,
			{} as never,
			{ getWorkCard } as never,
			{ waitForSeedInFlight: jest.fn(async () => undefined) } as never,
			{} as never,
		);

		const result = await service.copyWork(SOURCE_ID, {
			templateId: TARGET_TEMPLATE,
			streamExecutor: STREAM,
		});

		// Новая работа привязана к целевой схеме, имя с «(копия)»
		expect(workRepo.create).toHaveBeenCalledWith(
			expect.objectContaining({
				name: "Уточнение требований (копия)",
				archComponentType: "Система-источник",
				templateId: TARGET_TEMPLATE,
				catalogKey: null,
			}),
		);

		// Все дочерние записи перенесены на новый workId
		for (const repo of [normRepo, ruleRepo, laborRepo, laborParamRepo, versionConfigRepo, assignmentRepo]) {
			expect(repo.saved.length).toBeGreaterThan(0);
			for (const row of repo.saved) {
				expect(row.workId).toBe(COPY_ID);
			}
		}

		expect(getWorkCard).toHaveBeenCalledWith(COPY_ID, STREAM);
		expect(result).toEqual(
			expect.objectContaining({ id: COPY_ID, streamExecutor: STREAM }),
		);
	});
});
