import {
	describeServerUnreachable,
	isServerUnreachableError,
} from "./isServerUnreachableError";

describe("isServerUnreachableError", () => {
	it("treats a missing HTTP response as a dead API process", () => {
		expect(
			isServerUnreachableError({
				code: "ERR_NETWORK",
				message: "Network Error",
			}),
		).toBe(true);
		expect(describeServerUnreachable({ code: "ERR_NETWORK" })).toBe(
			"Нет ответа API",
		);
	});

	it("treats gateway statuses as the process being down, not a handler bug", () => {
		expect(
			isServerUnreachableError({ response: { status: 502 } }),
		).toBe(true);
		expect(
			isServerUnreachableError({ response: { status: 503 } }),
		).toBe(true);
		expect(
			isServerUnreachableError({ response: { status: 504 } }),
		).toBe(true);
		expect(describeServerUnreachable({ response: { status: 502 } })).toBe(
			"HTTP 502",
		);
	});

	it("does not treat a live Nest 500 or a canceled request as a global outage", () => {
		expect(
			isServerUnreachableError({
				response: { status: 500, data: { message: "boom" } },
			}),
		).toBe(false);
		expect(
			isServerUnreachableError({
				response: { status: 404 },
			}),
		).toBe(false);
		expect(isServerUnreachableError({ code: "ERR_CANCELED" })).toBe(false);
		expect(isServerUnreachableError({ code: "ECONNABORTED" })).toBe(false);
	});
});
