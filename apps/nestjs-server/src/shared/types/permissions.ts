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
