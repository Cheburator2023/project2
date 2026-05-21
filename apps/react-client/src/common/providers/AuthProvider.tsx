import { syncMfeAuthFromHost } from "@react-client/common/auth/syncMfeAuth";
import type { MfeAuthHostProps } from "@react-client/common/auth/syncMfeAuth";
import { useAuthStore } from "../store/authStore";
import { useLayoutEffect } from "react";

interface AuthProviderProps extends MfeAuthHostProps {
	children: React.ReactNode;
	godMode?: boolean;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({
	children,
	godMode: propGodMode,
	token,
	keycloak,
}) => {
	const setAccessToken = useAuthStore((state) => state.setAccessToken);
	const GOD_MODE = process?.env?.NO_ROLES === "true" || propGodMode;

	useLayoutEffect(() => {
		if (GOD_MODE) {
			setAccessToken("god-mode-token");
			return;
		}
		syncMfeAuthFromHost({ token, keycloak });
	}, [GOD_MODE, token, keycloak, setAccessToken]);

	if (GOD_MODE) return <>{children}</>;
	return children;
};
