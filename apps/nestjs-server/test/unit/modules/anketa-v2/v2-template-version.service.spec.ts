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

describe("V2TemplateVersionService.update", () => {
	it("syncs typical works catalog logic from uiSchema boundWorkIds on save", async () => {
		const templateWorkId = "7147da4f-b4cd-445e-8ac3-838c4b106ca7";
		const versionRow = {
			id: "version-1",
			templateId: "template-1",
			versionNumber: 1,
			status: "draft",
			jsonSchema: { type: "object" },
			uiSchema: {
				detailInfo: {
					"ui:options": {
						streamBlock: true,
						streamExecutor: "Модельный стрим",
					},
					detailTypicalTasks: {
						"ui:options": {
							archComponent: "typicalWork",
							streamExecutor: "Модельный стрим",
							boundWorkIds: [templateWorkId],
						},
					},
				},
			},
			logic: {
				rules: [
					{
						id: "typical-works-catalog-detailInfo-detailTypicalTasks",
						kind: "task_trigger",
						targetPath: "/detailInfo/detailTypicalTasks",
						condition: true,
						dependencies: [],
						payload: {
							mode: "generated_rows",
							worksCatalog: true,
							worksCatalogStream: "Модельный стрим",
							outputArrayPath: "detailInfo.detailTypicalTasks",
							allowedWorkIds: [
								"f8e3a1b2-4c5d-6e7f-8a9b-0c1d2e3f4004",
							],
						},
					},
					{
						id: "unified-typical-row-total:detailInfo_detailTypicalTasks",
						kind: "row_computed",
						targetPath: "/detailInfo/detailTypicalTasks",
						condition: true,
						dependencies: [],
						payload: {
							arrayPath: "detailInfo.detailTypicalTasks",
							fieldVar: "total",
						},
					},
					{
						id: "unified-typical-total",
						kind: "computed",
						targetPath: "/summary/typicalTotal",
						condition: true,
						dependencies: [],
						payload: {},
					},
				],
			},
		};

		const versionRepository = {
			findOne: jest.fn(async () => ({ ...versionRow })),
			save: jest.fn(async (row) => row),
		};
		const service = new V2TemplateVersionService(
			versionRepository as never,
			{} as never,
			{ assertTemplateExists: jest.fn() } as never,
			{} as never,
			{} as never,
			{} as never,
		);

		await service.update("version-1", {}, "user-1");

		const saved = versionRepository.save.mock.calls[0]?.[0] as {
			logic: { rules: Array<{ payload?: Record<string, unknown> }> };
		};
		const catalogRule = saved.logic.rules.find(
			(rule) => rule.payload?.outputArrayPath === "detailInfo.detailTypicalTasks",
		);
		expect(catalogRule?.payload?.allowedWorkIds).toEqual([templateWorkId]);
		expect(catalogRule?.payload?.sourceArrayPath).toBe("generalInfo.modelService");
	});
});
