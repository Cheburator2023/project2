import {
	Injectable,
	NotFoundException,
	ConflictException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { V2TemplateVersionEntity } from "../entities/v2-template-version.entity";
import { V2TemplateEntity } from "../entities/v2-template.entity";
import { V2TemplateService } from "./v2-template.service";
import type {
	CreateV2TemplateVersionDto,
	PublishV2TemplateVersionDto,
	RollbackV2TemplateVersionDto,
} from "../dto";
import { V2FactorySnapshotService } from "./v2-factory-snapshot.service";
import { V2TypicalWorkSeedService } from "./v2-typical-work.service";
import type { V2TemplateStatus } from "@smart-anketa/api-contract";

@Injectable()
export class V2TemplateVersionService {
	constructor(
		@InjectRepository(V2TemplateVersionEntity)
		private readonly versionRepository: Repository<V2TemplateVersionEntity>,
		@InjectRepository(V2TemplateEntity)
		private readonly templateRepository: Repository<V2TemplateEntity>,
		private readonly templateService: V2TemplateService,
		private readonly factorySnapshotService: V2FactorySnapshotService,
		private readonly typicalWorkSeedService: V2TypicalWorkSeedService,
	) {}

	async findAll(templateId: string): Promise<V2TemplateVersionEntity[]> {
		return this.versionRepository.find({
			where: { templateId },
			order: { versionNumber: "DESC" },
		});
	}

	async findOne(id: string): Promise<V2TemplateVersionEntity> {
		const version = await this.versionRepository.findOne({
			where: { id },
			relations: ["template"],
		});

		if (!version) {
			throw new NotFoundException(`Version with id ${id} not found`);
		}

		return version;
	}

	async findByTemplateAndVersion(
		templateId: string,
		versionNumber: number,
	): Promise<V2TemplateVersionEntity> {
		const version = await this.versionRepository.findOne({
			where: { templateId, versionNumber },
		});

		if (!version) {
			throw new NotFoundException(
				`Version ${versionNumber} not found for template ${templateId}`,
			);
		}

		return version;
	}

	async create(
		templateId: string,
		dto: CreateV2TemplateVersionDto,
		userId: string | null,
	): Promise<V2TemplateVersionEntity> {
		const template = await this.templateRepository.findOne({
			where: { id: templateId },
		});

		if (!template) {
			throw new NotFoundException(`Template with id ${templateId} not found`);
		}

		// Получаем номер следующей версии
		const lastVersion = await this.versionRepository.findOne({
			where: { templateId },
			order: { versionNumber: "DESC" },
		});

		const nextVersionNumber = lastVersion ? lastVersion.versionNumber + 1 : 1;

		// Проверяем parentVersionId если указан
		if (dto.parentVersionId) {
			const parentVersion = await this.versionRepository.findOne({
				where: { id: dto.parentVersionId, templateId },
			});

			if (!parentVersion) {
				throw new NotFoundException(
					`Parent version ${dto.parentVersionId} not found for template ${templateId}`,
				);
			}
		}

		const version = this.versionRepository.create({
			templateId,
			versionNumber: nextVersionNumber,
			status: "draft",
			...dto,
			createdBy: userId,
		});

		return this.versionRepository.save(version);
	}

	async update(
		id: string,
		dto: Partial<CreateV2TemplateVersionDto>,
		userId: string | null,
	): Promise<V2TemplateVersionEntity> {
		const version = await this.findOne(id);

		if (version.status !== "draft") {
			throw new ConflictException(
				`Only draft versions can be updated. Current status: ${version.status}`,
			);
		}

		Object.assign(version, dto, { updatedBy: userId });

		return this.versionRepository.save(version);
	}

	async publish(
		id: string,
		dto: PublishV2TemplateVersionDto,
		userId: string | null,
	): Promise<V2TemplateVersionEntity> {
		const version = await this.findOne(id);

		if (version.status !== "draft") {
			throw new ConflictException(
				`Only draft versions can be published. Current status: ${version.status}`,
			);
		}

		version.status = "published";
		version.publishedAt = new Date();
		if (dto.releaseNotes) {
			version.releaseNotes = dto.releaseNotes;
		}

		const updatedVersion = await this.versionRepository.save(version);

		await this.templateService.setGlobalCurrentVersion(
			version.templateId,
			id,
			userId,
		);

		return updatedVersion;
	}

	async archive(id: string): Promise<V2TemplateVersionEntity> {
		const version = await this.findOne(id);

		if (version.status === "archived") {
			throw new ConflictException(`Version is already archived`);
		}

		version.status = "archived";

		return this.versionRepository.save(version);
	}

	/**
	 * Создаёт новую версию из заводского снимка и сразу публикует её (текущая схема шаблона).
	 * После публикации добавляет черновик — копию опубликованной версии — чтобы редактор схемы
	 * мог сразу показать активный черновик (иначе только published и UI пишет «Нет активного черновика»).
	 */
	/** Черновик из заводского эталона без публикации (для новой схемы). */
	async createDraftFromDefault(
		templateId: string,
		userId: string | null,
	): Promise<V2TemplateVersionEntity> {
		const snap = await this.factorySnapshotService.getEffectiveSnapshot();
		const version = await this.create(
			templateId,
			{
				jsonSchema: structuredClone(snap.jsonSchema),
				uiSchema: structuredClone(snap.uiSchema),
				logic: structuredClone(snap.logic),
				dictionariesSnapshot: structuredClone(snap.dictionariesSnapshot),
				releaseNotes: snap.releaseNotes,
				parentVersionId: null,
			},
			userId,
		);
		await this.typicalWorkSeedService.seedTemplateTypicalWorksFromDocCatalog(
			templateId,
			version.id,
		);
		return version;
	}

	async resetToDefault(
		templateId: string,
		userId: string | null,
	): Promise<V2TemplateVersionEntity> {
		const snap = await this.factorySnapshotService.getEffectiveSnapshot();
		const draft = await this.create(
			templateId,
			{
				jsonSchema: structuredClone(snap.jsonSchema),
				uiSchema: structuredClone(snap.uiSchema),
				logic: structuredClone(snap.logic),
				dictionariesSnapshot: structuredClone(snap.dictionariesSnapshot),
				releaseNotes: snap.releaseNotes,
				parentVersionId: null,
			},
			userId,
		);
		await this.typicalWorkSeedService.seedTemplateTypicalWorksFromDocCatalog(
			templateId,
			draft.id,
		);

		const published = await this.publish(draft.id, {}, userId);

		const editingDraft = await this.create(
			templateId,
			{
				jsonSchema: structuredClone(published.jsonSchema),
				uiSchema: structuredClone(published.uiSchema ?? {}),
				logic: structuredClone(published.logic ?? { rules: [] }),
				dictionariesSnapshot: published.dictionariesSnapshot ?? null,
				releaseNotes: "Черновик для редактирования (копия опубликованной после сброса)",
				parentVersionId: published.id,
			},
			userId,
		);
		await this.typicalWorkSeedService.seedTemplateTypicalWorksFromDocCatalog(
			templateId,
			editingDraft.id,
		);

		return published;
	}

	/**
	 * Делает указанную версию текущей опубликованной для шаблона (актуальный снимок).
	 * Черновик публикуется; уже опубликованная — только переключает указатель;
	 * архивная копируется в новую версию и публикуется.
	 */
	async activateAsCurrent(
		templateId: string,
		versionId: string,
		userId: string | null,
	): Promise<{ version: V2TemplateVersionEntity; changed: boolean }> {
		const template = await this.templateRepository.findOne({
			where: { id: templateId },
		});

		if (!template) {
			throw new NotFoundException(`Template with id ${templateId} not found`);
		}

		const version = await this.versionRepository.findOne({
			where: { id: versionId, templateId },
		});

		if (!version) {
			throw new NotFoundException(
				`Version ${versionId} not found for template ${templateId}`,
			);
		}

		if (template.currentVersionId === versionId) {
			return { version, changed: false };
		}

		if (version.status === "draft") {
			const published = await this.publish(version.id, {}, userId);
			return { version: published, changed: true };
		}

		if (version.status === "published") {
			await this.templateService.setGlobalCurrentVersion(
				templateId,
				version.id,
				userId,
			);
			return { version, changed: true };
		}

		const lastVersion = await this.versionRepository.findOne({
			where: { templateId },
			order: { versionNumber: "DESC" },
		});

		const nextVersionNumber = lastVersion ? lastVersion.versionNumber + 1 : 1;

		const newDraft = this.versionRepository.create({
			templateId,
			versionNumber: nextVersionNumber,
			status: "draft",
			jsonSchema: version.jsonSchema,
			uiSchema: version.uiSchema,
			logic: version.logic,
			dictionariesSnapshot: version.dictionariesSnapshot,
			releaseNotes: `Активация из архива (версия ${version.versionNumber})`,
			parentVersionId: version.id,
			createdBy: userId,
		});

		const savedDraft = await this.versionRepository.save(newDraft);
		const published = await this.publish(savedDraft.id, {}, userId);

		return { version: published, changed: true };
	}

	async rollback(
		templateId: string,
		dto: RollbackV2TemplateVersionDto,
	): Promise<V2TemplateVersionEntity> {
		const targetVersion = await this.versionRepository.findOne({
			where: { id: dto.targetVersionId, templateId },
		});

		if (!targetVersion) {
			throw new NotFoundException(
				`Target version ${dto.targetVersionId} not found for template ${templateId}`,
			);
		}

		// Создаем новую версию на основе целевой
		const lastVersion = await this.versionRepository.findOne({
			where: { templateId },
			order: { versionNumber: "DESC" },
		});

		const nextVersionNumber = lastVersion ? lastVersion.versionNumber + 1 : 1;

		const newVersion = this.versionRepository.create({
			templateId,
			versionNumber: nextVersionNumber,
			status: "draft",
			jsonSchema: targetVersion.jsonSchema,
			uiSchema: targetVersion.uiSchema,
			logic: targetVersion.logic,
			dictionariesSnapshot: targetVersion.dictionariesSnapshot,
			releaseNotes:
				dto.releaseNotes ||
				`Rollback to version ${targetVersion.versionNumber}`,
			parentVersionId: targetVersion.id,
			createdBy: null,
		});

		return this.versionRepository.save(newVersion);
	}

	async delete(id: string): Promise<void> {
		const version = await this.findOne(id);

		const systemCurrentId =
			await this.templateService.getSystemCurrentVersionId();
		if (systemCurrentId === version.id) {
			throw new ConflictException(
				"Нельзя удалить версию — она является актуальной схемой системы.",
			);
		}

		if (version.status !== "draft") {
			throw new ConflictException(
				`Only draft versions can be deleted. Current status: ${version.status}`,
			);
		}

		await this.factorySnapshotService.clearTemplateReferenceIfMatches({
			versionId: version.id,
			templateId: version.templateId,
		});

		await this.versionRepository.remove(version);
	}

	async getPublishedByTemplateCode(
		templateCode: string,
	): Promise<V2TemplateVersionEntity | null> {
		const template = await this.templateRepository.findOne({
			where: { code: templateCode },
		});

		if (!template || !template.currentVersionId) {
			return null;
		}

		return this.versionRepository.findOne({
			where: {
				id: template.currentVersionId,
				status: "published" as V2TemplateStatus,
			},
		});
	}
}
