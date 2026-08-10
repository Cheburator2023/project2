import type {
	V2QuestionnaireDto,
	V2SchemaBindingDto,
} from "@smart-anketa/api-contract";
import { normalizeV2AnketaWorkflow } from "@smart-anketa/api-contract";
import { V2QuestionnaireEntity } from "../entities/v2-questionnaire.entity";
import { migrateV2AnketaFormData } from "./v2-form-data-migration.util";
import { V2TemplateEntity } from "../entities/v2-template.entity";
import { V2TemplateVersionEntity } from "../entities/v2-template-version.entity";

function boundVersionDateFields(
	boundVersion: V2TemplateVersionEntity | null | undefined,
): Pick<
	V2SchemaBindingDto,
	"boundTemplateVersionCreatedAt" | "boundTemplateVersionUpdatedAt"
> {
	return {
		boundTemplateVersionCreatedAt:
			boundVersion?.createdAt?.toISOString() ?? null,
		boundTemplateVersionUpdatedAt:
			boundVersion?.updatedAt?.toISOString() ?? null,
	};
}

export function buildSchemaBinding(
	template: V2TemplateEntity | null | undefined,
	boundVersion: V2TemplateVersionEntity | null | undefined,
	currentVersion: V2TemplateVersionEntity | null | undefined,
): V2SchemaBindingDto {
	const boundId = boundVersion?.id ?? "";
	const versionDates = boundVersionDateFields(boundVersion);
	if (!boundVersion?.id) {
		return {
			status: "unavailable",
			boundTemplateVersionId: boundId,
			boundTemplateVersionNumber: null,
			boundTemplateVersionStatus: null,
			...versionDates,
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
			...versionDates,
			currentTemplateVersionId: currentId,
			currentTemplateVersionNumber: currentVersion?.versionNumber ?? null,
			message: "Анкета привязана к актуальной схеме системы",
		};
	}

	return {
		status: "superseded",
		boundTemplateVersionId: boundVersion.id,
		boundTemplateVersionNumber: boundVersion.versionNumber,
		boundTemplateVersionStatus: boundVersion.status,
		...versionDates,
		currentTemplateVersionId: currentId,
		currentTemplateVersionNumber: currentVersion?.versionNumber ?? null,
		message:
			currentVersion != null
				? `Анкета создана по схеме v${boundVersion.versionNumber}, актуальная версия v${currentVersion.versionNumber}. Редактирование использует привязанную схему; для перехода на новую — создайте новую версию анкеты.`
				: `Анкета привязана к схеме v${boundVersion.versionNumber}; актуальная версия не назначена.`,
	};
}

export function mapV2QuestionnaireToDto(
	entity: V2QuestionnaireEntity,
	schemaBinding: V2SchemaBindingDto,
): V2QuestionnaireDto {
	const formData = migrateV2AnketaFormData(entity.formData ?? {});
	const workflow = normalizeV2AnketaWorkflow(formData.workflow);
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
		formData,
		finalCoefficient: entity.finalCoefficient,
		author: entity.author,
		createdAt: entity.createdAt.toISOString(),
		updatedAt: entity.updatedAt.toISOString(),
		schemaBinding,
		workflowGlobalStatus: workflow.globalStatus,
		workflowSectionStatuses: workflow.sections,
	};
}
