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
	templateId: string;
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
	description: string | null;
	createdAt: string;
	updatedAt: string;
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
