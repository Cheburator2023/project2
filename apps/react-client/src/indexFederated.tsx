import { createBridgeComponent } from "@module-federation/bridge-react/v19";
import { AuthProvider } from "@react-client/common/providers/AuthProvider";
import { useUserStore } from "@react-client/common/store/userStore";
import { useGlobalSettingsStore } from "@react-client/common/store/globalSettingsStore";
import { globalStyles } from "@react-client/theme/GlobalStyle";
import { Permission, Role } from "@react-client/types/roles";
import { useEffect } from "react";
import type { T_CONFIG_MAP, T_KEYCLOAK_USER } from "types";
import App from "./App";
import { syncMfeAuthFromHost } from "@react-client/common/auth/syncMfeAuth";
import { normalizeMfeUrlIfNeeded } from "@react-client/routing/basename";
import { FullScreenLoader } from "@react-client/common/muiCustom/FullScreenLoader";
import { useDeepEffect } from "@react-client/common/hooks/useDeepEffect";

type TKeycloakLike = {
	logout: () => void;
	login: () => void;
	authenticated?: boolean;
} & Record<string, unknown>;

declare global {
	interface Window {
		__SMART_ANKETA_MFE_DEBUG__?: {
			mountedAt: string;
			hasToken: boolean;
			hasUrlConfig: boolean;
			userName?: string;
		};
		urlConfig?: T_CONFIG_MAP;
		token?: string;
		keycloak?: TKeycloakLike;
		user?: T_KEYCLOAK_USER;
	}
}

export type Props = {
	urlConfig?: T_CONFIG_MAP;
	token?: string;
	user?: T_KEYCLOAK_USER;
	userPermissions?: string[];
	navigate?: (to: string) => void;
	protectedFetch?: any;
	bridged?: boolean;
	onLogout?: () => void;
	keycloak?: TKeycloakLike;
};

const MfeRoot = (props: Props) => {
	normalizeMfeUrlIfNeeded();
	syncMfeAuthFromHost(props);

	window.__SMART_ANKETA_MFE_DEBUG__ = {
		mountedAt: new Date().toISOString(),
		hasToken: Boolean(props.token),
		hasUrlConfig: Boolean(props.urlConfig),
		userName: props.user?.preferred_username,
	};

	useDeepEffect(() => {
		if (props?.urlConfig) {
			window.urlConfig = props.urlConfig;
			window.keycloak = props.keycloak;
		}
		window.user = props.user;
		window.token = props.token;
		syncMfeAuthFromHost(props);
	}, [props]);

	const { user } = props;
	const { setUser } = useGlobalSettingsStore();
	const { setUsername, setGroups, setRoles, setPermissions } = useUserStore();

	useEffect(() => {
		setUser(user);
	}, [user, setUser]);

	useEffect(() => {
		if (!user) {
			setUsername("");
			setGroups([]);
			setRoles([]);
			setPermissions([]);
			return;
		}

		if (user.preferred_username) {
			setUsername(user.preferred_username);
		}

		if (user.groups) {
			setGroups(user.groups);

			const roles = user.groups.filter((group) =>
				Object.values(Role).includes(group as Role),
			) as Role[];
			setRoles(roles);
		}

		if (user.realm_access?.roles) {
			const permissions = user.realm_access.roles.filter((permission) =>
				Object.values(Permission).includes(permission as Permission),
			) as Permission[];

			setPermissions(permissions);
		}
	}, [
		user,
		setUsername,
		setGroups,
		setRoles,
		setPermissions,
	]);

	return (
		<AuthProvider
			token={props.token}
			keycloak={props.keycloak}
			user={props.user}
			onLogout={props.onLogout}
		>
			{globalStyles}

			{props?.urlConfig && props?.keycloak ? (
				<App {...props} bridged />
			) : (
				<FullScreenLoader />
			)}
		</AuthProvider>
	);
};

export default createBridgeComponent({
	rootComponent: MfeRoot,
});
