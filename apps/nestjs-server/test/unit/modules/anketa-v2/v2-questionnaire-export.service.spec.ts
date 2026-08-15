import { ServiceUnavailableException } from "@nestjs/common";
import { V2QuestionnaireService } from "../../../../src/modules/anketa-v2/services/v2-questionnaire.service";
import type { V2QuestionnaireEntity } from "../../../../src/modules/anketa-v2/entities/v2-questionnaire.entity";

function entity(id: string, index: number): V2QuestionnaireEntity {
	return {
		id,
		calcName: `Анкета ${index}`,
		status: "active",
		version: "1",
		seriesId: `s${index}`,
		parentQuestionnaireId: null,
		readableId: `R-${index}`,
		templateId: "template-1",
		boundTemplateVersionId: "version-1",
		formData: {
			detailInfo: {
				sourceSystems: [{ name: `src-${index}`, type: "Внутренний" }],
			},
		},
		finalCoefficient: 1,
		author: "Автор",
		createdAt: new Date("2026-01-01T00:00:00.000Z"),
		updatedAt: new Date("2026-01-01T00:00:00.000Z"),
	};
}

function createService(rows: V2QuestionnaireEntity[]) {
	const byId = new Map(rows.map((row) => [row.id, row]));
	const questionnaireRepository = {
		find: jest.fn(async (opts?: { where?: { id?: { value?: string[] } } }) => {
			const ids = opts?.where?.id?.value;
			if (!ids) {
				throw new Error("export must not load all questionnaires at once");
			}
			return ids.map((id) => byId.get(id)).filter(Boolean);
		}),
		createQueryBuilder: jest.fn(() => ({
			select: jest.fn().mockReturnThis(),
			orderBy: jest.fn().mockReturnThis(),
			andWhere: jest.fn().mockReturnThis(),
			getRawMany: jest.fn(async () => rows.map((row) => ({ id: row.id }))),
		})),
	};
	const templateRepository = {
		find: jest.fn(async () => [
			{
				id: "template-1",
				code: "t",
				name: "Шаблон",
				currentVersionId: "version-1",
			},
		]),
		findOne: jest.fn(),
	};
	const versionRepository = {
		find: jest.fn(async () => [
			{
				id: "version-1",
				versionNumber: 1,
				status: "published",
				createdAt: new Date("2025-12-01T00:00:00.000Z"),
				updatedAt: new Date("2025-12-01T00:00:00.000Z"),
				jsonSchema: { type: "object", properties: {} },
				uiSchema: {},
			},
		]),
		findOne: jest.fn(),
	};
	const service = new V2QuestionnaireService(
		questionnaireRepository as never,
		templateRepository as never,
		versionRepository as never,
		{} as never,
		{} as never,
		{
			getStreamFilterSetting: jest.fn(async () => ({ enabled: false })),
		} as never,
	);
	return { service, questionnaireRepository };
}

describe("V2QuestionnaireService.exportRegistryXlsx", () => {
	it("exports every id from the registry query, not a page of 50", async () => {
		const rows = Array.from({ length: 3 }, (_, index) =>
			entity(`q-${index}`, index),
		);
		const { service, questionnaireRepository } = createService(rows);

		const exported = await service.exportRegistryXlsx();
		try {
			expect(exported.rowCount).toBe(3);
			expect(questionnaireRepository.createQueryBuilder).toHaveBeenCalled();
			expect(questionnaireRepository.find).toHaveBeenCalled();
			for (const call of questionnaireRepository.find.mock.calls) {
				expect(call[0]).toEqual(expect.objectContaining({ where: expect.anything() }));
			}
		} finally {
			await exported.cleanup();
		}
	});

	it("stops with 503 instead of growing heap past the export cap", async () => {
		const prev = process.env.V2_EXPORT_HEAP_MB_MAX;
		process.env.V2_EXPORT_HEAP_MB_MAX = "1";
		try {
			const { service } = createService([entity("q-0", 0)]);
			await expect(service.exportRegistryXlsx()).rejects.toBeInstanceOf(
				ServiceUnavailableException,
			);
		} finally {
			if (prev == null) delete process.env.V2_EXPORT_HEAP_MB_MAX;
			else process.env.V2_EXPORT_HEAP_MB_MAX = prev;
		}
	});
});
