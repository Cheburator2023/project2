import { describe, expect, it } from "vitest";
import { isServerNoticesEnabled } from "./serverNoticesFeatureFlag";

describe("isServerNoticesEnabled", () => {
	it("returns true only when ENABLE_SERVER_NOTICES is the string true", () => {
		expect(isServerNoticesEnabled()).toBe(
			process.env.ENABLE_SERVER_NOTICES === "true",
		);
	});
});
