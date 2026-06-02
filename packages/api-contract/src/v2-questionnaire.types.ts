import type {
	V2JsonSchemaDto,
	V2LogicGraphDto,
	V2UiSchemaDto,
} from "./v2-template.types";
import type {
	V2AnketaGlobalStatus,
	V2AnketaMainSectionId,
	V2AnketaSectionStatus,
} from "./v2-anketa-workflow.types";

export const V2_QUESTIONNAIRE_STATUS_VALUES = ["active", "archived"] as const;
export type V2QuestionnaireStatus =
	(typeof V2_QUESTIONNAIRE_STATUS_VALUES)[number];

/** Связь анкеты с версией схемы шаблона на момент создания / редактирования. */
export const V2_SCHEMA_BINDING_STATUS_VALUES = [
	"aligned",
	"superseded",
	"unavailable",
] as const;
export type V2SchemaBindingStatus =
	(typeof V2_SCHEMA_BINDING_STATUS_VALUES)[number];

export type V2SchemaBindingDto = {
	status: V2SchemaBindingStatus;
	/** Версия схемы, к которой привязана анкета. */
	boundTemplateVersionId: string;
	boundTemplateVersionNumber: number | null;
	boundTemplateVersionStatus: string | null;
	/** Актуальная версия шаблона в админке (если есть). */
	currentTemplateVersionId: string | null;
	currentTemplateVersionNumber: number | null;
	/** Человекочитаемое пояснение для UI. */
	message: string;
};

export type V2QuestionnaireDto = {
	id: string;
	calcName: string;
	status: V2QuestionnaireStatus;
	version: string;
	seriesId: string;
	parentQuestionnaireId: string | null;
	readableId: string | null;
	templateId: string;
	templateCode: string | null;
	templateName: string | null;
	boundTemplateVersionId: string;
	formData: Record<string, unknown>;
	finalCoefficient: number | null;
	author: string | null;
	createdAt: string;
	updatedAt: string;
	schemaBinding: V2SchemaBindingDto;
	/** Дублирует `formData.workflow.globalStatus` для реестра и фильтров. */
	workflowGlobalStatus: V2AnketaGlobalStatus | null;
	/** Дублирует `formData.workflow.sections` для чипов в реестре. */
	workflowSectionStatuses: Record<
		V2AnketaMainSectionId,
		V2AnketaSectionStatus
	>;
};

export type V2QuestionnaireFormPackageDto = {
	questionnaire: V2QuestionnaireDto;
	jsonSchema: V2JsonSchemaDto;
	uiSchema: V2UiSchemaDto;
	logic: V2LogicGraphDto;
	/** Редактирование по привязанной схеме; при superseded — предупреждение в schemaBinding.message. */
	readOnly: boolean;
};

export type CreateV2QuestionnaireRequestDto = {
	calcName?: string;
	templateId?: string;
	formData?: Record<string, unknown>;
	finalCoefficient?: number | null;
};

export type UpdateV2QuestionnaireRequestDto = {
	calcName?: string;
	formData?: Record<string, unknown>;
	finalCoefficient?: number | null;
	status?: V2QuestionnaireStatus;
};

export type CreateV2QuestionnaireVersionRequestDto = {
	calcName?: string;
	formData?: Record<string, unknown>;
	finalCoefficient?: number | null;
};

export type BulkDeleteV2QuestionnairesRequestDto = {
	ids: string[];
};

export type BulkDeleteV2QuestionnairesFailureDto = {
	id: string;
	reason: "not_found" | "delete_failed";
	message: string;
};

export type BulkDeleteV2QuestionnairesResultDto = {
	deletedIds: string[];
	failed: BulkDeleteV2QuestionnairesFailureDto[];
};

export type SeedV2TestQuestionnairesRequestDto = {
	templateId?: string;
};

export type SeedV2TestQuestionnairesResultDto = {
	created: V2QuestionnaireDto[];
};
