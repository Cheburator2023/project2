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
];
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
];
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
];
/* ------------------------------- Validation ------------------------------- */
export const V2_VALIDATION_ISSUE_LEVEL_VALUES = [
    "error",
    "warning",
    "info",
];
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
