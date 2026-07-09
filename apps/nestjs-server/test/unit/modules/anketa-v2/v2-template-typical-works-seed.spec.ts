import { V2TypicalWorkSeedService } from "../../../../src/modules/anketa-v2/services/v2-typical-work.service";

describe("V2TypicalWorkSeedService.seedTemplateTypicalWorksFromDocCatalog", () => {
	it("skips catalog import when template already has works", async () => {
		const workRepository = {
			count: jest.fn(async () => 3),
			find: jest.fn(),
			save: jest.fn(),
			create: jest.fn((row) => row),
		};
		const versionConfigRepository = {
			findOne: jest.fn(),
			save: jest.fn(),
			create: jest.fn((row) => row),
		};
		const assignmentRepository = {
			find: jest.fn(async () => [
				{ workId: "w1", streamExecutor: "Источники данных" },
			]),
			findOne: jest.fn(),
			save: jest.fn(),
			create: jest.fn((row) => row),
		};

		const service = new V2TypicalWorkSeedService(
			workRepository as never,
			{ save: jest.fn(), create: jest.fn() } as never,
			{ save: jest.fn(), create: jest.fn() } as never,
			{ save: jest.fn(), create: jest.fn() } as never,
			assignmentRepository as never,
			versionConfigRepository as never,
			{ findOne: jest.fn() } as never,
			{ findOne: jest.fn() } as never,
			{
				ensureSeededFromDocCatalog: jest.fn(),
				listParameters: jest.fn(),
			} as never,
		);

		workRepository.find.mockResolvedValue([{ id: "w1" }]);

		const created = await service.seedTemplateTypicalWorksFromDocCatalog(
			"template-1",
			"version-1",
		);

		expect(created).toBe(0);
		expect(workRepository.save).not.toHaveBeenCalled();
		expect(versionConfigRepository.save).toHaveBeenCalled();
	});
});
