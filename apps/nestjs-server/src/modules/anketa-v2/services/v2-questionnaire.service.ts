import {
	BadRequestException,
	Injectable,
	NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import type {
	CreateV2QuestionnaireRequestDto,
	CreateV2QuestionnaireVersionRequestDto,
	UpdateV2QuestionnaireRequestDto,
	V2QuestionnaireFormPackageDto,
	V2QuestionnaireDto,
} from "@smart-anketa/api-contract";
import { Repository } from "typeorm";
import { V2QuestionnaireEntity } from "../entities/v2-questionnaire.entity";
import { V2TemplateEntity } from "../entities/v2-template.entity";
import { V2TemplateVersionEntity } from "../entities/v2-template-version.entity";
import { V2TemplateService } from "./v2-template.service";
import {
	buildSchemaBinding,
	mapV2QuestionnaireToDto,
} from "../utils/v2-questionnaire-mapper.util";
import { mapV2TemplateVersionToDto } from "../utils/v2-template-mapper.util";

type TUserLike = {
	given_name?: string;
	family_name?: string;
	preferred_username?: string;
	email?: string;
};

@Injectable()
export class V2QuestionnaireService {
	constructor(
		@InjectRepository(V2QuestionnaireEntity)
		private readonly questionnaireRepository: Repository<V2QuestionnaireEntity>,
		@InjectRepository(V2TemplateEntity)
		private readonly templateRepository: Repository<V2TemplateEntity>,
		@InjectRepository(V2TemplateVersionEntity)
		private readonly versionRepository: Repository<V2TemplateVersionEntity>,
		private readonly templateService: V2TemplateService,
	) {}

	async findAll(): Promise<V2QuestionnaireDto[]> {
		const rows = await this.questionnaireRepository.find({
			relations: ["template", "boundTemplateVersion"],
			order: { createdAt: "DESC" },
		});
		return Promise.all(rows.map((row) => this.toDto(row)));
	}

	async findOne(id: string): Promise<V2QuestionnaireDto> {
		const row = await this.loadWithRelations(id);
		return this.toDto(row);
	}

	async getFormPackage(id: string): Promise<V2QuestionnaireFormPackageDto> {
		const row = await this.loadWithRelations(id);
		const dto = await this.toDto(row);
		const bound = row.boundTemplateVersion;
		if (!bound) {
			throw new NotFoundException("Привязанная версия схемы не найдена");
		}
		const versionDto = mapV2TemplateVersionToDto(bound);
		return {
			questionnaire: dto,
			jsonSchema: versionDto.jsonSchema,
			uiSchema: versionDto.uiSchema,
			logic: versionDto.logic,
			readOnly: dto.schemaBinding.status === "unavailable",
		};
	}

	async create(
		dto: CreateV2QuestionnaireRequestDto,
		user?: TUserLike | null,
	): Promise<V2QuestionnaireDto> {
		const { template, version } = await this.resolveTemplateForCreate(
			dto.templateId,
		);
		const seriesId = this.generateSeriesId();
		const versionLabel = "1";
		const readableId = `V2-${seriesId}-v${versionLabel}`;

		const entity = this.questionnaireRepository.create({
			calcName: dto.calcName?.trim() || "Новая анкета",
			status: "active",
			version: versionLabel,
			seriesId,
			parentQuestionnaireId: null,
			readableId,
			templateId: template.id,
			boundTemplateVersionId: version.id,
			formData: dto.formData ?? {},
			finalCoefficient: dto.finalCoefficient ?? null,
			author: this.authorName(user),
		});

		const saved = await this.questionnaireRepository.save(entity);
		return this.findOne(saved.id);
	}

	async update(
		id: string,
		dto: UpdateV2QuestionnaireRequestDto,
	): Promise<V2QuestionnaireDto> {
		const row = await this.loadWithRelations(id);
		if (dto.calcName !== undefined) {
			row.calcName = dto.calcName.trim() || row.calcName;
		}
		if (dto.formData !== undefined) {
			row.formData = dto.formData;
		}
		if (dto.finalCoefficient !== undefined) {
			row.finalCoefficient = dto.finalCoefficient;
		}
		if (dto.status !== undefined) {
			row.status = dto.status;
		}
		await this.questionnaireRepository.save(row);
		return this.findOne(id);
	}

	async createNewVersion(
		parentId: string,
		dto: CreateV2QuestionnaireVersionRequestDto,
		user?: TUserLike | null,
	): Promise<V2QuestionnaireDto> {
		const parent = await this.loadWithRelations(parentId);
		const siblings = await this.questionnaireRepository.find({
			where: { seriesId: parent.seriesId },
			select: ["version"],
		});
		const maxVersion = siblings.reduce((max, s) => {
			const n = Number.parseInt(s.version, 10);
			return Number.isFinite(n) && n > max ? n : max;
		}, 0);
		const nextVersion = String(maxVersion + 1);
		const readableId = `V2-${parent.seriesId}-v${nextVersion}`;

		const entity = this.questionnaireRepository.create({
			calcName: dto.calcName?.trim() || parent.calcName,
			status: "active",
			version: nextVersion,
			seriesId: parent.seriesId,
			parentQuestionnaireId: parent.id,
			readableId,
			templateId: parent.templateId,
			boundTemplateVersionId: parent.boundTemplateVersionId,
			formData: dto.formData ?? { ...parent.formData },
			finalCoefficient:
				dto.finalCoefficient !== undefined
					? dto.finalCoefficient
					: parent.finalCoefficient,
			author: this.authorName(user),
		});

		const saved = await this.questionnaireRepository.save(entity);
		return this.findOne(saved.id);
	}

	private async loadWithRelations(id: string): Promise<V2QuestionnaireEntity> {
		const row = await this.questionnaireRepository.findOne({
			where: { id },
			relations: ["template", "boundTemplateVersion"],
		});
		if (!row) {
			throw new NotFoundException(`Анкета ${id} не найдена`);
		}
		return row;
	}

	private async toDto(row: V2QuestionnaireEntity): Promise<V2QuestionnaireDto> {
		const template =
			row.template ??
			(await this.templateRepository.findOne({
				where: { id: row.templateId },
			}));
		const boundVersion =
			row.boundTemplateVersion ??
			(await this.versionRepository.findOne({
				where: { id: row.boundTemplateVersionId },
			}));
		let currentVersion: V2TemplateVersionEntity | null = null;
		if (template?.currentVersionId) {
			currentVersion = await this.versionRepository.findOne({
				where: { id: template.currentVersionId },
			});
		}
		const binding = buildSchemaBinding(template, boundVersion, currentVersion);
		return mapV2QuestionnaireToDto(
			{ ...row, template: template ?? undefined },
			binding,
		);
	}

	private async resolveTemplateForCreate(templateId?: string): Promise<{
		template: V2TemplateEntity;
		version: V2TemplateVersionEntity;
	}> {
		let template: V2TemplateEntity | null = null;

		if (templateId) {
			template = await this.templateRepository.findOne({
				where: { id: templateId },
			});
			if (!template) {
				throw new NotFoundException(`Шаблон ${templateId} не найден`);
			}
		} else {
			const templates = await this.templateService.findAll();
			const withCurrent = templates.filter((t) => t.currentVersionId);
			if (withCurrent.length === 0) {
				throw new BadRequestException(
					"Нет шаблона с актуальной схемой. Укажите templateId или назначьте currentVersion в админке.",
				);
			}
			if (withCurrent.length > 1) {
				throw new BadRequestException(
					"Несколько шаблонов с актуальной схемой. Укажите templateId явно.",
				);
			}
			template = withCurrent[0];
		}

		const versionId = template.currentVersionId;
		if (!versionId) {
			throw new BadRequestException(
				"У выбранного шаблона не задана актуальная версия схемы.",
			);
		}

		const version = await this.versionRepository.findOne({
			where: { id: versionId, templateId: template.id },
		});
		if (!version) {
			throw new BadRequestException("Актуальная версия схемы не найдена");
		}
		if (version.status !== "published") {
			throw new BadRequestException(
				"Создание анкеты возможно только по опубликованной актуальной схеме.",
			);
		}

		return { template, version };
	}

	private generateSeriesId(): string {
		const ts = Date.now().toString(36).toUpperCase();
		const rnd = Math.random().toString(36).slice(2, 6).toUpperCase();
		return `${ts}${rnd}`;
	}

	private authorName(user?: TUserLike | null): string {
		if (!user) return "Система";
		const name =
			`${user.given_name ?? ""} ${user.family_name ?? ""}`.trim() ||
			user.preferred_username ||
			user.email;
		return name || "Система";
	}
}
