import type { T_KEYCLOAK_USER } from "types";
import { describe, expect, it } from "vitest";
import {
	getKeycloakUserDisplayName,
	getKeycloakUserInitial,
	normalizeKeycloakUser,
	repairUtf8Mojibake,
} from "./keycloakUserText.util";

function makeKeycloakUser(
	overrides: Partial<T_KEYCLOAK_USER> = {},
): T_KEYCLOAK_USER {
	return {
		exp: 0,
		iat: 0,
		auth_time: 0,
		jti: "test-jti",
		iss: "test-iss",
		aud: "test-aud",
		sub: "test-sub",
		typ: "Bearer",
		azp: "test-azp",
		nonce: "test-nonce",
		session_state: "test-session",
		acr: "1",
		"allowed-origins": [],
		realm_access: { roles: [] },
		resource_access: { "realm-management": { roles: [] } },
		scope: "openid",
		email_verified: true,
		roles: [],
		name: "",
		groups: [],
		preferred_username: "user",
		given_name: "",
		family_name: "",
		email: "",
		...overrides,
	};
}

describe("repairUtf8Mojibake", () => {
	it("repairs UTF-8 cyrillic read as latin1", () => {
		const mojibake = String.fromCharCode(
			0xd0, 0x98, 0xd0, 0xb2, 0xd0, 0xb0, 0xd0, 0xbd, 0x20, 0xd0, 0x9f,
			0xd0, 0xb5, 0xd1, 0x82, 0xd1, 0x80, 0xd0, 0xbe, 0xd0, 0xb2,
		);
		expect(repairUtf8Mojibake(mojibake)).toBe("Иван Петров");
	});

	it("keeps valid cyrillic unchanged", () => {
		expect(repairUtf8Mojibake("\u0418\u0432\u0430\u043d")).toBe(
			"\u0418\u0432\u0430\u043d",
		);
	});

	it("keeps ascii unchanged", () => {
		expect(repairUtf8Mojibake("john.doe")).toBe("john.doe");
	});
});

describe("normalizeKeycloakUser", () => {
	it("repairs name parts from host payload", () => {
		const brokenGiven = String.fromCharCode(0xd0, 0x98, 0xd0, 0xb2, 0xd0, 0xb0, 0xd0, 0xbd);
		const brokenFamily = String.fromCharCode(
			0xd0, 0x9f, 0xd0, 0xb5, 0xd1, 0x82, 0xd1, 0x80, 0xd0, 0xbe, 0xd0, 0xb2,
		);

		const normalized = normalizeKeycloakUser(
			makeKeycloakUser({
				given_name: brokenGiven,
				family_name: brokenFamily,
				name: "",
				preferred_username: "ivan",
				email: "ivan@example.com",
			}),
		);

		expect(normalized?.given_name).toBe("\u0418\u0432\u0430\u043d");
		expect(normalized?.family_name).toBe(
			"\u041f\u0435\u0442\u0440\u043e\u0432",
		);
		expect(normalized?.name).toBe("\u041f\u0435\u0442\u0440\u043e\u0432 \u0418\u0432\u0430\u043d");
	});
});

describe("getKeycloakUserDisplayName", () => {
	it("prefers full name over username", () => {
		expect(
			getKeycloakUserDisplayName({
				name: "\u041f\u0435\u0442\u0440\u043e\u0432 \u0418\u0432\u0430\u043d",
				family_name: "\u041f\u0435\u0442\u0440\u043e\u0432",
				given_name: "\u0418\u0432\u0430\u043d",
				preferred_username: "ivan",
			}),
		).toBe("\u041f\u0435\u0442\u0440\u043e\u0432 \u0418\u0432\u0430\u043d");
	});
});

describe("getKeycloakUserInitial", () => {
	it("uses first letter of display name", () => {
		expect(
			getKeycloakUserInitial({
				name: "\u041f\u0435\u0442\u0440\u043e\u0432 \u0418\u0432\u0430\u043d",
				family_name: "\u041f\u0435\u0442\u0440\u043e\u0432",
				given_name: "\u0418\u0432\u0430\u043d",
				preferred_username: "ivan",
			}),
		).toBe("\u041f");
	});
});
