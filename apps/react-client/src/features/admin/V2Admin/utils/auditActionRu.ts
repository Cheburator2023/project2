import type { V2TemplateAuditAction } from "@smart-anketa/api-contract";

export const AUDIT_ACTION_RU: Record<V2TemplateAuditAction, string> = {
	"template.created": "Создан шаблон",
	"template.updated": "Обновлён шаблон",
	"template.deleted": "Удалён шаблон",
	"version.created": "Создана версия",
	"version.updated": "Обновлена версия",
	"version.published": "Опубликована версия",
	"version.archived": "Версия в архиве",
	"version.rolled_back": "Откат к версии",
	"version.reset_to_default": "Сброс к заводской схеме",
	"version.activated_as_current": "Версия сделана актуальной",
	"version.deleted": "Удалена версия",
	"dictionary.created": "Создан справочник",
	"dictionary.updated": "Обновлён справочник",
	"dictionary.deleted": "Удалён справочник",
	"dictionary_item.created": "Создан элемент справочника",
	"dictionary_item.updated": "Обновлён элемент справочника",
	"dictionary_item.deleted": "Удалён элемент справочника",
};

export function auditActionRu(action: V2TemplateAuditAction): string {
	return AUDIT_ACTION_RU[action];
}
