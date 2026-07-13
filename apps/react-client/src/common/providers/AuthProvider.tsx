import { ensureKeycloakSession, syncMfeAuthFromHost } from "@react-client/common/auth/syncMfeAuth";
import {
	GOD_MODE_ACCESS_TOKEN,
	isNoRolesGodMode,
} from "@react-client/common/auth/godMode";
import type { MfeAuthHostProps } from "@react-client/common/auth/syncMfeAuth";
import { useAuthStore } from "../store/authStore";
import { useLayoutEffect } from "react";

interface AuthProviderProps extends MfeAuthHostProps {
	children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({
	children,
	token,
	keycloak,
	user,
	onLogout,
}) => {
	const setAccessToken = useAuthStore((state) => state.setAccessToken);
	const godMode = isNoRolesGodMode();

	useLayoutEffect(() => {
		if (godMode) {
			setAccessToken(GOD_MODE_ACCESS_TOKEN);
			return;
		}

		const hostProps = { token, keycloak, user, onLogout };
		syncMfeAuthFromHost(hostProps);
		ensureKeycloakSession(hostProps);
	}, [
		godMode,
		token,
		(keycloak as { authenticated?: boolean } | undefined)?.authenticated,
		Boolean(user),
		onLogout,
		setAccessToken,
	]);

	if (godMode) return <>{children}</>;
	return children;
};
