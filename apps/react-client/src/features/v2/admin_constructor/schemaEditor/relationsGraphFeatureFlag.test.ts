import { afterEach, describe, expect, it, vi } from "vitest";

import { isRelationsGraphEnabled } from "./relationsGraphFeatureFlag";

describe("isRelationsGraphEnabled", () => {
	afterEach(() => {
		vi.unstubAllEnvs();
		vi.unstubAllGlobals();
	});

	it("enables the relations graph only for the exact string 'true'", () => {
		vi.stubEnv("ENABLE_RELATIONS_GRAPH", "true");
		expect(isRelationsGraphEnabled()).toBe(true);
	});

	it.each(["", "false", "1", "TRUE", "True", "yes"])(
		"keeps the relations graph hidden for %j",
		(value) => {
			vi.stubEnv("ENABLE_RELATIONS_GRAPH", value);
			expect(isRelationsGraphEnabled()).toBe(false);
		},
	);

	it("keeps the relations graph hidden when the variable is absent", () => {
		vi.stubEnv("ENABLE_RELATIONS_GRAPH", undefined);
		expect(isRelationsGraphEnabled()).toBe(false);
	});

	it("does not throw and stays hidden when process is unavailable at runtime", () => {
		vi.stubGlobal("process", undefined);
		expect(() => isRelationsGraphEnabled()).not.toThrow();
		expect(isRelationsGraphEnabled()).toBe(false);
	});
});
