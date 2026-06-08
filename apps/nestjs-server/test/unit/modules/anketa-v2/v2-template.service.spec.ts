import { ConflictException } from "@nestjs/common";
import type { Repository } from "typeorm";
import { V2QuestionnaireEntity } from "../../../../src/modules/anketa-v2/entities/v2-questionnaire.entity";
import { V2TemplateEntity } from "../../../../src/modules/anketa-v2/entities/v2-template.entity";
import { V2TemplateVersionEntity } from "../../../../src/modules/anketa-v2/entities/v2-template-version.entity";
import { V2TemplateService } from "../../../../src/modules/anketa-v2/services/v2-template.service";
import type { V2AuditService } from "../../../../src/modules/anketa-v2/services/v2-audit.service";

function version(
	id: string,
	templateId: string,
	versionNumber: number,
	status: "draft" | "published" | "archived" = "draft",
): V2TemplateVersionEntity {
	const now = new Date();
	return {
		id,
		templateId,
		versionNumber,
		status,
		createdAt: now,
		updatedAt: now,
		publishedAt: null,
	} as V2TemplateVersionEntity;
}

function templateEntity(
	id: string,
	currentVersionId: string | null = null,
): V2TemplateEntity {
	return {
		id,
		code: `tpl-${id.slice(0, 8)}`,
		name: "Test template",
		currentVersionId,
		createdAt: new Date(),
		updatedAt: new Date(),
	} as V2TemplateEntity;
}

describe("V2TemplateService", () => {
	const templateId = "11111111-1111-4111-8111-111111111111";
	const currentVersionId = "22222222-2222-4222-8222-222222222222";
	const otherVersionId = "33333333-3333-4333-8333-333333333333";

	let templateRepository: jest.Mocked<
		Pick<
			Repository<V2TemplateEntity>,
			"findOne" | "createQueryBuilder" | "find" | "update"
		>
	> & { manager: { transaction: jest.Mock } };
	let versionRepository: jest.Mocked<
		Pick<Repository<V2TemplateVersionEntity>, "find" | "delete">
	>;
	let questionnaireRepository: jest.Mocked<
		Pick<Repository<V2QuestionnaireEntity>, "find" | "count">
	>;
	let auditService: jest.Mocked<Pick<V2AuditService, "deleteForVersionIds" | "deleteForTemplate">>;
	let service: V2TemplateService;
	let emFind: jest.Mock;
	let emUpdate: jest.Mock;
	let emDelete: jest.Mock;

	beforeEach(() => {
		emFind = jest.fn().mockResolvedValue([]);
		emUpdate = jest.fn();
		emDelete = jest.fn();

		templateRepository = {
			findOne: jest.fn(),
			createQueryBuilder: jest.fn(),
			find: jest.fn(),
			update: jest.fn(),
			manager: {
				transaction: jest.fn(async (cb) =>
					cb({
						find: emFind,
						update: emUpdate,
						delete: emDelete,
						remove: jest.fn(),
					}),
				),
			},
		} as never;

		versionRepository = {
			find: jest.fn(),
			delete: jest.fn(),
		} as never;

		questionnaireRepository = {
			find: jest.fn(),
			count: jest.fn(),
		} as never;

		auditService = {
			deleteForVersionIds: jest.fn(),
			deleteForTemplate: jest.fn(),
		} as never;

		service = new V2TemplateService(
			templateRepository as never,
			versionRepository as never,
			questionnaireRepository as never,
			auditService as never,
		);
	});

	describe("bulkDeleteVersions", () => {
		beforeEach(() => {
			templateRepository.findOne.mockResolvedValue(
				templateEntity(templateId, currentVersionId),
			);
			templateRepository.createQueryBuilder.mockReturnValue({
				select: jest.fn().mockReturnThis(),
				where: jest.fn().mockReturnThis(),
				getMany: jest.fn().mockResolvedValue([{ currentVersionId }]),
				getOne: jest.fn(),
			} as never);
			versionRepository.find.mockResolvedValue([
				version(currentVersionId, templateId, 2, "published"),
				version(otherVersionId, templateId, 1, "published"),
			]);
		});

		it("удаляет все версии кроме актуальной схемы системы", async () => {
			const result = await service.bulkDeleteVersions(templateId);

			expect(result.deletedVersionIds).toEqual([otherVersionId]);
			expect(result.skippedCurrentVersionId).toBe(currentVersionId);
			expect(result.reboundQuestionnaireCount).toBe(0);
			expect(result.snapshot).toHaveLength(1);
			expect(auditService.deleteForVersionIds).toHaveBeenCalledWith([
				otherVersionId,
			]);
		});

		it("перепривязывает анкеты перед удалением версий", async () => {
			emFind.mockResolvedValue([
				{
					id: "44444444-4444-4444-8444-444444444444",
					boundTemplateVersionId: otherVersionId,
				},
			]);

			const result = await service.bulkDeleteVersions(templateId, [
				otherVersionId,
			]);

			expect(result.deletedVersionIds).toEqual([otherVersionId]);
			expect(result.reboundQuestionnaireCount).toBe(1);
			expect(emUpdate).toHaveBeenCalled();
		});

		it("возвращает пустой результат, если к удалению только актуальная версия", async () => {
			const result = await service.bulkDeleteVersions(templateId, [
				currentVersionId,
			]);

			expect(result.deletedVersionIds).toEqual([]);
			expect(result.skippedCurrentVersionId).toBe(currentVersionId);
			expect(auditService.deleteForVersionIds).not.toHaveBeenCalled();
		});
	});

	describe("deleteWithSnapshot", () => {
		it("запрещает удаление шаблона с актуальной схемой системы", async () => {
			templateRepository.findOne.mockResolvedValue(
				templateEntity(templateId, currentVersionId),
			);

			await expect(service.deleteWithSnapshot(templateId)).rejects.toBeInstanceOf(
				ConflictException,
			);
		});

		it("удаляет шаблон вместе с привязанными анкетами", async () => {
			templateRepository.findOne.mockResolvedValue(templateEntity(templateId));
			versionRepository.find.mockResolvedValue([
				version(otherVersionId, templateId, 1),
			]);
			templateRepository.createQueryBuilder.mockReturnValue({
				select: jest.fn().mockReturnThis(),
				where: jest.fn().mockReturnThis(),
				getMany: jest.fn().mockResolvedValue([]),
				getOne: jest.fn(),
			} as never);

			const snapshot = await service.deleteWithSnapshot(templateId);

			expect(snapshot.template.id).toBe(templateId);
			expect(emDelete).toHaveBeenCalledWith(
				V2QuestionnaireEntity,
				{ templateId },
			);
		});
	});
});
