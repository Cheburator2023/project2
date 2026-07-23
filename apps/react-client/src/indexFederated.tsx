import { createBridgeComponent } from "@module-federation/bridge-react/v19";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import { AuthProvider } from "@react-client/common/providers/AuthProvider";
import {
	getKeycloakUserDisplayName,
	isSameKeycloakUser,
	keycloakUserMemoKey,
	normalizeKeycloakUser,
} from "@react-client/common/auth/keycloakUserText.util";
import { useUserStore } from "@react-client/common/store/userStore";
import { useGlobalSettingsStore } from "@react-client/common/store/globalSettingsStore";
import { globalStyles } from "@react-client/theme/GlobalStyle";
import { Permission, Role } from "@react-client/types/roles";
import { useEffect, useMemo } from "react";
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

function jwtExpInfo(token?: string | null): {
	exp?: string;
	iat?: string;
	secondsLeft?: number;
} {
	if (!token) return {};
	try {
		const payload = JSON.parse(atob(token.split(".")[1] ?? "")) as {
			exp?: number;
			iat?: number;
		};
		const now = Math.floor(Date.now() / 1000);
		return {
			exp:
				typeof payload.exp === "number"
					? new Date(payload.exp * 1000).toISOString()
					: undefined,
			iat:
				typeof payload.iat === "number"
					? new Date(payload.iat * 1000).toISOString()
					: undefined,
			secondsLeft:
				typeof payload.exp === "number" ? payload.exp - now : undefined,
		};
	} catch {
		return {};
	}
}

/** Полный дамп Keycloak / host-auth в консоль (MFE bridge). */
function logKeycloakDebug(props: Props, user?: T_KEYCLOAK_USER): void {
	const kc = props.keycloak;
	const token = props.token ?? (typeof kc?.token === "string" ? kc.token : undefined);
	const refreshToken =
		typeof kc?.refreshToken === "string" ? kc.refreshToken : undefined;
	const idToken = typeof kc?.idToken === "string" ? kc.idToken : undefined;
	const tokenParsed =
		kc?.tokenParsed && typeof kc.tokenParsed === "object"
			? kc.tokenParsed
			: undefined;
	const idTokenParsed =
		kc?.idTokenParsed && typeof kc.idTokenParsed === "object"
			? kc.idTokenParsed
			: undefined;
	const refreshTokenParsed =
		kc?.refreshTokenParsed && typeof kc.refreshTokenParsed === "object"
			? kc.refreshTokenParsed
			: undefined;

	const styleTitle =
		"background:#1a237e;color:#fff;padding:4px 10px;border-radius:4px;font-weight:700";
	const styleSection =
		"color:#3949ab;font-weight:600;font-size:12px";

	console.groupCollapsed(
		"%c🔐 Smart-Anketa MFE · Keycloak",
		styleTitle,
	);
	console.log("%c⏱ snapshot", styleSection, new Date().toISOString());

	console.groupCollapsed("%c① Instance", styleSection);
	console.table({
		authenticated: kc?.authenticated ?? null,
		authServerUrl: kc?.authServerUrl ?? kc?.authServerURL ?? null,
		realm: kc?.realm ?? null,
		clientId: kc?.clientId ?? null,
		flow: kc?.flow ?? null,
		responseMode: kc?.responseMode ?? null,
		responseType: kc?.responseType ?? null,
		pkceMethod: kc?.pkceMethod ?? null,
		timeSkew: kc?.timeSkew ?? null,
		hasLogin: typeof kc?.login === "function",
		hasLogout: typeof kc?.logout === "function",
		hasUpdateToken: typeof kc?.updateToken === "function",
		hasToken: Boolean(token),
		hasRefreshToken: Boolean(refreshToken),
		hasIdToken: Boolean(idToken),
	});
	console.groupEnd();

	console.groupCollapsed("%c② Tokens (TTL)", styleSection);
	console.table(
		[
			{ kind: "access", length: token?.length ?? 0, ...jwtExpInfo(token) },
			{
				kind: "refresh",
				length: refreshToken?.length ?? 0,
				...jwtExpInfo(refreshToken),
			},
			{ kind: "id", length: idToken?.length ?? 0, ...jwtExpInfo(idToken) },
		].filter((row) => row.length > 0),
	);
	console.log("access token:", token ?? null);
	console.log("refresh token:", refreshToken ?? null);
	console.log("id token:", idToken ?? null);
	console.groupEnd();

	console.groupCollapsed("%c③ tokenParsed", styleSection);
	console.log(tokenParsed ?? "(empty)");
	console.groupEnd();

	console.groupCollapsed("%c④ idTokenParsed", styleSection);
	console.log(idTokenParsed ?? "(empty)");
	console.groupEnd();

	console.groupCollapsed("%c⑤ refreshTokenParsed", styleSection);
	console.log(refreshTokenParsed ?? "(empty)");
	console.groupEnd();

	console.groupCollapsed("%c⑥ Host user (props → normalized)", styleSection);
	console.log("raw props.user:", props.user ?? null);
	console.log("normalized:", user ?? null);
	console.log(
		"displayName:",
		user ? getKeycloakUserDisplayName(user) : null,
	);
	console.groupEnd();

	console.groupCollapsed("%c⑦ Host props snapshot", styleSection);
	console.table({
		hasUrlConfig: Boolean(props.urlConfig),
		hasToken: Boolean(props.token),
		hasKeycloak: Boolean(props.keycloak),
		hasUser: Boolean(props.user),
		bridged: Boolean(props.bridged),
		userPermissions: props.userPermissions?.length ?? 0,
		hasOnLogout: typeof props.onLogout === "function",
		hasNavigate: typeof props.navigate === "function",
		hasProtectedFetch: typeof props.protectedFetch === "function",
	});
	if (kc) {
		console.log("raw keycloak object:", kc);
	}
	console.groupEnd();

	console.groupEnd();
}

const MfeRoot = (props: Props) => {
	normalizeMfeUrlIfNeeded();
	const userMemoKey = keycloakUserMemoKey(props.user);
	const user = useMemo(
		() => normalizeKeycloakUser(props.user),
		[userMemoKey],
	);

	window.__SMART_ANKETA_MFE_DEBUG__ = {
		mountedAt: new Date().toISOString(),
		hasToken: Boolean(props.token),
		hasUrlConfig: Boolean(props.urlConfig),
		userName: user ? getKeycloakUserDisplayName(user) : undefined,
	};

	useDeepEffect(() => {
		if (props?.urlConfig) {
			window.urlConfig = props.urlConfig;
			window.keycloak = props.keycloak;
		}
		window.user = user;
		window.token =
			props.keycloak?.authenticated === false ? undefined : props.token;
		syncMfeAuthFromHost(props);
		logKeycloakDebug(props, user);
	}, [props, user]);

	const { setUser } = useGlobalSettingsStore();
	const { setUsername, setGroups, setRoles, setPermissions } = useUserStore();

	useEffect(() => {
		const currentUser = useGlobalSettingsStore.getState().user;
		if (isSameKeycloakUser(currentUser, user)) return;
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
	}, [user, setUsername, setGroups, setRoles, setPermissions]);

	return (
		<AuthProvider
			token={props.token}
			keycloak={props.keycloak}
			user={user}
			onLogout={props.onLogout}
		>
			{globalStyles}

			{props?.urlConfig && props?.keycloak ? (
				<App {...props} user={user} bridged />
			) : (
				<FullScreenLoader />
			)}
		</AuthProvider>
	);
};

export default createBridgeComponent({
	rootComponent: MfeRoot,
});
