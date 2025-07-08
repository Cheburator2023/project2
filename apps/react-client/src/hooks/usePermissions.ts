import { useUserStore } from "@react-client/common/store/userStore";
import { Permission } from "@react-client/types/roles";

export const usePermissions = () => {
	const { permissions, hasPermission } = useUserStore();

	return {
		permissions,
		hasPermission,
		canViewAllCalculations: hasPermission(Permission.VIEW_ALL_CALCULATIONS),
		canViewStreamCalculations: hasPermission(
			Permission.VIEW_STREAM_CALCULATIONS,
		),
		canCreateCalculation: hasPermission(Permission.CREATE_CALCULATION),
		canEditCalculation: hasPermission(Permission.EDIT_CALCULATION),
		canExportReports: hasPermission(Permission.EXPORT_REPORTS),
		canAccessAdminPanel: hasPermission(Permission.ADMIN_PANEL),
	};
};
