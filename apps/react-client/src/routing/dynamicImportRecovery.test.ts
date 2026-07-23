import { afterEach, describe, expect, it, vi } from "vitest";
import {
	isDynamicImportFetchError,
	importWithDynamicRecovery,
	resetDynamicImportRecoveryForTests,
} from "./dynamicImportRecovery";

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

describe("importWithDynamicRecovery", () => {
	afterEach(() => {
		resetDynamicImportRecoveryForTests();
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	it("does not reload twice for the same build revision", async () => {
		const revision = process.env.GIT_REVISION ?? "unknown";
		const store: Record<string, string> = {
			"dynamic-import:auto-reload": JSON.stringify({
				revision,
				label: "prev",
				at: Date.now(),
			}),
		};
		vi.stubGlobal("sessionStorage", {
			getItem: (key: string) => store[key] ?? null,
			setItem: (key: string, value: string) => {
				store[key] = value;
			},
			removeItem: (key: string) => {
				delete store[key];
			},
		});
		const reload = vi.fn();
		vi.stubGlobal("location", { reload });

		const err = new TypeError(
			"Failed to fetch dynamically imported module: http://localhost:8000/src/x.tsx",
		);
		await expect(
			importWithDynamicRecovery(() => Promise.reject(err), { label: "test" }),
		).rejects.toBe(err);

		expect(reload).not.toHaveBeenCalled();
	});

	it("skips full page reload when NODE_ENV is not production", async () => {
		vi.stubEnv("NODE_ENV", "development");
		vi.resetModules();
		const mod = await import("./dynamicImportRecovery");
		const reload = vi.fn();
		vi.stubGlobal("location", { reload });
		vi.stubGlobal("sessionStorage", {
			getItem: () => null,
			setItem: vi.fn(),
			removeItem: vi.fn(),
		});

		const err = new TypeError(
			"Failed to fetch dynamically imported module: http://localhost:8000/src/x.tsx",
		);
		await expect(
			mod.importWithDynamicRecovery(() => Promise.reject(err), {
				label: "test",
			}),
		).rejects.toBe(err);

		expect(reload).not.toHaveBeenCalled();
		mod.resetDynamicImportRecoveryForTests();
		vi.unstubAllEnvs();
	});

	it("skips reload when NODE_ENV is undefined (webpack DefinePlugin gap)", async () => {
		vi.stubEnv("NODE_ENV", undefined);
		vi.resetModules();
		const mod = await import("./dynamicImportRecovery");
		const reload = vi.fn();
		vi.stubGlobal("location", { reload });
		vi.stubGlobal("sessionStorage", {
			getItem: () => null,
			setItem: vi.fn(),
			removeItem: vi.fn(),
		});

		const err = new Error("Loading chunk layout-admin failed.");
		err.name = "ChunkLoadError";
		await expect(
			mod.importWithDynamicRecovery(() => Promise.reject(err), {
				label: "test",
			}),
		).rejects.toBe(err);

		expect(reload).not.toHaveBeenCalled();
		mod.resetDynamicImportRecoveryForTests();
		vi.unstubAllEnvs();
	});
});
