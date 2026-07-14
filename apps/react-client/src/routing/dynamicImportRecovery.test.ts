import { describe, expect, it } from "vitest";
import { isDynamicImportFetchError } from "./dynamicImportRecovery";

describe("isDynamicImportFetchError", () => {
	it("detects vite dynamic import failures", () => {
		expect(
			isDynamicImportFetchError(
				new TypeError(
					"Failed to fetch dynamically imported module: http://localhost:8004/src/features/v2/admin/layouts/AdminLayout.tsx",
				),
			),
		).toBe(true);
	});

	it("detects webpack chunk load failures", () => {
		const error = new Error("Loading chunk layout-admin failed.");
		error.name = "ChunkLoadError";
		expect(isDynamicImportFetchError(error)).toBe(true);
	});

	it("ignores unrelated errors", () => {
		expect(isDynamicImportFetchError(new Error("Network request failed"))).toBe(
			false,
		);
	});
});
