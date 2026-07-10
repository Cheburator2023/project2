import type {
	V2TemplateDeleteSnapshotDto,
	V2TemplateDto,
	V2TemplateVersionDto,
} from "@smart-anketa/api-contract";
import { V2TemplateEntity } from "../entities/v2-template.entity";
import { V2TemplateVersionEntity } from "../entities/v2-template-version.entity";

export function mapV2TemplateToDto(template: V2TemplateEntity): V2TemplateDto {
	return {
		id: template.id,
		code: template.code,
		name: template.name,
		description: template.description,
		streamCode: template.streamCode,
		currentVersionId: template.currentVersionId,
		createdAt: template.createdAt.toISOString(),
		updatedAt: template.updatedAt.toISOString(),
		createdBy: template.createdBy,
		updatedBy: template.updatedBy,
	};
}

export function mapV2TemplateVersionToDto(
	version: V2TemplateVersionEntity,
): V2TemplateVersionDto {
	return {
		id: version.id,
		templateId: version.templateId,
		versionNumber: version.versionNumber,
		status: version.status,
		jsonSchema: version.jsonSchema,
		uiSchema: version.uiSchema,
		logic: version.logic,
		dictionariesSnapshot: version.dictionariesSnapshot,
		releaseNotes: version.releaseNotes,
		parentVersionId: version.parentVersionId,
		createdAt: version.createdAt.toISOString(),
		updatedAt: version.updatedAt.toISOString(),
		publishedAt: version.publishedAt?.toISOString() ?? null,
		createdBy: version.createdBy,
	};
}

export function mapV2TemplateVersionSummaryToDto(
	version: Pick<
		V2TemplateVersionEntity,
		| "id"
		| "templateId"
		| "versionNumber"
		| "status"
		| "releaseNotes"
		| "publishedAt"
	>,
) {
	return {
		id: version.id,
		templateId: version.templateId,
		versionNumber: version.versionNumber,
		status: version.status,
		releaseNotes: version.releaseNotes,
		publishedAt: version.publishedAt?.toISOString() ?? null,
	};
}

export function buildTemplateDeleteSnapshot(
	template: V2TemplateEntity,
	versions: V2TemplateVersionEntity[],
): V2TemplateDeleteSnapshotDto {
	return {
		template: mapV2TemplateToDto(template),
		versions: versions.map(mapV2TemplateVersionToDto),
	};
}
