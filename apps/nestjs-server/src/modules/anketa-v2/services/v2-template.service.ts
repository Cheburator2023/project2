import { Injectable, NotFoundException, ConflictException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository, type EntityManager } from "typeorm";
import type {
	V2BulkDeleteTemplateVersionsResultDto,
	V2TemplateDeleteSnapshotDto,
	V2TemplateRegistryListResponseDto,
	V2TemplateVersionDto,
} from "@smart-anketa/api-contract";
import { V2QuestionnaireEntity } from "../entities/v2-questionnaire.entity";
import { V2TemplateEntity } from "../entities/v2-template.entity";
import { V2TemplateVersionEntity } from "../entities/v2-template-version.entity";
import type { CreateV2TemplateDto, UpdateV2TemplateDto } from "../dto";
import { V2AuditService } from "./v2-audit.service";
import { V2FactorySnapshotService } from "./v2-factory-snapshot.service";
import {
	buildTemplateDeleteSnapshot,
	mapV2TemplateToDto,
	mapV2TemplateVersionToDto,
	mapV2TemplateVersionSummaryToDto,
} from "../utils/v2-template-mapper.util";

@Injectable()
export class V2TemplateService {
	constructor(
		@InjectRepository(V2TemplateEntity)
		private readonly templateRepository: Repository<V2TemplateEntity>,
		@InjectRepository(V2TemplateVersionEntity)
		private readonly versionRepository: Repository<V2TemplateVersionEntity>,
		@InjectRepository(V2QuestionnaireEntity)
		private readonly questionnaireRepository: Repository<V2QuestionnaireEntity>,
		private readonly auditService: V2AuditService,
		private readonly factorySnapshotService: V2FactorySnapshotService,
	) {}

	private async resolveRebindTargetVersionId(
		templateId: string,
		excludingVersionIds: Set<string>,
		systemCurrentId: string | null,
	): Promise<string | null> {
		const template = await this.templateRepository.findOne({
			where: { id: templateId },
		});
		if (!template) return null;

		if (
			template.currentVersionId &&
			!excludingVersionIds.has(template.currentVersionId)
		) {
			return template.currentVersionId;
		}

		if (systemCurrentId && !excludingVersionIds.has(systemCurrentId)) {
			const systemOnTemplate = await this.versionRepository.findOne({
				where: { id: systemCurrentId, templateId },
			});
			if (systemOnTemplate) return systemCurrentId;
		}

		const remaining = await this.versionRepository.find({
			where: { templateId },
			order: { versionNumber: "DESC" },
		});

		const published = remaining.find(
			(v) => v.status === "published" && !excludingVersionIds.has(v.id),
		);
		if (published) return published.id;

		const any = remaining.find((v) => !excludingVersionIds.has(v.id));
		return any?.id ?? null;
	}

	private async detachQuestionnairesFromVersions(
		em: EntityManager,
		templateId: string,
		versionIdsToDelete: string[],
		excludingVersionIds: Set<string>,
		systemCurrentId: string | null,
	): Promise<{ reboundCount: number; deletedQuestionnaireCount: number }> {
		if (versionIdsToDelete.length === 0) {
			return { reboundCount: 0, deletedQuestionnaireCount: 0 };
		}

		const questionnaires = await em.find(V2QuestionnaireEntity, {
			where: {
				templateId,
				boundTemplateVersionId: In(versionIdsToDelete),
			},
		});

		if (questionnaires.length === 0) {
			return { reboundCount: 0, deletedQuestionnaireCount: 0 };
		}

		const fallbackId = await this.resolveRebindTargetVersionId(
			templateId,
			excludingVersionIds,
			systemCurrentId,
		);

		if (fallbackId) {
			await em.update(
				V2QuestionnaireEntity,
				{
					templateId,
					boundTemplateVersionId: In(versionIdsToDelete),
				},
				{ boundTemplateVersionId: fallbackId },
			);
			return {
				reboundCount: questionnaires.length,
				deletedQuestionnaireCount: 0,
			};
		}

		await em.delete(V2QuestionnaireEntity, {
			id: In(questionnaires.map((q) => q.id)),
		});

		return {
			reboundCount: 0,
			deletedQuestionnaireCount: questionnaires.length,
		};
	}

	/** ID версии, являющейся актуальной схемой системы (если задана). */
	async getSystemCurrentVersionId(): Promise<string | null> {
		const withCurrent = await this.templateRepository
			.createQueryBuilder("t")
			.select(["t.currentVersionId"])
			.where("t.current_version_id IS NOT NULL")
			.getMany();

		if (withCurrent.length === 0) return null;
		if (withCurrent.length === 1) {
			return withCurrent[0].currentVersionId;
		}

		await this.repairDuplicateCurrentTemplates();

		const active = await this.templateRepository
			.createQueryBuilder("t")
			.select(["t.currentVersionId"])
			.where("t.current_version_id IS NOT NULL")
			.getOne();

		return active?.currentVersionId ?? null;
	}

	async findAll(): Promise<V2TemplateEntity[]> {
		await this.repairDuplicateCurrentTemplates();

		return this.templateRepository.find({
			relations: ["currentVersion"],
			order: { createdAt: "DESC" },
		});
	}

	/** Реестр схем: шаблоны + краткие версии одним запросом (без тяжёлых snapshot-полей). */
	async findRegistryList(): Promise<V2TemplateRegistryListResponseDto> {
		await this.repairDuplicateCurrentTemplates();

		const templates = await this.templateRepository.find({
			order: { createdAt: "DESC" },
		});
		if (templates.length === 0) {
			return { items: [] };
		}

		const templateIds = templates.map((template) => template.id);
		const versions = await this.versionRepository.find({
			where: { templateId: In(templateIds) },
			select: {
				id: true,
				templateId: true,
				versionNumber: true,
				status: true,
				releaseNotes: true,
				publishedAt: true,
			},
			order: { versionNumber: "DESC" },
		});

		const versionsByTemplate = new Map<string, ReturnType<typeof mapV2TemplateVersionSummaryToDto>[]>();
		for (const version of versions) {
			const list = versionsByTemplate.get(version.templateId) ?? [];
			list.push(mapV2TemplateVersionSummaryToDto(version));
			versionsByTemplate.set(version.templateId, list);
		}

		return {
			items: templates.map((template) => ({
				...mapV2TemplateToDto(template),
				versions: versionsByTemplate.get(template.id) ?? [],
			})),
		};
	}

	/**
	 * В системе может быть только одна актуальная схема (один шаблон с currentVersionId).
	 * Сбрасывает указатель у всех остальных шаблонов.
	 */
	async setGlobalCurrentVersion(
		templateId: string,
		versionId: string,
		userId: string | null,
	): Promise<void> {
		await this.templateRepository
			.createQueryBuilder()
			.update(V2TemplateEntity)
			.set({ currentVersionId: null, updatedBy: userId })
			.where("id != :templateId", { templateId })
			.andWhere("current_version_id IS NOT NULL")
			.execute();

		await this.templateRepository.update(templateId, {
			currentVersionId: versionId,
			updatedBy: userId,
		});
	}

	/** Починка legacy-данных, когда несколько шаблонов имели currentVersionId. */
	private async repairDuplicateCurrentTemplates(): Promise<void> {
		const withCurrent = await this.templateRepository.find({
			where: {},
			select: ["id", "currentVersionId", "updatedAt"],
		});

		const actives = withCurrent.filter((t) => t.currentVersionId);
		if (actives.length <= 1) return;

		const sorted = [...actives].sort(
			(a, b) => b.updatedAt.getTime() - a.updatedAt.getTime(),
		);
		const demoteIds = sorted.slice(1).map((t) => t.id);

		await this.templateRepository.update(
			{ id: In(demoteIds) },
			{ currentVersionId: null },
		);
	}

	async findOne(id: string): Promise<V2TemplateEntity> {
		const template = await this.templateRepository.findOne({
			where: { id },
			relations: ["currentVersion"],
		});

		if (!template) {
			throw new NotFoundException(`Template with id ${id} not found`);
		}

		return template;
	}

	async findByCode(code: string): Promise<V2TemplateEntity> {
		const template = await this.templateRepository.findOne({
			where: { code },
			relations: ["currentVersion"],
		});

		if (!template) {
			throw new NotFoundException(`Template with code ${code} not found`);
		}

		return template;
	}

	async create(
		dto: CreateV2TemplateDto,
		userId: string | null,
	): Promise<V2TemplateEntity> {
		const existing = await this.templateRepository.findOne({
			where: { code: dto.code },
		});

		if (existing) {
			throw new ConflictException(`Template with code ${dto.code} already exists`);
		}

		const template = this.templateRepository.create({
			...dto,
			createdBy: userId,
			updatedBy: userId,
		});

		return this.templateRepository.save(template);
	}

	async update(
		id: string,
		dto: UpdateV2TemplateDto,
		userId: string | null,
	): Promise<V2TemplateEntity> {
		const template = await this.findOne(id);

		Object.assign(template, dto, { updatedBy: userId });

		return this.templateRepository.save(template);
	}

	async deleteWithSnapshot(id: string): Promise<V2TemplateDeleteSnapshotDto> {
		const template = await this.findOne(id);

		if (template.currentVersionId) {
			throw new ConflictException(
				"Нельзя удалить шаблон с актуальной схемой системы. Сначала назначьте актуальной другую версию.",
			);
		}

		const versions = await this.versionRepository.find({
			where: { templateId: id },
			order: { versionNumber: "ASC" },
		});

		const systemCurrentId = await this.getSystemCurrentVersionId();
		const blocked = versions.find((v) => v.id === systemCurrentId);
		if (blocked) {
			throw new ConflictException(
				"Нельзя удалить шаблон: одна из его версий является актуальной схемой системы.",
			);
		}

		const snapshot = buildTemplateDeleteSnapshot(template, versions);

		await this.factorySnapshotService.clearTemplateReferenceIfMatches({
			templateId: id,
		});

		await this.templateRepository.manager.transaction(async (em) => {
			await em.delete(V2QuestionnaireEntity, { templateId: id });
			await this.auditService.deleteForTemplate(id);
			if (versions.length > 0) {
				await em.update(
					V2TemplateVersionEntity,
					{ templateId: id },
					{ parentVersionId: null },
				);
				await em.delete(V2TemplateVersionEntity, { templateId: id });
			}
			await em.remove(V2TemplateEntity, template);
		});

		return snapshot;
	}

	async restoreFromSnapshot(
		snapshot: V2TemplateDeleteSnapshotDto,
	): Promise<V2TemplateEntity> {
		const existing = await this.templateRepository.findOne({
			where: { id: snapshot.template.id },
		});
		if (existing) {
			throw new ConflictException(
				`Шаблон с id ${snapshot.template.id} уже существует`,
			);
		}

		const codeTaken = await this.templateRepository.findOne({
			where: { code: snapshot.template.code },
		});
		if (codeTaken) {
			throw new ConflictException(
				`Шаблон с кодом ${snapshot.template.code} уже существует`,
			);
		}

		await this.templateRepository.manager.transaction(async (em) => {
			const templateEntity = em.create(V2TemplateEntity, {
				id: snapshot.template.id,
				code: snapshot.template.code,
				name: snapshot.template.name,
				description: snapshot.template.description,
				streamCode: snapshot.template.streamCode,
				currentVersionId: null,
				createdAt: new Date(snapshot.template.createdAt),
				updatedAt: new Date(snapshot.template.updatedAt),
				createdBy: snapshot.template.createdBy,
				updatedBy: snapshot.template.updatedBy,
			});
			await em.save(templateEntity);

			const sorted = [...snapshot.versions].sort(
				(a, b) => a.versionNumber - b.versionNumber,
			);

			for (const v of sorted) {
				const versionEntity = em.create(V2TemplateVersionEntity, {
					id: v.id,
					templateId: v.templateId,
					versionNumber: v.versionNumber,
					status: v.status,
					jsonSchema: v.jsonSchema,
					uiSchema: v.uiSchema,
					logic: v.logic,
					dictionariesSnapshot: v.dictionariesSnapshot,
					releaseNotes: v.releaseNotes,
					parentVersionId: v.parentVersionId,
					createdAt: new Date(v.createdAt),
					updatedAt: new Date(v.updatedAt),
					publishedAt: v.publishedAt ? new Date(v.publishedAt) : null,
					createdBy: v.createdBy,
				});
				await em.save(versionEntity);
			}
		});

		return this.findOne(snapshot.template.id);
	}

	async bulkDeleteVersions(
		templateId: string,
		versionIds?: string[],
	): Promise<V2BulkDeleteTemplateVersionsResultDto> {
		await this.findOne(templateId);

		const systemCurrentId = await this.getSystemCurrentVersionId();
		const allVersions = await this.versionRepository.find({
			where: { templateId },
			order: { versionNumber: "ASC" },
		});

		let candidates = allVersions;
		if (versionIds?.length) {
			const idSet = new Set(versionIds);
			candidates = allVersions.filter((v) => idSet.has(v.id));
		}

		const toDelete = candidates.filter((v) => v.id !== systemCurrentId);
		const skippedCurrentVersionId =
			candidates.find((v) => v.id === systemCurrentId)?.id ?? null;

		if (toDelete.length === 0) {
			return {
				deletedVersionIds: [],
				skippedCurrentVersionId,
				skippedBoundVersionIds: [],
				reboundQuestionnaireCount: 0,
				deletedQuestionnaireCount: 0,
				snapshot: [],
			};
		}

		const snapshot = toDelete.map(mapV2TemplateVersionToDto);
		const deleteIds = toDelete.map((v) => v.id);
		const excludingVersionIds = new Set(deleteIds);

		let reboundQuestionnaireCount = 0;
		let deletedQuestionnaireCount = 0;

		await this.templateRepository.manager.transaction(async (em) => {
			const detached = await this.detachQuestionnairesFromVersions(
				em,
				templateId,
				deleteIds,
				excludingVersionIds,
				systemCurrentId,
			);
			reboundQuestionnaireCount = detached.reboundCount;
			deletedQuestionnaireCount = detached.deletedQuestionnaireCount;

			await this.auditService.deleteForVersionIds(deleteIds);
			await em.update(
				V2TemplateVersionEntity,
				{ id: In(deleteIds) },
				{ parentVersionId: null },
			);
			await em.delete(V2TemplateVersionEntity, { id: In(deleteIds) });
		});

		for (const versionId of deleteIds) {
			await this.factorySnapshotService.clearTemplateReferenceIfMatches({
				templateId,
				versionId,
			});
		}

		return {
			deletedVersionIds: deleteIds,
			skippedCurrentVersionId,
			skippedBoundVersionIds: [],
			reboundQuestionnaireCount,
			deletedQuestionnaireCount,
			snapshot,
		};
	}

	async restoreVersions(
		templateId: string,
		versions: V2TemplateVersionDto[],
	): Promise<void> {
		await this.findOne(templateId);

		const existing = await this.versionRepository.find({
			where: { id: In(versions.map((v) => v.id)) },
		});
		if (existing.length > 0) {
			throw new ConflictException(
				`Версии уже существуют: ${existing.map((v) => v.id).join(", ")}`,
			);
		}

		const sorted = [...versions].sort(
			(a, b) => a.versionNumber - b.versionNumber,
		);

		for (const v of sorted) {
			if (v.templateId !== templateId) {
				throw new ConflictException(
					`Версия ${v.id} не принадлежит шаблону ${templateId}`,
				);
			}
		}

		await this.versionRepository.manager.transaction(async (em) => {
			for (const v of sorted) {
				const versionEntity = em.create(V2TemplateVersionEntity, {
					id: v.id,
					templateId: v.templateId,
					versionNumber: v.versionNumber,
					status: v.status,
					jsonSchema: v.jsonSchema,
					uiSchema: v.uiSchema,
					logic: v.logic,
					dictionariesSnapshot: v.dictionariesSnapshot,
					releaseNotes: v.releaseNotes,
					parentVersionId: v.parentVersionId,
					createdAt: new Date(v.createdAt),
					updatedAt: new Date(v.updatedAt),
					publishedAt: v.publishedAt ? new Date(v.publishedAt) : null,
					createdBy: v.createdBy,
				});
				await em.save(versionEntity);
			}
		});
	}

	async setCurrentVersion(
		templateId: string,
		versionId: string,
		userId: string | null,
	): Promise<V2TemplateEntity> {
		const template = await this.findOne(templateId);
		const version = await this.versionRepository.findOne({
			where: { id: versionId, templateId },
		});

		if (!version) {
			throw new NotFoundException(
				`Version ${versionId} not found for template ${templateId}`,
			);
		}

		await this.setGlobalCurrentVersion(templateId, versionId, userId);

		return this.findOne(templateId);
	}
}
