import type { T_KEYCLOAK_USER } from "types";

const CYRILLIC_RE = /[\u0400-\u04FF]/;
const MOJIBAKE_RE = /[\u00C0-\u00FF]/;

/**
 * Keycloak/host иногда отдаёт UTF-8 ФИО как latin1-строку (Ð˜Ð²Ð°Ð…).
 * Чиним только если после decode появилась кириллица.
 */
export function repairUtf8Mojibake(value: string | null | undefined): string {
	const trimmed = value?.trim() ?? "";
	if (!trimmed) return "";
	if (CYRILLIC_RE.test(trimmed)) return trimmed;
	if (!MOJIBAKE_RE.test(trimmed)) return trimmed;

	try {
		const bytes = Uint8Array.from(trimmed, (char) => char.charCodeAt(0) & 0xff);
		const decoded = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
		return CYRILLIC_RE.test(decoded) ? decoded : trimmed;
	} catch {
		return trimmed;
	}
}

function repairUserTextField(value: string | null | undefined): string {
	return repairUtf8Mojibake(value);
}

export function normalizeKeycloakUser(
	user: T_KEYCLOAK_USER | undefined | null,
): T_KEYCLOAK_USER | undefined {
	if (!user) return undefined;

	const given_name = repairUserTextField(user.given_name);
	const family_name = repairUserTextField(user.family_name);
	const preferred_username = repairUserTextField(user.preferred_username);
	const email = repairUserTextField(user.email);
	const nameFromParts = `${family_name} ${given_name}`.trim();
	const name = repairUserTextField(user.name) || nameFromParts;

	return {
		...user,
		given_name,
		family_name,
		preferred_username,
		email,
		name,
	};
}

export function isSameKeycloakUser(
	left: T_KEYCLOAK_USER | undefined | null,
	right: T_KEYCLOAK_USER | undefined | null,
): boolean {
	if (!left && !right) return true;
	if (!left || !right) return false;
	return (
		left.sub === right.sub &&
		left.given_name === right.given_name &&
		left.family_name === right.family_name &&
		left.name === right.name &&
		left.preferred_username === right.preferred_username &&
		left.email === right.email
	);
}

export function keycloakUserMemoKey(
	user: T_KEYCLOAK_USER | undefined | null,
): string {
	if (!user) return "";
	return [
		user.sub,
		user.given_name,
		user.family_name,
		user.name,
		user.preferred_username,
		user.email,
	].join("|");
}

export function getKeycloakUserDisplayName(
	user: Pick<
		T_KEYCLOAK_USER,
		"name" | "family_name" | "given_name" | "preferred_username" | "email"
	> | null | undefined,
	fallback = "Пользователь",
): string {
	if (!user) return fallback;

	const fromParts = `${user.family_name ?? ""} ${user.given_name ?? ""}`.trim();
	return (
		user.name?.trim() ||
		fromParts ||
		user.preferred_username?.trim() ||
		user.email?.trim() ||
		fallback
	);
}

export function getKeycloakUserInitial(
	user: Pick<
		T_KEYCLOAK_USER,
		"name" | "family_name" | "given_name" | "preferred_username"
	> | null | undefined,
	fallback = "?",
): string {
	const displayName = getKeycloakUserDisplayName(user, "");
	const source =
		displayName ||
		user?.preferred_username?.trim() ||
		user?.given_name?.trim() ||
		user?.family_name?.trim() ||
		"";
	const initial = [...source.trim()][0];
	return initial ? initial.toLocaleUpperCase("ru") : fallback;
}
