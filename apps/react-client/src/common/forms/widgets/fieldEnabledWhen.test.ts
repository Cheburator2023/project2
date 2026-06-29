import { describe, expect, it } from "vitest";
import { resolveFieldEnabledWhen } from "./fieldEnabledWhen";

describe("resolveFieldEnabledWhen", () => {
	it("returns true when enabledWhenVar is not set", () => {
		expect(resolveFieldEnabledWhen({}, undefined)).toBe(true);
	});

	it("enables field only when source checkbox is true", () => {
		const options = {
			enabledWhenVar: "detailInfo.parameters.streamsOutsideDADM",
		};
		expect(
			resolveFieldEnabledWhen(
				{ detailInfo: { parameters: { streamsOutsideDADM: false } } },
				options,
			),
		).toBe(false);
		expect(
			resolveFieldEnabledWhen(
				{ detailInfo: { parameters: { streamsOutsideDADM: true } } },
				options,
			),
		).toBe(true);
	});
});
