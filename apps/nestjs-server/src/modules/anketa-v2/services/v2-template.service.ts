import { Injectable, NotFoundException, ConflictException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { V2TemplateEntity } from "../entities/v2-template.entity";
import { V2TemplateVersionEntity } from "../entities/v2-template-version.entity";
import type { CreateV2TemplateDto, UpdateV2TemplateDto } from "../dto";

@Injectable()
export class V2TemplateService {
	constructor(
		@InjectRepository(V2TemplateEntity)
		private readonly templateRepository: Repository<V2TemplateEntity>,
		@InjectRepository(V2TemplateVersionEntity)
		private readonly versionRepository: Repository<V2TemplateVersionEntity>,
	) {}

	async findAll(): Promise<V2TemplateEntity[]> {
		return this.templateRepository.find({
			relations: ["currentVersion"],
			order: { createdAt: "DESC" },
		});
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

	async delete(id: string): Promise<void> {
		const template = await this.findOne(id);

		// Проверяем, есть ли связанные версии
		const versionCount = await this.versionRepository.count({
			where: { templateId: id },
		});

		if (versionCount > 0) {
			throw new ConflictException(
				`Cannot delete template with ${versionCount} associated versions. Delete versions first.`,
			);
		}

		await this.templateRepository.remove(template);
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

		template.currentVersionId = versionId;
		template.updatedBy = userId;

		return this.templateRepository.save(template);
	}
}
