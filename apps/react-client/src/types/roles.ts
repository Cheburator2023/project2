export enum RoleLead {
	DS_LEAD = "ds_lead",
	DE_LEAD = "de_lead",
	MODEL_OPS_LEAD = "modelops_lead",
}
export type UserRoleLeads = RoleLead[];

export enum RoleNotViewTypicalSum {
	DS_LEAD = "ds_lead",
	DE_LEAD = "de_lead",
	MODEL_OPS_LEAD = "modelops_lead",
}
export type UserRolesNotViewTypicalSum = RoleNotViewTypicalSum[];

/** Все роли Keycloak для стрим-блоков анкеты и редактора логики (совпадает с `Role`). */
export enum RoleStreamBlock {
	ADMIN_IT = "admin_it",
	ADMIN_IT_LEAD = "admin_it_lead",
	VALIDATOR_LEAD = "validator_lead",
	VALIDATOR = "validator",
	BUSINESS_CUSTOMER = "business_customer",
	BI_CUSTOMER_BROKER = "bi_business_customer_broker",
	DS = "ds",
	DE = "de",
	DS_LEAD = "ds_lead",
	DE_LEAD = "de_lead",
	MODEL_OPS = "modelops",
	MODEL_OPS_LEAD = "modelops_lead",
	MIPM = "mipm",
	SAPRG = "saprg",
	SACFG = "sacfg",
	SAREP = "sarep",
	/** Прикладной администратор (AD: sum_appadmin). */
	APPADMIN = "appadmin",
}
export type UserRoleStreamBlocks = RoleStreamBlock[];

export enum Role {
	ADMIN_IT = "admin_it",
	ADMIN_IT_LEAD = "admin_it_lead",
	VALIDATOR_LEAD = "validator_lead",
	VALIDATOR = "validator",
	BUSINESS_CUSTOMER = "business_customer",
	BI_CUSTOMER_BROKER = "bi_business_customer_broker",
	DS = "ds",
	DE = "de",
	DS_LEAD = "ds_lead",
	DE_LEAD = "de_lead",
	MODEL_OPS = "modelops",
	MODEL_OPS_LEAD = "modelops_lead",
	MIPM = "mipm",
	SAPRG = "saprg",
	SACFG = "sacfg",
	SAREP = "sarep",
	/** Прикладной администратор (AD: sum_appadmin). */
	APPADMIN = "appadmin",
}
export type UserRoles = Role[];

export enum Permission {
	ANKETA_VIEW_ALL_CALCULATIONS = "anketa_view_all_calculations",
	ANKETA_CREATE_CALCULATION = "anketa_create_calculation",
	ANKETA_EDIT_CALCULATION = "anketa_edit_calculation",
	ANKETA_EXPORT_REPORTS = "anketa_export_reports",
	DEVELOPER = "developer",
	ANKETA_DELETE_CALCULATION = "anketa_delete_calculation",
	/** Завершение заполнения раздела/блока (§3.10). */
	ANKETA_WORKFLOW_APPROVE = "anketa_workflow_approve",
	/** Завершение заполнения анкеты целиком (§3.12). */
	ANKETA_COMPLETE_ANKETA = "anketa_complete_anketa",
	ANKETA_AUDIT_VIEW = "anketa_audit_view",
	/** Фиксация среза / блокировка анкеты (матрица hold) — saprg. */
	ANKETA_HOLD = "anketa_hold",
}
export type UserPermissions = Permission[];

/** Доменные группы с доступом к админке (AD: sum_appadmin, sum_sacfg). */
export const ADMIN_PANEL_DOMAIN_ROLES = [Role.APPADMIN, Role.SACFG] as const;
