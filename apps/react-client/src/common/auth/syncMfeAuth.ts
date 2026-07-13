import { clearMfeAuthState } from "@react-client/common/auth/clearMfeAuthState";
import { useAuthStore } from "@react-client/common/store/authStore";
import {
	isGodModeAccessToken,
	isNoRolesGodMode,
} from "@react-client/common/auth/godMode";

export type MfeAuthHostProps = {
	token?: string;
	user?: unknown;
	keycloak?: unknown;
	onLogout?: () => void;
};

type KeycloakLike = {
	token?: string;
	accessToken?: string;
	idToken?: string;
	authenticated?: boolean;
	updateToken?: (minValidity?: number) => Promise<boolean>;
	login?: (options?: { redirectUri?: string }) => Promise<void> | void;
	logout?: (options?: { redirectUri?: string }) => Promise<void> | void;
};

let loginRedirectInFlight = false;

function asKeycloak(value: unknown): KeycloakLike | null {
	if (!value || typeof value !== "object") return null;
	return value as KeycloakLike;
}

function tokenFromKeycloak(keycloak: unknown): string | null {
	const kc = asKeycloak(keycloak);
	if (!kc || kc.authenticated === false) return null;
	for (const key of ["token", "accessToken", "idToken"] as const) {
		const value = kc[key];
		if (typeof value === "string" && value.trim()) return value.trim();
	}
	return null;
}

function readCookieToken(): string | null {
	if (typeof document === "undefined") return null;
	const match = document.cookie.match(/(?:^|;\s*)token=([^;]*)/);
	if (!match?.[1]) return null;
	try {
		return decodeURIComponent(match[1].trim());
	} catch {
		return match[1].trim();
	}
}

export function resolveKeycloakInstance(
	props?: MfeAuthHostProps | null,
): KeycloakLike | null {
	return (
		asKeycloak(props?.keycloak) ??
		(typeof window !== "undefined" ? asKeycloak(window.keycloak) : null)
	);
}

export function isKeycloakSessionActive(
	keycloak: unknown | null | undefined,
): boolean {
	const kc = asKeycloak(keycloak);
	if (!kc) return true;
	return kc.authenticated !== false;
}

/** JWT с host (props / window / keycloak / cookie). */
export function resolveHostAccessToken(
	props?: MfeAuthHostProps | null,
): string | null {
	const keycloak = resolveKeycloakInstance(props);
	if (keycloak && keycloak.authenticated === false) {
		return null;
	}

	const fromProps = props?.token?.trim();
	if (fromProps) return fromProps;

	const fromKeycloak = tokenFromKeycloak(props?.keycloak);
	if (fromKeycloak) return fromKeycloak;

	if (typeof window !== "undefined") {
		if (keycloak && keycloak.authenticated === false) {
			return null;
		}

		const winToken = window.token?.trim();
		if (winToken) return winToken;

		const fromWinKc = tokenFromKeycloak(window.keycloak);
		if (fromWinKc) return fromWinKc;
	}

	return readCookieToken();
}

/** Актуальный токен: host/keycloak приоритетнее zustand-кэша. */
export function resolveFreshAccessToken(
	props?: MfeAuthHostProps | null,
): string | null {
	const hostToken = resolveHostAccessToken(props);
	if (hostToken) {
		const stored = useAuthStore.getState().accessToken;
		if (hostToken !== stored) {
			useAuthStore.getState().setAccessToken(hostToken);
		}
		return hostToken;
	}

	if (!isKeycloakSessionActive(resolveKeycloakInstance(props))) {
		useAuthStore.getState().setAccessToken(null);
		return null;
	}

	const stored = useAuthStore.getState().accessToken;
	if (isGodModeAccessToken(stored) && !isNoRolesGodMode()) {
		useAuthStore.getState().setAccessToken(null);
		return null;
	}

	return stored;
}

/** Просит Keycloak обновить access token и кладёт результат в store. */
export async function refreshHostAccessToken(
	props?: MfeAuthHostProps | null,
): Promise<string | null> {
	const keycloak = resolveKeycloakInstance(props);
	if (keycloak?.authenticated === false) {
		clearMfeAuthState();
		return null;
	}

	if (keycloak?.updateToken) {
		try {
			await keycloak.updateToken(30);
			const refreshed = tokenFromKeycloak(keycloak);
			if (refreshed) {
				useAuthStore.getState().setAccessToken(refreshed);
				if (typeof window !== "undefined") {
					window.token = refreshed;
				}
				return refreshed;
			}
		} catch {
			// Не повторяем запрос с заведомо устаревшим host/cookie token.
			clearMfeAuthState();
			return null;
		}
	}

	const token = resolveHostAccessToken(props);
	if (token) {
		useAuthStore.getState().setAccessToken(token);
		return token;
	}

	clearMfeAuthState();
	return null;
}

/** Сохраняет токен host в zustand → apiClient добавит Authorization: Bearer. */
export function syncMfeAuthFromHost(
	props?: MfeAuthHostProps | null,
): string | null {
	const token = resolveFreshAccessToken(props);
	if (!token && !isKeycloakSessionActive(resolveKeycloakInstance(props))) {
		clearMfeAuthState();
	}
	return token;
}

/** Редирект на login Keycloak, если сессия host завершена. */
export function ensureKeycloakSession(
	props?: MfeAuthHostProps | null,
): void {
	const keycloak = resolveKeycloakInstance(props);
	if (!keycloak?.login) return;

	if (keycloak.authenticated === true) {
		loginRedirectInFlight = false;
		return;
	}

	const hasHostToken = Boolean(props?.token?.trim());
	const hasHostUser = Boolean(props?.user);
	const hasKeycloakToken = Boolean(tokenFromKeycloak(keycloak));

	const needsLogin =
		keycloak.authenticated === false ||
		(!hasHostToken && !hasHostUser && !hasKeycloakToken);
	if (!needsLogin || loginRedirectInFlight) return;

	loginRedirectInFlight = true;
	clearMfeAuthState();
	try {
		const result = keycloak.login();
		if (result && typeof result.then === "function") {
			void result.catch(() => {
				loginRedirectInFlight = false;
			});
		}
	} catch {
		loginRedirectInFlight = false;
	}
}

/** Только для изоляции unit-тестов auth-flow. */
export function resetKeycloakLoginGuardForTests(): void {
	loginRedirectInFlight = false;
}

/** Полный logout: чистим локальное состояние и отдаём управление Keycloak. */
export function performMfeLogout(props?: MfeAuthHostProps | null): void {
	clearMfeAuthState();
	props?.onLogout?.();

	const keycloak = resolveKeycloakInstance(props);
	if (keycloak?.logout) {
		void keycloak.logout();
		return;
	}

	if (typeof window !== "undefined") {
		window.location.reload();
	}
}
