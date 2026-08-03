import {
	BadRequestException,
	Injectable,
	NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import type {
	UpdateV2FactorySnapshotSettingDto,
	V2DictionariesSnapshotDto,
	V2FactorySnapshotSettingDto,
	V2FactorySnapshotSource,
	V2JsonSchemaDto,
	V2LogicGraphDto,
	V2UiSchemaDto,
} from "@smart-anketa/api-contract";
import { resolveAnketaCalculationLogic } from "@smart-anketa/api-contract";
import { stripQuestionnaireCalcNameFromTemplateSnapshot } from "@smart-anketa/api-contract";
import {
	loadV2DefaultTemplateSnapshot,
	V2_DEFAULT_TEMPLATE_SNAPSHOT,
} from "../constants/v2-default-template-snapshot";
import { V2FactorySnapshotSettingEntity } from "../entities/v2-factory-snapshot-setting.entity";
import { V2TemplateEntity } from "../entities/v2-template.entity";
import { V2TemplateVersionEntity } from "../entities/v2-template-version.entity";

export type V2EffectiveFactorySnapshot = {
	jsonSchema: V2JsonSchemaDto;
	uiSchema: V2UiSchemaDto;
	logic: V2LogicGraphDto;
	dictionariesSnapshot: V2DictionariesSnapshotDto;
	releaseNotes: string;
};

const SETTING_ROW_ID = 1;
const BUILTIN_LABEL = V2_DEFAULT_TEMPLATE_SNAPSHOT.releaseNotes;

@Injectable()
export class V2FactorySnapshotService {
	constructor(
		@InjectRepository(V2FactorySnapshotSettingEntity)
		private readonly settingRepository: Repository<V2FactorySnapshotSettingEntity>,
		@InjectRepository(V2TemplateEntity)
		private readonly templateRepository: Repository<V2TemplateEntity>,
		@InjectRepository(V2TemplateVersionEntity)
		private readonly versionRepository: Repository<V2TemplateVersionEntity>,
	) {}

	async getSettingDto(): Promise<V2FactorySnapshotSettingDto> {
		const setting = await this.getOrCreateSetting();
		return this.mapSettingDto(setting);
	}

	async updateSetting(
		dto: UpdateV2FactorySnapshotSettingDto,
		userId: string | null,
	): Promise<V2FactorySnapshotSettingDto> {
		const setting = await this.getOrCreateSetting();

		if (dto.source === "builtin") {
			setting.source = "builtin";
			setting.templateId = null;
			setting.versionId = null;
			setting.updatedBy = userId;
			await this.settingRepository.save(setting);
			return this.mapSettingDto(setting);
		}

		const templateId = dto.templateId?.trim();
		if (!templateId) {
			throw new BadRequestException("Укажите templateId для заводского эталона");
		}

		const version = await this.resolveTemplateVersion(
			templateId,
			dto.versionId ?? null,
		);

		setting.source = "template";
		setting.templateId = templateId;
		setting.versionId = version.id;
		setting.updatedBy = userId;
		await this.settingRepository.save(setting);
		return this.mapSettingDto(setting);
	}

	async getEffectiveSnapshot(): Promise<V2EffectiveFactorySnapshot> {
		const setting = await this.getOrCreateSetting();
		if (setting.source !== "template" || !setting.templateId) {
			return this.builtinSnapshot();
		}

		try {
			const version = await this.resolveTemplateVersion(
				setting.templateId,
				setting.versionId,
			);
			return this.versionToSnapshot(version);
		} catch {
			return this.builtinSnapshot();
		}
	}

	async clearTemplateReferenceIfMatches(options: {
		templateId?: string;
		versionId?: string;
	}): Promise<void> {
		const setting = await this.getOrCreateSetting();
		if (setting.source !== "template") return;

		const matchesTemplate =
			options.templateId != null && setting.templateId === options.templateId;
		const matchesVersion =
			options.versionId != null && setting.versionId === options.versionId;

		if (!matchesTemplate && !matchesVersion) return;

		setting.source = "builtin";
		setting.templateId = null;
		setting.versionId = null;
		await this.settingRepository.save(setting);
	}

	private async getOrCreateSetting(): Promise<V2FactorySnapshotSettingEntity> {
		let setting = await this.settingRepository.findOne({
			where: { id: SETTING_ROW_ID },
			relations: { template: true, version: true },
		});
		if (setting) return setting;

		setting = this.settingRepository.create({
			id: SETTING_ROW_ID,
			source: "builtin",
			templateId: null,
			versionId: null,
		});
		return this.settingRepository.save(setting);
	}

	private async mapSettingDto(
		setting: V2FactorySnapshotSettingEntity,
	): Promise<V2FactorySnapshotSettingDto> {
		let templateName: string | null = null;
		let versionNumber: number | null = null;

		if (setting.source === "template" && setting.templateId) {
			const template =
				setting.template ??
				(await this.templateRepository.findOne({
					where: { id: setting.templateId },
				}));
			templateName = template?.name ?? null;

			if (setting.versionId) {
				const version =
					setting.version ??
					(await this.versionRepository.findOne({
						where: { id: setting.versionId },
					}));
				versionNumber = version?.versionNumber ?? null;
			}
		}

		return {
			source: setting.source as V2FactorySnapshotSource,
			templateId: setting.templateId,
			versionId: setting.versionId,
			templateName,
			versionNumber,
			builtinSnapshotLabel: BUILTIN_LABEL,
			updatedAt: setting.updatedAt?.toISOString() ?? null,
		};
	}

	private builtinSnapshot(): V2EffectiveFactorySnapshot {
		/** С диска, не из кэша модуля — иначе правка JSON не видна до рестарта. */
		const snap = loadV2DefaultTemplateSnapshot();
		return stripQuestionnaireCalcNameFromTemplateSnapshot({
			jsonSchema: structuredClone(snap.jsonSchema),
			uiSchema: structuredClone(snap.uiSchema),
			logic: structuredClone(snap.logic),
			dictionariesSnapshot: structuredClone(snap.dictionariesSnapshot),
			releaseNotes: snap.releaseNotes,
		});
	}

	private versionToSnapshot(
		version: V2TemplateVersionEntity,
	): V2EffectiveFactorySnapshot {
		const logic = resolveAnketaCalculationLogic(
			structuredClone(version.logic ?? { rules: [] }),
			{
				jsonSchema: structuredClone(version.jsonSchema),
				uiSchema: structuredClone(version.uiSchema ?? {}),
			},
		);
		return stripQuestionnaireCalcNameFromTemplateSnapshot({
			jsonSchema: structuredClone(version.jsonSchema),
			uiSchema: structuredClone(version.uiSchema ?? {}),
			logic,
			dictionariesSnapshot: structuredClone(
				version.dictionariesSnapshot ?? { referencedDictionaryCodes: [] },
			),
			releaseNotes:
				version.releaseNotes?.trim() ||
				`Заводской эталон: версия ${version.versionNumber}`,
		});
	}

	private async resolveTemplateVersion(
		templateId: string,
		versionId: string | null,
	): Promise<V2TemplateVersionEntity> {
		const template = await this.templateRepository.findOne({
			where: { id: templateId },
		});
		if (!template) {
			throw new NotFoundException(`Template ${templateId} not found`);
		}

		if (versionId) {
			const version = await this.versionRepository.findOne({
				where: { id: versionId, templateId },
			});
			if (!version) {
				throw new NotFoundException(
					`Version ${versionId} not found for template ${templateId}`,
				);
			}
			return version;
		}

		if (template.currentVersionId) {
			const current = await this.versionRepository.findOne({
				where: { id: template.currentVersionId, templateId },
			});
			if (current) return current;
		}

		const published = await this.versionRepository.findOne({
			where: { templateId, status: "published" },
			order: { versionNumber: "DESC" },
		});
		if (published) return published;

		const latest = await this.versionRepository.findOne({
			where: { templateId },
			order: { versionNumber: "DESC" },
		});
		if (latest) return latest;

		throw new BadRequestException(
			"У схемы нет версий — нельзя назначить заводским эталоном",
		);
	}
}
