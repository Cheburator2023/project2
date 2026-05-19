import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { V2TemplateAuditEntity } from "../entities/v2-template-audit.entity";
import { V2TemplateEntity } from "../entities/v2-template.entity";
import { V2TemplateVersionEntity } from "../entities/v2-template-version.entity";
import type { V2TemplateAuditAction } from "@smart-anketa/api-contract";

export type V2TemplateAuditEnrichedEntity = V2TemplateAuditEntity & {
	templateName: string | null;
	templateCode: string | null;
	templateCurrentVersionId: string | null;
	versionNumber: number | null;
};

@Injectable()
export class V2AuditService {
	constructor(
		@InjectRepository(V2TemplateAuditEntity)
		private readonly auditRepository: Repository<V2TemplateAuditEntity>,
		@InjectRepository(V2TemplateEntity)
		private readonly templateRepository: Repository<V2TemplateEntity>,
		@InjectRepository(V2TemplateVersionEntity)
		private readonly versionRepository: Repository<V2TemplateVersionEntity>,
	) {}

	async findAll(
		templateId?: string,
		versionId?: string,
	): Promise<V2TemplateAuditEnrichedEntity[]> {
		const where: { templateId?: string; versionId?: string } = {};

		if (templateId) {
			where.templateId = templateId;
		}

		if (versionId) {
			where.versionId = versionId;
		}

		const audits = await this.auditRepository.find({
			where,
			order: { createdAt: "DESC" },
		});

		const templateIds = [
			...new Set(
				audits
					.map((a) => a.templateId)
					.filter((id): id is string => typeof id === "string" && id.length > 0),
			),
		];
		const templates =
			templateIds.length === 0
				? []
				: await this.templateRepository.find({
						where: { id: In(templateIds) },
						select: ["id", "name", "code", "currentVersionId"],
					});
		const templateMap = new Map(templates.map((t) => [t.id, t]));

		const rawVersionIds = audits
			.map((a) => a.versionId)
			.filter((id): id is string => typeof id === "string" && id.length > 0);
		const versionIds = [...new Set(rawVersionIds)];
		const versions =
			versionIds.length === 0
				? []
				: await this.versionRepository.find({
						where: { id: In(versionIds) },
						select: ["id", "versionNumber"],
					});
		const versionMap = new Map(versions.map((v) => [v.id, v.versionNumber]));

		return audits.map((a) => {
			const t = a.templateId ? templateMap.get(a.templateId) : undefined;
			const vn = a.versionId ? versionMap.get(a.versionId) : undefined;
			return Object.assign(a, {
				templateName: t?.name ?? null,
				templateCode: t?.code ?? null,
				templateCurrentVersionId: t?.currentVersionId ?? null,
				versionNumber: vn ?? null,
			}) as V2TemplateAuditEnrichedEntity;
		});
	}

	async log(
		templateId: string,
		action: V2TemplateAuditAction,
		versionId: string | null = null,
		payload: Record<string, unknown> | null = null,
		userId: string | null = null,
	): Promise<V2TemplateAuditEntity> {
		const audit = this.auditRepository.create({
			templateId,
			versionId,
			action,
			payload,
			createdBy: userId,
		});

		return this.auditRepository.save(audit);
	}

	/** События справочников: без привязки к шаблону (template_id = null). */
	async logDictionary(
		dictionaryId: string,
		action: V2TemplateAuditAction,
		payload: Record<string, unknown> | null = null,
		userId: string | null = null,
	): Promise<V2TemplateAuditEntity> {
		const audit = this.auditRepository.create({
			templateId: null,
			versionId: null,
			action,
			payload: { dictionaryId, ...payload },
			createdBy: userId,
		});

		return this.auditRepository.save(audit);
	}
}
