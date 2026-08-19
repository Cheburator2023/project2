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

	it("does not recurse forever on Socket.IO packets that point back at the socket", () => {
		const packet: { type: string; socket?: unknown } = { type: "message" };
		const socket = { packet, nsp: "/" };
		packet.socket = socket;

		expect(sanitizeWsLogArg(packet)).toEqual({
			type: "message",
			socket: {
				packet: "[Circular]",
				nsp: "/",
			},
		});
	});

	it("summarizes Error without instanceof, which overflows on some engine objects", () => {
		const err = new Error("transport close");
		expect(sanitizeWsLogArg(err)).toEqual({
			name: "Error",
			message: "transport close",
			stack: err.stack,
		});
	});
});
