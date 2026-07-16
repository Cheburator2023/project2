import { useUserStore } from "@react-client/common/store/userStore";
import { Permission } from "@react-client/types/roles";

export const usePermissions = () => {
	const { permissions, hasPermission } = useUserStore();

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
		canAccessAdminPanel: hasPermission(Permission.ANKETA_ADMIN_PANEL),
		canAccessTracker:
			hasPermission(Permission.DEVELOPER) ||
			hasPermission(Permission.ANKETA_ADMIN_PANEL),
	};
};
