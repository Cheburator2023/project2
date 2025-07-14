import { AccessDenied } from "@react-client/common/primitives/AccessDenied";
import { usePermissions } from "@react-client/hooks/usePermissions";
import React from "react";

interface PermissionGuardProps {
	check: (permissions: ReturnType<typeof usePermissions>) => boolean;
	message: string;
	children: React.ReactNode;
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({
	check,
	message,
	children,
}) => {
	const permissions = usePermissions();
	if (!check(permissions)) {
		return <AccessDenied message={message} />;
	}
	return <>{children}</>;
};
