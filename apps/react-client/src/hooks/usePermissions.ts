import { useMemo } from "react";
import { useUserStore } from "@react-client/common/store/userStore";
import { isNoRolesGodMode } from "@react-client/common/auth/godMode";
import { useV2RoleCompatSetting } from "@react-client/common/api/queries/v2-runtime-settings";
import {
	ADMIN_PANEL_DOMAIN_ROLES,
	Permission,
	Role,
} from "@react-client/types/roles";
import {
	mergeV2PermissionsWithImplied,
	normalizeV2UserGroupsWithCompat,
	userCanCreateV2Questionnaire,
	userHasV2QuestionnaireDeleteRole,
} from "@smart-anketa/api-contract";

const isDev = process.env.NODE_ENV === "development";
const godMode = isNoRolesGodMode();

function hasDomainRole(
	groups: readonly string[],
	roles: readonly string[],
	wanted: readonly string[],
	adminItAsAppadmin: boolean,
): boolean {
	if (godMode) return true;
	if (wanted.some((code) => roles.includes(code))) return true;
	const normalized = normalizeV2UserGroupsWithCompat(groups, {
		adminItAsAppadmin,
	});
	return wanted.some((code) => normalized.includes(code));
}

export const usePermissions = () => {
	const { permissions, hasPermission, hasRole, groups, roles } = useUserStore();
	const { data: compat } = useV2RoleCompatSetting();
	const adminItAsAppadmin = compat?.adminItAsAppadmin ?? true;
	const allowNestedLeadGroups = compat?.allowNestedLeadGroups ?? true;

	const effectivePermissions = useMemo(
		() =>
			mergeV2PermissionsWithImplied(permissions, groups, {
				allowNestedLeadGroups,
				adminItAsAppadmin,
			}),
		[permissions, groups, allowNestedLeadGroups, adminItAsAppadmin],
	);

	const hasEffectivePermission = (permission: Permission): boolean => {
		if (godMode) return true;
		if (hasPermission(permission)) return true;
		return effectivePermissions.includes(permission);
	};

	return {
		permissions: effectivePermissions,
		hasPermission: hasEffectivePermission,
		canViewAllCalculations: hasEffectivePermission(
			Permission.ANKETA_VIEW_ALL_CALCULATIONS,
		),
		/** 1-я итерация: `sarep` без create даже при KK-permission. */
		canCreateCalculation: userCanCreateV2Questionnaire(
			groups,
			hasEffectivePermission(Permission.ANKETA_CREATE_CALCULATION),
		),
		canEditCalculation: hasEffectivePermission(
			Permission.ANKETA_EDIT_CALCULATION,
		),
		/** 1-я итерация: `sarep` без delete; lead/sacfg — по доменной роли. */
		canDeleteCalculation:
			godMode ||
			(hasEffectivePermission(Permission.ANKETA_DELETE_CALCULATION) &&
				userHasV2QuestionnaireDeleteRole(groups)),
		canExportReports: hasEffectivePermission(Permission.ANKETA_EXPORT_REPORTS),
		canWorkflowApprove: hasEffectivePermission(
			Permission.ANKETA_WORKFLOW_APPROVE,
		),
		canCompleteAnketa: hasEffectivePermission(Permission.ANKETA_COMPLETE_ANKETA),
		canAccessAdminPanel: hasDomainRole(
			groups,
			roles,
			ADMIN_PANEL_DOMAIN_ROLES,
			adminItAsAppadmin,
		),
		canAccessAudit: hasEffectivePermission(Permission.ANKETA_AUDIT_VIEW),
		canHoldCalculation: hasEffectivePermission(Permission.ANKETA_HOLD),
		canAccessTracker:
			godMode ||
			isDev ||
			(hasEffectivePermission(Permission.DEVELOPER) &&
				window.location.hostname.toLowerCase().includes("dev") &&
				!window.location.hostname.toLowerCase().includes("vtb")),
		hasRole: (role: Role) => hasRole(role),
	};
};
