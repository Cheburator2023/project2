import { V2TemplateVersionService } from "../../../../src/modules/anketa-v2/services/v2-template-version.service";

describe("V2TemplateVersionService.createDraftFromDefault", () => {
	it("returns draft before background typical works seed completes", async () => {
		let resolveSeed: (value: number) => void = () => {};
		const seedPromise = new Promise<number>((resolve) => {
			resolveSeed = resolve;
		});

		const versionRepository = {
			findOne: jest.fn(async () => null),
			save: jest.fn(async (row) => ({
				...row,
				id: "version-1",
				versionNumber: 1,
				status: "draft",
			})),
			create: jest.fn((row) => row),
			count: jest.fn(async () => 0),
		};
		const templateRepository = {
			findOne: jest.fn(async () => ({ id: "template-1" })),
		};
		const factorySnapshotService = {
			getEffectiveSnapshot: jest.fn(async () => ({
				jsonSchema: { type: "object" },
				uiSchema: {},
				logic: { rules: [] },
				dictionariesSnapshot: null,
				releaseNotes: null,
			})),
		};
		const typicalWorkSeedService = {
			seedTemplateTypicalWorksFromFactorySnapshot: jest
				.fn()
				.mockReturnValue(seedPromise),
		};
		const typicalWorkWriteService = {
			reconcileAllSchemaFieldsForVersion: jest.fn(async () => ({
				worksMatched: 0,
				worksUpdated: 0,
				rulesUpdated: 0,
				rulesRemoved: 0,
				laborParamsUpdated: 0,
				laborParamsRemoved: 0,
				formulasInvalidated: 0,
				fieldsProcessed: 0,
				consistencyIssues: [],
			})),
		};

		const service = new V2TemplateVersionService(
			versionRepository as never,
			templateRepository as never,
			{ assertTemplateExists: jest.fn() } as never,
			factorySnapshotService as never,
			typicalWorkSeedService as never,
			typicalWorkWriteService as never,
		);

		const resultPromise = service.createDraftFromDefault("template-1", "user-1");
		const version = await resultPromise;

		expect(version.id).toBe("version-1");
		expect(
			typicalWorkSeedService.seedTemplateTypicalWorksFromFactorySnapshot,
		).toHaveBeenCalledWith("template-1", "version-1");
		expect(
			typicalWorkWriteService.reconcileAllSchemaFieldsForVersion,
		).not.toHaveBeenCalled();

		resolveSeed(83);
		await seedPromise;
		await new Promise((resolve) => setImmediate(resolve));

		expect(
			typicalWorkWriteService.reconcileAllSchemaFieldsForVersion,
		).toHaveBeenCalledWith("version-1", "apply", {
			skipConsistencyReport: true,
		});
	});
});
