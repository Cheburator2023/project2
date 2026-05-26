import type {
	V2QuestionnaireDto,
	V2SchemaBindingDto,
} from "@smart-anketa/api-contract";
import { V2QuestionnaireEntity } from "../entities/v2-questionnaire.entity";
import { V2TemplateEntity } from "../entities/v2-template.entity";
import { V2TemplateVersionEntity } from "../entities/v2-template-version.entity";

export function buildSchemaBinding(
	template: V2TemplateEntity | null | undefined,
	boundVersion: V2TemplateVersionEntity | null | undefined,
	currentVersion: V2TemplateVersionEntity | null | undefined,
): V2SchemaBindingDto {
	const boundId = boundVersion?.id ?? "";
	if (!boundVersion?.id) {
		return {
			status: "unavailable",
			boundTemplateVersionId: boundId,
			boundTemplateVersionNumber: null,
			boundTemplateVersionStatus: null,
			currentTemplateVersionId: template?.currentVersionId ?? null,
			currentTemplateVersionNumber: currentVersion?.versionNumber ?? null,
			message:
				"Версия схемы, к которой привязана анкета, недоступна. Создайте новую версию анкеты на актуальной схеме.",
		};
	}

	const currentId = template?.currentVersionId ?? null;
	const aligned = currentId != null && currentId === boundVersion.id;

	if (aligned) {
		return {
			status: "aligned",
			boundTemplateVersionId: boundVersion.id,
			boundTemplateVersionNumber: boundVersion.versionNumber,
			boundTemplateVersionStatus: boundVersion.status,
			currentTemplateVersionId: currentId,
			currentTemplateVersionNumber: currentVersion?.versionNumber ?? null,
			message:
				"Анкета привязана к актуальной схеме системы. Изменения в админке сразу отражаются при редактировании (если не меняли привязку).",
		};
	}

	return {
		status: "superseded",
		boundTemplateVersionId: boundVersion.id,
		boundTemplateVersionNumber: boundVersion.versionNumber,
		boundTemplateVersionStatus: boundVersion.status,
		currentTemplateVersionId: currentId,
		currentTemplateVersionNumber: currentVersion?.versionNumber ?? null,
		message:
			currentVersion != null
				? `Анкета создана по схеме v${boundVersion.versionNumber}, в админке актуальна v${currentVersion.versionNumber}. Редактирование использует привязанную схему; для перехода на новую — создайте новую версию анкеты.`
				: `Анкета привязана к схеме v${boundVersion.versionNumber}; актуальная версия в админке не назначена.`,
	};
}

export function mapV2QuestionnaireToDto(
	entity: V2QuestionnaireEntity,
	schemaBinding: V2SchemaBindingDto,
): V2QuestionnaireDto {
	return {
		id: entity.id,
		calcName: entity.calcName,
		status: entity.status,
		version: entity.version,
		seriesId: entity.seriesId,
		parentQuestionnaireId: entity.parentQuestionnaireId,
		readableId: entity.readableId,
		templateId: entity.templateId,
		templateCode: entity.template?.code ?? null,
		templateName: entity.template?.name ?? null,
		boundTemplateVersionId: entity.boundTemplateVersionId,
		formData: entity.formData ?? {},
		finalCoefficient: entity.finalCoefficient,
		author: entity.author,
		createdAt: entity.createdAt.toISOString(),
		updatedAt: entity.updatedAt.toISOString(),
		schemaBinding,
	};
}
