/**
 * Канон group path → realm roles.
 *
 * Снято с живого Keycloak SUMD (realm `cym`, 2026-07-25) — тестер подтвердил OK.
 * Источник дампа: `llm/output/keycloak-sumd-live-group-role-matrix.json`.
 *
 * Важно: «approve» разделён на две realm-роли:
 * - anketa_workflow_approve — завершение раздела/блока (§3.10);
 * - anketa_complete_anketa — завершение заполнения анкеты (§3.12).
 *
 * Лиды — только top-level: `/ds_lead`, `/de_lead`, `/modelops_lead`, `/validator_lead`.
 * Не создавать nested `/ds/ds_lead`, `/de/de_lead` и т.п.
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

/** Руководитель DE: edit + завершение, без create/delete. */
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
	"/ds_lead": DS_LEAD_ROLES,
	"/de": ["anketa_view_all_calculations", "anketa_export_reports"],
	"/de_lead": DE_LEAD_ROLES,
	/** ModelOps executor: только view + export (без delete на SUMD). */
	"/modelops": ["anketa_view_all_calculations", "anketa_export_reports"],
	"/modelops_lead": MODELOPS_LEAD_ROLES,
	"/business_customer": [],
	"/mipm": MIPM_ROLES,
	"/mipm_stream": MIPM_ROLES,
	"/validator": VALIDATOR_ROLES,
	"/validator_lead": VALIDATOR_ROLES,
	"/architect": [
		"anketa_view_all_calculations",
		"anketa_edit_calculation",
		"anketa_export_reports",
		"anketa_workflow_approve",
	],
	"/mntranlst": [
		"anketa_view_all_calculations",
		"anketa_edit_calculation",
		"anketa_export_reports",
		"anketa_workflow_approve",
	],
	"/da": [
		"anketa_view_all_calculations",
		"anketa_edit_calculation",
		"anketa_export_reports",
		"anketa_complete_anketa",
	],
	"/da_stream": [
		"anketa_view_all_calculations",
		"anketa_edit_calculation",
		"anketa_export_reports",
	],
	/**
	 * Группы `/appadmin` в KK нет. Логический ключ → AD-лист
	 * `/admin_it/{stand}sum_appadmin` (например `/admin_it/dev_sum_appadmin`).
	 * Доменный код роли `appadmin` берётся из leaf (`mapV2AdGroupLeafToRoleCodes`).
	 */
	"/appadmin": ["anketa_view_all_calculations", "anketa_audit_view"],
	"/admin_it": [],
	"/admin_it/admin_it_lead": [],
	"/auditor": AUDITOR_ROLES,
	"/controller": AUDITOR_ROLES,
	"/auditor/auditor_lead": AUDITOR_ROLES,
	/**
	 * Группы `/auditorib` нет. Логический ключ → AD-лист
	 * `/auditor/{stand}sum_auditorib` (например `/auditor/test_sum_auditorib`).
	 */
	"/auditorib": AUDITOR_ROLES,
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
	/** Представитель стрима вне ЖЦМ: без create. */
	"/sarep": [
		"anketa_view_all_calculations",
		"anketa_edit_calculation",
		"anketa_delete_calculation",
		"anketa_export_reports",
		"anketa_workflow_approve",
		"anketa_complete_anketa",
	],
	/**
	 * Bypass разделения реестра по стримам (доменный код `stream_view_all`).
	 * Группы `/stream_view_all` нет — только AD `/{stand}sum_stream_view_all`.
	 */
	"/stream_view_all": [],
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
