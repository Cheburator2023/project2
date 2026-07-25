/**
 * Канон F-05 (редакция 2026-07 TIS, llm/feature_roles_fresh):
 * group path → realm roles.
 *
 * Важно: «approve» разделён на две realm-роли:
 * - anketa_workflow_approve — завершение раздела/блока (§3.10);
 * - anketa_complete_anketa — завершение заполнения анкеты (§3.12).
 *
 * SUMD (realm-export): лиды top-level `/ds_lead`, `/de_lead`, …
 * Seed/F-05: вложенные `/ds/ds_lead`. Держим оба path с одинаковыми ролями,
 * чтобы sync заливал роли и на пре-прод, и на nested-shape.
 *
 * Latin-дубли с другим регистром (/DE vs /de) НЕ трогаем.
 */

const DS_LEAD_ROLES = [
	"anketa_view_all_calculations",
	"anketa_create_calculation",
	"anketa_edit_calculation",
	"anketa_delete_calculation",
	"anketa_export_reports",
	"anketa_workflow_approve",
	"anketa_complete_anketa",
] as const;

const DE_LEAD_ROLES = [
	"anketa_view_all_calculations",
	"anketa_edit_calculation",
	"anketa_export_reports",
	"anketa_workflow_approve",
	"anketa_complete_anketa",
] as const;

const MODELOPS_LEAD_ROLES = [
	"anketa_view_all_calculations",
	"anketa_create_calculation",
	"anketa_edit_calculation",
	"anketa_delete_calculation",
	"anketa_export_reports",
	"anketa_workflow_approve",
	"anketa_complete_anketa",
] as const;

const VALIDATOR_ROLES = [
	"anketa_view_all_calculations",
	"anketa_export_reports",
] as const;

const AUDITOR_ROLES = [
	"anketa_view_all_calculations",
	"anketa_export_reports",
	"anketa_audit_view",
] as const;

const MIPM_ROLES = [
	"anketa_view_all_calculations",
	"anketa_export_reports",
] as const;

export const V2_KEYCLOAK_GROUP_ROLE_TARGET: Record<string, readonly string[]> = {
	"/ds": ["anketa_view_all_calculations", "anketa_export_reports"],
	/** SUMD top-level lead folder */
	"/ds_lead": DS_LEAD_ROLES,
	/** Seed / nested lead folder */
	"/ds/ds_lead": DS_LEAD_ROLES,
	"/de": ["anketa_view_all_calculations", "anketa_export_reports"],
	"/de_lead": DE_LEAD_ROLES,
	"/de/de_lead": DE_LEAD_ROLES,
	"/modelops": ["anketa_view_all_calculations", "anketa_export_reports"],
	"/modelops_lead": MODELOPS_LEAD_ROLES,
	"/modelops/modelops_lead": MODELOPS_LEAD_ROLES,
	"/business_customer": [],
	/** Бизнес-партнёр (sum_mipm): только view + export. */
	"/mipm": MIPM_ROLES,
	/** Бизнес-партнёр стрима (sum_mipm_<стрим>) — SUMD `/mipm_stream`. */
	"/mipm_stream": MIPM_ROLES,
	"/validator": VALIDATOR_ROLES,
	"/validator_lead": VALIDATOR_ROLES,
	"/validator/validator_lead": VALIDATOR_ROLES,
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
	/**
	 * AD sum_appadmin. Только view + audit (без create/edit/delete/export/approve).
	 * Админка UI — по группе appadmin/sacfg, не anketa_admin_*.
	 */
	"/appadmin": ["anketa_view_all_calculations", "anketa_audit_view"],
	"/admin_it": [],
	"/admin_it/admin_it_lead": [],
	"/auditor": AUDITOR_ROLES,
	/**
	 * SUMD: AD `sum_auditor` лежит под `/controller` (не под `/auditor`).
	 * Роли те же, что у аудитора.
	 */
	"/controller": AUDITOR_ROLES,
	"/auditor/auditor_lead": AUDITOR_ROLES,
	"/auditorib": AUDITOR_ROLES,
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
