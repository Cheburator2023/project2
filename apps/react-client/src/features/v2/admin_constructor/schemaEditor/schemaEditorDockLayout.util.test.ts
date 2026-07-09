import { describe, expect, it, vi, beforeEach } from "vitest";
import {
	SCHEMA_EDITOR_DOCK_LAYOUT_STORAGE_KEY,
	buildDefaultDockLayout,
	clearSchemaEditorDockLayoutStorage,
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
			"preview",
			"relations",
			"calculation",
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
