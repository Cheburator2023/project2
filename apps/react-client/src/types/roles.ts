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
}
export type UserRoles = Role[];

export enum Permission {
	ANKETA_VIEW_ALL_CALCULATIONS = "anketa_view_all_calculations",
	ANKETA_CREATE_CALCULATION = "anketa_create_calculation",
	ANKETA_EDIT_CALCULATION = "anketa_edit_calculation",
	ANKETA_EXPORT_REPORTS = "anketa_export_reports",
	ANKETA_ADMIN_PANEL = "anketa_admin_panel",
}
export type UserPermissions = Permission[];
