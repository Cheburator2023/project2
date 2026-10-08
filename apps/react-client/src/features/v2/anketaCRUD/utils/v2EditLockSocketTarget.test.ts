import { V2_EDIT_LOCK_WS_NAMESPACE } from "@smart-anketa/api-contract";
import { resolveV2EditLockSocketTarget } from "./v2EditLockSocketTarget";

describe("resolveV2EditLockSocketTarget", () => {
	it("keeps Socket.IO namespace off the HTTP API prefix", () => {
		const target = resolveV2EditLockSocketTarget(
			"https://shell.example/proxy/smart-anketa-api",
			"https://shell.example",
		);
		expect(target.uri).toBe(
			`https://shell.example${V2_EDIT_LOCK_WS_NAMESPACE}`,
		);
		expect(target.path).toBe("/proxy/smart-anketa-api/socket.io");
	});

	it("keeps Socket.IO namespace off a relative shell proxy path", () => {
		const target = resolveV2EditLockSocketTarget(
			"/proxy/smart-anketa-api",
			"https://shell.example",
		);
		expect(target.uri).toBe(
			`https://shell.example${V2_EDIT_LOCK_WS_NAMESPACE}`,
		);
		expect(target.path).toBe("/proxy/smart-anketa-api/socket.io");
	});

	it("uses /socket.io when API is a bare origin", () => {
		const target = resolveV2EditLockSocketTarget(
			"http://localhost:3000",
			"http://localhost:8004",
		);
		expect(target.uri).toBe(`http://localhost:3000${V2_EDIT_LOCK_WS_NAMESPACE}`);
		expect(target.path).toBe("/socket.io");
	});

	it("keeps a different namespace off the HTTP API prefix", () => {
		const target = resolveV2EditLockSocketTarget(
			"https://shell.example/proxy/smart-anketa-api",
			"https://shell.example",
			"/locks",
		);
		expect(target.uri).toBe("https://shell.example/locks");
		expect(target.path).toBe("/proxy/smart-anketa-api/socket.io");
	});
});
