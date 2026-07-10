import { V2TemplateService } from "../../../../src/modules/anketa-v2/services/v2-template.service";

describe("V2TemplateService.findRegistryList", () => {
	it("returns templates with version summaries without heavy fields", async () => {
		const templateRepository = {
			find: jest.fn(async () => [
				{
					id: "tpl-1",
					code: "c1",
					name: "Schema 1",
					description: null,
					streamCode: null,
					currentVersionId: "ver-1",
					createdAt: new Date("2025-01-01"),
					updatedAt: new Date("2025-01-02"),
					createdBy: null,
					updatedBy: null,
				},
			]),
			createQueryBuilder: jest.fn(() => ({
				select: jest.fn().mockReturnThis(),
				where: jest.fn().mockReturnThis(),
				getMany: jest.fn(async () => []),
				getOne: jest.fn(async () => null),
				update: jest.fn().mockReturnThis(),
				set: jest.fn().mockReturnThis(),
				andWhere: jest.fn().mockReturnThis(),
				execute: jest.fn(async () => undefined),
			})),
			findOne: jest.fn(),
			update: jest.fn(),
		};
		const versionRepository = {
			find: jest.fn(async () => [
				{
					id: "ver-1",
					templateId: "tpl-1",
					versionNumber: 2,
					status: "published",
					releaseNotes: "note",
					publishedAt: new Date("2025-01-03"),
					jsonSchema: { huge: true },
					uiSchema: { huge: true },
					logic: { rules: [{ id: "r1" }] },
				},
			]),
		};

		const service = new V2TemplateService(
			templateRepository as never,
			versionRepository as never,
			{ find: jest.fn() } as never,
			{ log: jest.fn() } as never,
			{ clearTemplateReferenceIfMatches: jest.fn() } as never,
		);

		const result = await service.findRegistryList();

		expect(result.items).toHaveLength(1);
		expect(result.items[0]?.versions).toEqual([
			{
				id: "ver-1",
				templateId: "tpl-1",
				versionNumber: 2,
				status: "published",
				releaseNotes: "note",
				publishedAt: "2025-01-03T00:00:00.000Z",
			},
		]);
		expect(versionRepository.find).toHaveBeenCalledWith(
			expect.objectContaining({
				select: expect.objectContaining({
					id: true,
					templateId: true,
					versionNumber: true,
					status: true,
					releaseNotes: true,
					publishedAt: true,
				}),
			}),
		);
	});
});
