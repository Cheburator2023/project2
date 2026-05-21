import { useAuthStore } from "@react-client/common/store/authStore";

export type MfeAuthHostProps = {
	token?: string;
	keycloak?: unknown;
};

function tokenFromKeycloak(keycloak: unknown): string | null {
	if (!keycloak || typeof keycloak !== "object") return null;
	const kc = keycloak as Record<string, unknown>;
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

/** Сохраняет токен host в zustand → apiClient добавит Authorization: Bearer. */
export function syncMfeAuthFromHost(props?: MfeAuthHostProps | null): string | null {
	const token = resolveHostAccessToken(props);
	if (token) {
		useAuthStore.getState().setAccessToken(token);
	}
	return token;
}
