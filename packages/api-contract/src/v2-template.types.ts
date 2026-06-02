import type { V2LegacyStageEvaluationDto } from "./v2-legacy-stage.constants";

/**
 * Smart-Анкета V2 — типы шаблонов и справочников.
 *
 * V2 живёт изолированно от V1. Все таблицы префиксированы `v2_`.
 *
 * Иерархия:
 *   V2Template (один на стрим/контур) — many → V2TemplateVersion (snapshot схемы)
 *   V2Template — many → V2TemplateAudit (журнал изменений)
 *   V2Dictionary — many → V2DictionaryItem (нормативные значения)
 *
 * Версии шаблона имеют статусы DRAFT → PUBLISHED → ARCHIVED.
 * В одно время на шаблон допускается не более одной DRAFT-версии.
 */

export const V2_TEMPLATE_STATUS_VALUES = [
	"draft",
	"published",
	"archived",
] as const;

export type V2TemplateStatus = (typeof V2_TEMPLATE_STATUS_VALUES)[number];

export const V2_TEMPLATE_AUDIT_ACTION_VALUES = [
	"template.created",
	"template.updated",
	"template.deleted",
	"version.created",
	"version.updated",
	"version.published",
	"version.archived",
	"version.rolled_back",
	"version.reset_to_default",
	"version.activated_as_current",
	"version.deleted",
	"dictionary.created",
	"dictionary.updated",
	"dictionary.deleted",
	"dictionary_item.created",
	"dictionary_item.updated",
	"dictionary_item.deleted",
] as const;

export type V2TemplateAuditAction =
	(typeof V2_TEMPLATE_AUDIT_ACTION_VALUES)[number];

/**
 * Узел графа правил — одна логическая операция (видимость, required, computed,
 * validation, hint, task-trigger). Условие — json-logic дерево.
 */
export const V2_LOGIC_RULE_KIND_VALUES = [
	"visibility",
	"required",
	"computed",
	"row_computed",
	"validation",
	"hint",
	"task_trigger",
] as const;

export type V2LogicRuleKind = (typeof V2_LOGIC_RULE_KIND_VALUES)[number];

export type V2JsonLogicValue =
	| string
	| number
	| boolean
	| null
	| V2JsonLogicValue[]
	| { [op: string]: V2JsonLogicValue };

export type V2LogicRuleDto = {
	id: string;
	kind: V2LogicRuleKind;
	/** Целевое поле/секция (json-pointer-like, например `/general/streamCode`). */
	targetPath: string;
	/** Поля-источники, от которых зависит правило (для детектирования циклов). */
	dependencies: string[];
	condition: V2JsonLogicValue;
	/** Опциональная полезная нагрузка: например, текст подсказки или код типовой задачи. */
	payload?: Record<string, unknown>;
	description?: string;
};

export type V2LogicGraphDto = {
	rules: V2LogicRuleDto[];
};

/**
 * Snapshot UI-Schema RJSF. Совместим с `@rjsf/utils` UISchema.
 */
export type V2UiSchemaDto = Record<string, unknown>;

/**
 * Snapshot JSON Schema (draft 2019-09 / 2020-12 совместим).
 */
export type V2JsonSchemaDto = Record<string, unknown>;

export type V2TemplateDto = {
	id: string;
	code: string;
	name: string;
	description: string | null;
	streamCode: string | null;
	currentVersionId: string | null;
	createdAt: string;
	updatedAt: string;
	createdBy: string | null;
	updatedBy: string | null;
};

export type V2TemplateVersionDto = {
	id: string;
	templateId: string;
	versionNumber: number;
	status: V2TemplateStatus;
	jsonSchema: V2JsonSchemaDto;
	uiSchema: V2UiSchemaDto;
	logic: V2LogicGraphDto;
	dictionariesSnapshot: Record<string, unknown> | null;
	releaseNotes: string | null;
	parentVersionId: string | null;
	createdAt: string;
	updatedAt: string;
	publishedAt: string | null;
	createdBy: string | null;
};

export type V2TemplateAuditDto = {
	id: string;
	/** null для событий справочников (без привязки к шаблону). */
	templateId: string | null;
	versionId: string | null;
	action: V2TemplateAuditAction;
	payload: Record<string, unknown> | null;
	createdAt: string;
	createdBy: string | null;
	/** Человекочитаемое имя шаблона на момент запроса журнала. */
	templateName: string | null;
	templateCode: string | null;
	/** Текущая опубликованная версия шаблона (актуальный снимок). */
	templateCurrentVersionId: string | null;
	/** Номер версии для записей, где указан versionId. */
	versionNumber: number | null;
};

export type V2DictionaryDto = {
	id: string;
	code: string;
	name: string;
	/** Категория: «Схема», «Методологический», … */
	category: string | null;
	description: string | null;
	createdAt: string;
	updatedAt: string;
	/** Заводской справочник — удалять нельзя, только сброс. */
	isDefault?: boolean;
	/** Есть привязки `ui:options.dictionaryCode` в версиях шаблонов. */
	isInUse?: boolean;
};

export type V2DictionaryBulkFailureReason =
	| "not_found"
	| "default_dictionary"
	| "in_use"
	| "not_default"
	| "reset_failed";

export type V2DictionaryBulkFailureDto = {
	id: string;
	code: string | null;
	reason: V2DictionaryBulkFailureReason;
	message: string;
};

export type BulkV2DictionaryIdsRequestDto = {
	ids: string[];
};

export type BulkDeleteV2DictionariesResultDto = {
	deletedIds: string[];
	failed: V2DictionaryBulkFailureDto[];
};

export type BulkResetV2DictionariesResultDto = {
	resetIds: string[];
	failed: V2DictionaryBulkFailureDto[];
};

export type V2DictionaryItemDto = {
	id: string;
	dictionaryId: string;
	code: string;
	label: string;
	parentCode: string | null;
	order: number;
	isActive: boolean;
	payload: Record<string, unknown> | null;
};

/** Где в схемах шаблонов используется справочник (ui:options.dictionaryCode). */
export type V2DictionaryFieldUsageDto = {
	templateId: string;
	templateCode: string;
	templateName: string;
	versionId: string;
	versionNumber: number;
	versionStatus: V2TemplateStatus;
	isCurrentPublished: boolean;
	fieldPointer: string;
	fieldTitle: string | null;
};

/* -------------------------------- Requests -------------------------------- */

export type CreateV2TemplateRequestDto = {
	code: string;
	name: string;
	description?: string | null;
	streamCode?: string | null;
};

export type UpdateV2TemplateRequestDto = {
	name?: string;
	description?: string | null;
	streamCode?: string | null;
};

export type CreateV2TemplateVersionRequestDto = {
	jsonSchema: V2JsonSchemaDto;
	uiSchema?: V2UiSchemaDto;
	logic?: V2LogicGraphDto;
	dictionariesSnapshot?: Record<string, unknown> | null;
	releaseNotes?: string | null;
	parentVersionId?: string | null;
};

export type UpdateV2TemplateVersionRequestDto = {
	jsonSchema?: V2JsonSchemaDto;
	uiSchema?: V2UiSchemaDto;
	logic?: V2LogicGraphDto;
	dictionariesSnapshot?: Record<string, unknown> | null;
	releaseNotes?: string | null;
};

export type PublishV2TemplateVersionRequestDto = {
	releaseNotes?: string | null;
};

export type RollbackV2TemplateVersionRequestDto = {
	targetVersionId: string;
	releaseNotes?: string | null;
};

export type CreateV2DictionaryRequestDto = {
	code: string;
	name: string;
	description?: string | null;
};

export type UpdateV2DictionaryRequestDto = {
	name?: string;
	description?: string | null;
};

export type CreateV2DictionaryItemRequestDto = {
	code: string;
	label: string;
	parentCode?: string | null;
	order?: number;
	isActive?: boolean;
	payload?: Record<string, unknown> | null;
};

export type UpdateV2DictionaryItemRequestDto = {
	label?: string;
	parentCode?: string | null;
	order?: number;
	isActive?: boolean;
	payload?: Record<string, unknown> | null;
};

/* ------------------------------- Validation ------------------------------- */

export const V2_VALIDATION_ISSUE_LEVEL_VALUES = [
	"error",
	"warning",
	"info",
] as const;

export type V2ValidationIssueLevel =
	(typeof V2_VALIDATION_ISSUE_LEVEL_VALUES)[number];

export type V2ValidationIssueDto = {
	level: V2ValidationIssueLevel;
	code: string;
	message: string;
	path?: string;
	details?: Record<string, unknown>;
};

export type V2ValidationReportDto = {
	ok: boolean;
	issues: V2ValidationIssueDto[];
};

/** Снимок шаблона и версий для отката удаления (undo). */
export type V2TemplateDeleteSnapshotDto = {
	template: V2TemplateDto;
	versions: V2TemplateVersionDto[];
};

export type V2BulkDeleteTemplateVersionsResultDto = {
	deletedVersionIds: string[];
	/** Актуальная версия системы — не удалялась. */
	skippedCurrentVersionId: string | null;
	/** Снимок удалённых версий для undo. */
	snapshot: V2TemplateVersionDto[];
};

/* --------------------------------- Limits --------------------------------- */

/**
 * Максимальный размер сериализованной JSON-схемы (в символах) — защита от DoS.
 * 1 MB UTF-8 примерно покрывает анкеты с ~5к полей.
 */
export const V2_MAX_JSON_SCHEMA_BYTES = 1_048_576;

/**
 * Максимальное число правил в logic graph.
 */
export const V2_MAX_LOGIC_RULES = 5_000;

/* ------------------------------- Calculation ------------------------------ */

export const V2_CALC_ROLE_VALUES = [
	"typical_total",
	"atypical_total",
	"grand_total",
	"coefficient",
	"stage_value",
	"other",
] as const;

export type V2CalculationRole = (typeof V2_CALC_ROLE_VALUES)[number];

export type V2CalculationItemDto = {
	ruleId: string;
	targetPointer: string;
	targetVarPath: string;
	label: string;
	role: V2CalculationRole;
	value: number | null;
	formulaHint: string;
	mode: "preset" | "expert";
	kind?: "multiply" | "sum" | "priority_first" | "max" | "min";
	operands: Array<{ varPath: string; value: number | null }>;
	weightSourceLabel?: string;
	error?: string;
};

export type V2TaskTriggerItemDto = {
	ruleId: string;
	taskCode: string;
	label: string;
	hint: string;
	passes: boolean;
};

export type V2CalculationResultDto = {
	formData: Record<string, unknown>;
	items: V2CalculationItemDto[];
	taskTriggers: V2TaskTriggerItemDto[];
	cycles: string[];
	/** Ошибки правил `validation` (JsonLogic) по текущим данным формы. */
	validationIssues: V2ValidationIssueDto[];
	/** Этапы E2E v1: перезапись полей summary после JsonLogic. */
	legacyStageEvaluation: V2LegacyStageEvaluationDto | null;
};

export type V2CalculateRequestDto = {
	formData: Record<string, unknown>;
	/** Опционально: переопределить правила для предпросмотра расчёта в админке. */
	rulesOverride?: V2LogicGraphDto;
};
