import { Navigate } from "react-router";
import { FullScreenLoader } from "@react-client/common/muiCustom/FullScreenLoader";
import { NoAccessiblePages } from "@react-client/common/primitives/NoAccessiblePages";
import { useUserStore } from "@react-client/common/store/userStore";
import { usePermissions } from "@react-client/hooks/usePermissions";
import { getAccessiblePages } from "@react-client/routing/accessiblePages";
import React from "react";

interface PermissionGuardProps {
	check: (permissions: ReturnType<typeof usePermissions>) => boolean;
	/** Оставлено для читаемости роутов; страница без прав не показывается — уводим на доступную. */
	message?: string;
	children: React.ReactNode;
}

/**
 * Страница без прав недоступна полностью (ФТ-13): редиректим на первую
 * доступную страницу; если доступных нет — «Для вас нет доступных страниц».
 */
export const PermissionGuard: React.FC<PermissionGuardProps> = ({
	check,
	children,
}) => {
	const profileHydrated = useUserStore((s) => s.profileHydrated);
	const permissions = usePermissions();
	if (!profileHydrated) return <FullScreenLoader />;
	if (!check(permissions)) {
		const firstAccessible = getAccessiblePages(permissions)[0];
		if (!firstAccessible) return <NoAccessiblePages />;
		return <Navigate to={firstAccessible.path} replace />;
	}
	return <>{children}</>;
};
