import { describe, expect, it } from "vitest";
import {
	GOD_MODE_ACCESS_TOKEN,
	isGodModeAccessToken,
	isNoRolesGodMode,
} from "./godMode";

describe("isNoRolesGodMode", () => {
	it("returns true only when NO_ROLES is the string true", () => {
		expect(isNoRolesGodMode()).toBe(process.env.NO_ROLES === "true");
	});
});

describe("isGodModeAccessToken", () => {
	it("detects god mode token", () => {
		expect(isGodModeAccessToken(GOD_MODE_ACCESS_TOKEN)).toBe(true);
		expect(isGodModeAccessToken("real-jwt")).toBe(false);
		expect(isGodModeAccessToken(null)).toBe(false);
	});
});
