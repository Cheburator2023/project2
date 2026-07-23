/**
 * Канон F-05 (редакция 2026-07, llm/feature_roles_fresh): целевые group path → realm roles.
 * Latin-дубли с другим регистром (/DE vs /de) НЕ трогаем — только канонические path ниже.
 *
 * Изменения против прошлой редакции:
 * - /mipm → Бизнес-партнёр: только view + export (без edit/approve);
 * - новая группа /mntranlst — Аналитик качества работы моделей ДАДМ (view/edit/export/approve);
 * - новая группа /da — Аналитик качества модельных данных (view/edit/export);
 * - новая группа /auditorib — Аудитор ИБ (view/export/audit);
 * - /sarep получает approve (по блокам своего стрима);
 * - /project_office — доступ не предоставляется (пусто).
 */

export const V2_KEYCLOAK_GROUP_ROLE_TARGET: Record<string, readonly string[]> = {
	"/ds": ["anketa_view_all_calculations", "anketa_export_reports"],
	"/ds/ds_lead": [
		"anketa_view_all_calculations",
		"anketa_create_calculation",
		"anketa_edit_calculation",
		"anketa_delete_calculation",
		"anketa_export_reports",
		"anketa_workflow_approve",
	],
	"/de": ["anketa_view_all_calculations", "anketa_export_reports"],
	"/de/de_lead": [
		"anketa_view_all_calculations",
		"anketa_edit_calculation",
		"anketa_export_reports",
		"anketa_workflow_approve",
	],
	"/modelops": ["anketa_view_all_calculations", "anketa_export_reports"],
	"/modelops/modelops_lead": [
		"anketa_view_all_calculations",
		"anketa_create_calculation",
		"anketa_edit_calculation",
		"anketa_delete_calculation",
		"anketa_export_reports",
		"anketa_workflow_approve",
	],
	"/business_customer": [],
	/** Бизнес-партнёр (и Бизнес-партнёр стрима): только просмотр + экспорт. */
	"/mipm": ["anketa_view_all_calculations", "anketa_export_reports"],
	"/validator": ["anketa_view_all_calculations", "anketa_export_reports"],
	"/validator/validator_lead": [
		"anketa_view_all_calculations",
		"anketa_export_reports",
	],
	"/architect": [
		"anketa_view_all_calculations",
		"anketa_edit_calculation",
		"anketa_export_reports",
		"anketa_workflow_approve",
	],
	/** Аналитик качества работы моделей ДАДМ (mntranlst). */
	"/mntranlst": [
		"anketa_view_all_calculations",
		"anketa_edit_calculation",
		"anketa_export_reports",
		"anketa_workflow_approve",
	],
	/** Аналитик качества модельных данных (da) — без approve. */
	"/da": [
		"anketa_view_all_calculations",
		"anketa_edit_calculation",
		"anketa_export_reports",
	],
	"/admin_it": [
		"anketa_view_all_calculations",
		"anketa_admin_panel",
		"anketa_audit_view",
	],
	"/admin_it/admin_it_lead": [
		"anketa_view_all_calculations",
		"anketa_admin_panel",
		"anketa_audit_view",
	],
	"/auditor": [
		"anketa_view_all_calculations",
		"anketa_export_reports",
		"anketa_audit_view",
	],
	"/auditor/auditor_lead": [
		"anketa_view_all_calculations",
		"anketa_export_reports",
		"anketa_audit_view",
	],
	/** Аудитор ИБ. */
	"/auditorib": [
		"anketa_view_all_calculations",
		"anketa_export_reports",
		"anketa_audit_view",
	],
	/** Сотрудник Проектного офиса — доступ пока не предоставляется. */
	"/project_office": [],
	"/sacfg": [
		"anketa_view_all_calculations",
		"anketa_create_calculation",
		"anketa_edit_calculation",
		"anketa_delete_calculation",
		"anketa_export_reports",
		"anketa_workflow_approve",
		"anketa_admin_panel",
	],
	"/saprg": [
		"anketa_view_all_calculations",
		"anketa_export_reports",
		"anketa_hold",
	],
	"/sarep": [
		"anketa_view_all_calculations",
		"anketa_create_calculation",
		"anketa_edit_calculation",
		"anketa_delete_calculation",
		"anketa_export_reports",
		"anketa_workflow_approve",
	],
};

/** Top-level группы из матрицы, которых может не быть на стенде — создаём (не удаляем ничего). */
export const V2_KEYCLOAK_GROUPS_TO_ENSURE: readonly string[] = [
	"/mntranlst",
	"/da",
	"/auditorib",
	"/project_office",
];

export const V2_KEYCLOAK_ROLES_TO_ENSURE = [
	"anketa_view_all_calculations",
	"anketa_create_calculation",
	"anketa_edit_calculation",
	"anketa_export_reports",
	"anketa_admin_panel",
	"anketa_audit_view",
	"anketa_delete_calculation",
	"anketa_workflow_approve",
	"anketa_hold",
] as const;

export const V2_KEYCLOAK_ROLE_DESCRIPTIONS: Record<string, string> = {
	anketa_delete_calculation: "Delete questionnaires (Smart Anketa)",
	anketa_workflow_approve: "Complete/approve anketa block workflow",
	anketa_hold: "Hold / freeze anketa snapshot (saprg)",
};
