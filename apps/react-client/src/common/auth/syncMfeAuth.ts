import { useAuthStore } from "@react-client/common/store/authStore";

export type MfeAuthHostProps = {
	token?: string;
	keycloak?: unknown;
};

type KeycloakLike = {
	token?: string;
	accessToken?: string;
	idToken?: string;
	updateToken?: (minValidity?: number) => Promise<boolean>;
};

function asKeycloak(value: unknown): KeycloakLike | null {
	if (!value || typeof value !== "object") return null;
	return value as KeycloakLike;
}

function tokenFromKeycloak(keycloak: unknown): string | null {
	const kc = asKeycloak(keycloak);
	if (!kc) return null;
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

function resolveKeycloakInstance(props?: MfeAuthHostProps | null): KeycloakLike | null {
	return (
		asKeycloak(props?.keycloak) ??
		(typeof window !== "undefined" ? asKeycloak(window.keycloak) : null)
	);
}

/** JWT с host (props / window / keycloak / cookie). */
export function resolveHostAccessToken(
	props?: MfeAuthHostProps | null,
): string | null {
	const fromProps = props?.token?.trim();
	if (fromProps) return fromProps;

	const fromKeycloak = tokenFromKeycloak(props?.keycloak);
	if (fromKeycloak) return fromKeycloak;

	if (typeof window !== "undefined") {
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
	return useAuthStore.getState().accessToken;
}

/** Просит Keycloak обновить access token и кладёт результат в store. */
export async function refreshHostAccessToken(
	props?: MfeAuthHostProps | null,
): Promise<string | null> {
	const keycloak = resolveKeycloakInstance(props);
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
			// refresh через Keycloak не удался — пробуем прочитать текущий host token
		}
	}

	const token = resolveHostAccessToken(props);
	if (token) {
		useAuthStore.getState().setAccessToken(token);
		return token;
	}

	useAuthStore.getState().setAccessToken(null);
	return null;
}

/** Сохраняет токен host в zustand → apiClient добавит Authorization: Bearer. */
export function syncMfeAuthFromHost(
	props?: MfeAuthHostProps | null,
): string | null {
	const token = resolveFreshAccessToken(props);
	return token;
}
