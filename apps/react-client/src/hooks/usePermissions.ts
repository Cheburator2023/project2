import { useUserStore } from "@react-client/common/store/userStore";
import {
	ADMIN_PANEL_DOMAIN_ROLES,
	Permission,
	Role,
} from "@react-client/types/roles";
import { normalizeV2UserGroups } from "@smart-anketa/api-contract";

const isDev = process.env.NODE_ENV === "development";

function hasDomainRole(
	groups: readonly string[],
	roles: readonly string[],
	wanted: readonly string[],
): boolean {
	if (wanted.some((code) => roles.includes(code))) return true;
	const normalized = normalizeV2UserGroups(groups);
	return wanted.some((code) => normalized.includes(code));
}

export const usePermissions = () => {
	const { permissions, hasPermission, hasRole, groups, roles } = useUserStore();

	return {
		permissions,
		hasPermission,
		canViewAllCalculations: hasPermission(
			Permission.ANKETA_VIEW_ALL_CALCULATIONS,
		),
		canCreateCalculation: hasPermission(Permission.ANKETA_CREATE_CALCULATION),
		canEditCalculation: hasPermission(Permission.ANKETA_EDIT_CALCULATION),
		canDeleteCalculation: hasPermission(Permission.ANKETA_DELETE_CALCULATION),
		canExportReports: hasPermission(Permission.ANKETA_EXPORT_REPORTS),
		canWorkflowApprove: hasPermission(Permission.ANKETA_WORKFLOW_APPROVE),
		canCompleteAnketa: hasPermission(Permission.ANKETA_COMPLETE_ANKETA),
		/** Админка: sum_appadmin / sum_sacfg, без отдельного anketa_* permission. */
		canAccessAdminPanel: hasDomainRole(
			groups,
			roles,
			ADMIN_PANEL_DOMAIN_ROLES,
		),
		canAccessAudit: hasPermission(Permission.ANKETA_AUDIT_VIEW),
		canHoldCalculation: hasPermission(Permission.ANKETA_HOLD),
		canAccessTracker:
			isDev ||
			(hasPermission(Permission.DEVELOPER) &&
				window.location.hostname.toLowerCase().includes("dev") &&
				!window.location.hostname.toLowerCase().includes("vtb")),
		hasRole: (role: Role) => hasRole(role),
	};
};
