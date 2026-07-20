import { describe, expect, it, vi, beforeEach } from "vitest";
import {
	SCHEMA_EDITOR_DOCK_LAYOUT_STORAGE_KEY,
	buildDefaultDockLayout,
	clearSchemaEditorDockLayoutStorage,
	ensureAllMissingDockPanels,
	ensureDockPanel,
	getMissingDockPanelIds,
	readSchemaEditorDockLayout,
	restoreSchemaEditorDockLayout,
	writeSchemaEditorDockLayout,
} from "./schemaEditorDockLayout.util";

function createLocalStorageMock() {
	const store = new Map<string, string>();
	return {
		getItem: (key: string) => store.get(key) ?? null,
		setItem: (key: string, value: string) => {
			store.set(key, value);
		},
		removeItem: (key: string) => {
			store.delete(key);
		},
		clear: () => {
			store.clear();
		},
	};
}

describe("schemaEditorDockLayout.util", () => {
	beforeEach(() => {
		vi.stubGlobal("localStorage", createLocalStorageMock());
		vi.restoreAllMocks();
	});

	it("round-trips layout through localStorage", () => {
		const layout = {
			grid: { root: {}, height: 600, width: 800, orientation: "HORIZONTAL" },
			panels: {
				designer: { id: "designer", title: "Конструктор" },
				json: { id: "json", title: "Редактор JSON" },
			},
		};

		writeSchemaEditorDockLayout(layout as never);
		expect(readSchemaEditorDockLayout()).toEqual(layout);
	});

	it("rejects unknown panel ids in saved layout", () => {
		writeSchemaEditorDockLayout({
			grid: { root: {} },
			panels: { unknownPanel: { id: "unknownPanel" } },
		} as never);

		expect(readSchemaEditorDockLayout()).toBeNull();
	});

	it("restoreSchemaEditorDockLayout loads saved layout into api", () => {
		const layout = {
			grid: { root: {} },
			panels: { designer: { id: "designer" } },
		};
		localStorage.setItem(
			SCHEMA_EDITOR_DOCK_LAYOUT_STORAGE_KEY,
			JSON.stringify(layout),
		);

		const fromJSON = vi.fn();
		expect(restoreSchemaEditorDockLayout({ fromJSON } as never)).toBe(true);
		expect(fromJSON).toHaveBeenCalledWith(layout);
	});

	it("buildDefaultDockLayout clears and adds all workspace panels", () => {
		const panels: Array<{ id: string; title: string }> = [];
		const api = {
			clear: vi.fn(),
			addPanel: vi.fn((opts: { id: string; title: string }) => {
				panels.push(opts);
			}),
			getPanel: vi.fn(() => ({ api: { setActive: vi.fn() } })),
		};

		buildDefaultDockLayout(api as never);

		expect(api.clear).toHaveBeenCalledTimes(1);
		expect(panels.map((p) => p.id)).toEqual([
			"designer",
			"json",
			"logic",
			"issues",
			"preview",
			"relations",
		]);
	});

	it("ensureDockPanel adds a missing panel next to the main panel", () => {
		const added: Array<{ id: string; inactive?: boolean; position?: unknown }> =
			[];
		const api = {
			getPanel: vi.fn((id: string) =>
				id === "designer" ? { id: "designer" } : undefined,
			),
			addPanel: vi.fn((opts: { id: string; inactive?: boolean; position?: unknown }) => {
				added.push(opts);
				return { id: opts.id };
			}),
			panels: [{ id: "designer" }],
		};

		const panel = ensureDockPanel(api as never, "issues", { active: false });

		expect(panel?.id).toBe("issues");
		expect(added).toEqual([
			expect.objectContaining({
				id: "issues",
				inactive: true,
				position: { referencePanel: "designer" },
			}),
		]);
	});

	it("ensureDockPanel adds the main panel to an empty dock without reference", () => {
		const api = {
			getPanel: vi.fn(() => undefined),
			addPanel: vi.fn((opts: { id: string }) => ({ id: opts.id })),
			panels: [],
		};

		const panel = ensureDockPanel(api as never, "designer");

		expect(panel?.id).toBe("designer");
		expect(api.addPanel).toHaveBeenCalledWith(
			expect.not.objectContaining({ position: expect.anything() }),
		);
	});

	it("ensureDockPanel skips non-main panels while the dock is still empty", () => {
		const api = {
			getPanel: vi.fn(() => undefined),
			addPanel: vi.fn(),
			panels: [],
		};

		expect(ensureDockPanel(api as never, "issues")).toBeUndefined();
		expect(api.addPanel).not.toHaveBeenCalled();
	});

	it("ensureDockPanel uses the first open panel when designer is absent", () => {
		const api = {
			getPanel: vi.fn((id: string) =>
				id === "json" ? { id: "json" } : undefined,
			),
			addPanel: vi.fn((opts: { id: string; position?: { referencePanel: string } }) => ({
				id: opts.id,
			})),
			panels: [{ id: "json" }],
		};

		ensureDockPanel(api as never, "issues");

		expect(api.addPanel).toHaveBeenCalledWith(
			expect.objectContaining({
				id: "issues",
				position: { referencePanel: "json" },
			}),
		);
	});

	it("ensureAllMissingDockPanels adds every workspace panel that is not open", () => {
		const api = {
			panels: [{ id: "designer" }, { id: "json" }],
			getPanel: vi.fn((id: string) =>
				["designer", "json"].includes(id) ? { id } : undefined,
			),
			addPanel: vi.fn((opts: { id: string }) => ({ id: opts.id })),
		};

		const added = ensureAllMissingDockPanels(api as never);

		expect(added).toEqual([
			"logic",
			"issues",
			"preview",
			"relations",
		]);
		expect(api.addPanel).toHaveBeenCalledTimes(4);
	});

	it("getMissingDockPanelIds returns ids absent from the current dock", () => {
		const api = {
			panels: [{ id: "designer" }],
		};

		expect(getMissingDockPanelIds(api as never)).toEqual([
			"json",
			"logic",
			"issues",
			"preview",
			"relations",
		]);
	});

	it("clearSchemaEditorDockLayoutStorage removes saved layout", () => {
		writeSchemaEditorDockLayout({
			grid: { root: {} },
			panels: { designer: { id: "designer" } },
		} as never);

		clearSchemaEditorDockLayoutStorage();
		expect(readSchemaEditorDockLayout()).toBeNull();
	});
});
