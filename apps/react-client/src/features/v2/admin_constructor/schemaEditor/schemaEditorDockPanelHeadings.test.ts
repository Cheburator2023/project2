import { afterEach, describe, expect, it, vi } from "vitest";

import {
	ALL_DOCK_PANEL_HEADINGS,
	DOCK_PANEL_HEADINGS,
	RELATIONS_PANEL_ID,
} from "./constants";

describe("schemaEditor dock panel headings (PRJ-COMMON-69)", () => {
	afterEach(() => {
		vi.unstubAllEnvs();
		vi.resetModules();
	});

	it("keeps relations in the full (type-source) panel list", () => {
		expect(ALL_DOCK_PANEL_HEADINGS.map(([id]) => id)).toContain(
			RELATIONS_PANEL_ID,
		);
	});

	it("hides the relations tab by default (flag absent)", () => {
		vi.stubEnv("ENABLE_RELATIONS_GRAPH", undefined);
		expect(DOCK_PANEL_HEADINGS.map(([id]) => id)).not.toContain(
			RELATIONS_PANEL_ID,
		);
	});

	it("restores the relations tab when ENABLE_RELATIONS_GRAPH=true", async () => {
		vi.resetModules();
		vi.stubEnv("ENABLE_RELATIONS_GRAPH", "true");

		const restored = await import("./constants");
		expect(restored.DOCK_PANEL_HEADINGS.map(([id]) => id)).toContain(
			RELATIONS_PANEL_ID,
		);
	});
});
