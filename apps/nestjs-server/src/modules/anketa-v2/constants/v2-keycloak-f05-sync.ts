/**
 * Канон F-05 (редакция 2026-07 TIS, llm/feature_roles_fresh):
 * group path → realm roles.
 *
 * Важно: «approve» разделён на две realm-роли:
 * - anketa_workflow_approve — завершение раздела/блока (§3.10);
 * - anketa_complete_anketa — завершение заполнения анкеты (§3.12).
 *
 * Latin-дубли с другим регистром (/DE vs /de) НЕ трогаем.
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
		"anketa_complete_anketa",
	],
	"/de": ["anketa_view_all_calculations", "anketa_export_reports"],
	"/de/de_lead": [
		"anketa_view_all_calculations",
		"anketa_edit_calculation",
		"anketa_export_reports",
		"anketa_workflow_approve",
		"anketa_complete_anketa",
	],
	"/modelops": ["anketa_view_all_calculations", "anketa_export_reports"],
	"/modelops/modelops_lead": [
		"anketa_view_all_calculations",
		"anketa_create_calculation",
		"anketa_edit_calculation",
		"anketa_delete_calculation",
		"anketa_export_reports",
		"anketa_workflow_approve",
		"anketa_complete_anketa",
	],
	"/business_customer": [],
	/** Бизнес-партнёр (sum_mipm) / стрима (sum_mipm_<стрим>): только view + export. */
	"/mipm": ["anketa_view_all_calculations", "anketa_export_reports"],
	"/validator": ["anketa_view_all_calculations", "anketa_export_reports"],
	"/validator/validator_lead": [
		"anketa_view_all_calculations",
		"anketa_export_reports",
	],
	/** Архитектор: завершение раздела, но не анкеты. */
	"/architect": [
		"anketa_view_all_calculations",
		"anketa_edit_calculation",
		"anketa_export_reports",
		"anketa_workflow_approve",
	],
	/** Аналитик качества работы моделей ДАДМ: раздел да, анкета нет. */
	"/mntranlst": [
		"anketa_view_all_calculations",
		"anketa_edit_calculation",
		"anketa_export_reports",
		"anketa_workflow_approve",
	],
	/**
	 * Аналитик качества модельных данных (sum_da): уровень B, завершение анкеты
	 * (немодельной), без завершения раздела.
	 */
	"/da": [
		"anketa_view_all_calculations",
		"anketa_edit_calculation",
		"anketa_export_reports",
		"anketa_complete_anketa",
	],
	/**
	 * Аналитик качества модельных данных стрима (sum_da_<стрим>): уровень A,
	 * только edit своего блока, без завершения раздела/анкеты.
	 */
	"/da_stream": [
		"anketa_view_all_calculations",
		"anketa_edit_calculation",
		"anketa_export_reports",
	],
	/** AD sum_appadmin. Админка — по группе appadmin/sacfg, не anketa_admin_*. */
	"/appadmin": [
		"anketa_view_all_calculations",
		"anketa_audit_view",
	],
	"/admin_it": [],
	"/admin_it/admin_it_lead": [],
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
	"/auditorib": [
		"anketa_view_all_calculations",
		"anketa_export_reports",
		"anketa_audit_view",
	],
	/** AD sum_prjtoffice; /project_office — legacy alias. */
	"/prjtoffice": [],
	"/project_office": [],
	"/sacfg": [
		"anketa_view_all_calculations",
		"anketa_create_calculation",
		"anketa_edit_calculation",
		"anketa_delete_calculation",
		"anketa_export_reports",
		"anketa_workflow_approve",
		"anketa_complete_anketa",
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
		"anketa_complete_anketa",
	],
};

/** Все path из TARGET + родители, parents first (create-only). */
function collectGroupPathsToEnsure(
	target: Record<string, readonly string[]>,
): readonly string[] {
	const paths = new Set<string>();
	for (const path of Object.keys(target)) {
		const parts = path.split("/").filter(Boolean);
		let cur = "";
		for (const part of parts) {
			cur += `/${part}`;
			paths.add(cur);
		}
	}
	return [...paths].sort(
		(a, b) =>
			a.split("/").length - b.split("/").length || a.localeCompare(b),
	);
}

export const V2_KEYCLOAK_GROUPS_TO_ENSURE: readonly string[] =
	collectGroupPathsToEnsure(V2_KEYCLOAK_GROUP_ROLE_TARGET);

export const V2_KEYCLOAK_ROLES_TO_ENSURE = [
	"anketa_view_all_calculations",
	"anketa_create_calculation",
	"anketa_edit_calculation",
	"anketa_export_reports",
	"anketa_audit_view",
	"anketa_delete_calculation",
	"anketa_workflow_approve",
	"anketa_complete_anketa",
	"anketa_hold",
] as const;

export const V2_KEYCLOAK_ROLE_DESCRIPTIONS: Record<string, string> = {
	anketa_delete_calculation: "Delete questionnaires (Smart Anketa)",
	anketa_workflow_approve: "Complete anketa section/block (§3.10)",
	anketa_complete_anketa: "Complete whole anketa fill (§3.12)",
	anketa_hold: "Hold / freeze anketa snapshot (saprg)",
};
