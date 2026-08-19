import { sanitizeWsLogArg } from "./bindSocketIoDebugLog";

describe("sanitizeWsLogArg", () => {
	it("redacts handshake tokens so full WS logs can stay in the browser console", () => {
		expect(
			sanitizeWsLogArg({
				lockedByLabel: "ivan",
				token: "eyJhbGciOiJIUzI1NiJ9.payload.sig",
				nested: { Authorization: "Bearer secret" },
			}),
		).toEqual({
			lockedByLabel: "ivan",
			token: "[redacted]",
			nested: { Authorization: "[redacted]" },
		});
	});
});
