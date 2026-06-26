/** Локальный режим без Keycloak: `NO_ROLES=true` на фронте и бэкенде. */
export function isNoRolesGodMode(): boolean {
	return process.env.NO_ROLES === "true";
}

export const GOD_MODE_ACCESS_TOKEN = "god-mode-token";

export function isGodModeAccessToken(token: string | null | undefined): boolean {
	return token === GOD_MODE_ACCESS_TOKEN;
}
