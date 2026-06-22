import { ensureKeycloakSession, syncMfeAuthFromHost } from "@react-client/common/auth/syncMfeAuth";
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
	user,
	onLogout,
}) => {
	const setAccessToken = useAuthStore((state) => state.setAccessToken);
	const GOD_MODE = process?.env?.NO_ROLES === "true" || propGodMode;
	const hostProps = { token, keycloak, user, onLogout };

	useLayoutEffect(() => {
		if (GOD_MODE) {
			setAccessToken("god-mode-token");
			return;
		}

		syncMfeAuthFromHost(hostProps);
		ensureKeycloakSession(hostProps);
	}, [GOD_MODE, token, keycloak, user, onLogout, setAccessToken]);

	if (GOD_MODE) return <>{children}</>;
	return children;
};
