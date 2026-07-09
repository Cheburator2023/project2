import type { DockviewApi } from "dockview-react";
import {
	DOCK_PANEL_HEADINGS,
	MAIN_DOCK_PANEL_ID,
} from "./constants";
import { WORKSPACE_PANEL_IDS } from "./workspacePanels";

export const SCHEMA_EDITOR_DOCK_LAYOUT_STORAGE_KEY =
	"v2.schemaEditor.dockLayout.v1";

const KNOWN_PANEL_IDS = new Set<string>(WORKSPACE_PANEL_IDS);

type SerializedDockLayout = ReturnType<DockviewApi["toJSON"]>;

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function buildDefaultDockLayout(api: DockviewApi) {
	api.clear();

	const [mainPanel, ...otherPanels] = DOCK_PANEL_HEADINGS;

	api.addPanel({
		id: mainPanel[0],
		component: mainPanel[0],
		title: mainPanel[1],
	});

	for (const [id, panelTitle] of otherPanels) {
		api.addPanel({
			id,
			component: id,
			title: panelTitle,
			position: { referencePanel: MAIN_DOCK_PANEL_ID },
		});
	}

	api.getPanel(MAIN_DOCK_PANEL_ID)?.api.setActive();
}

export function readSchemaEditorDockLayout(): SerializedDockLayout | null {
	try {
		const raw = localStorage.getItem(SCHEMA_EDITOR_DOCK_LAYOUT_STORAGE_KEY);
		if (!raw) return null;

		const data = JSON.parse(raw) as SerializedDockLayout;
		if (!isRecord(data.panels)) return null;

		const panelIds = Object.keys(data.panels);
		if (panelIds.length === 0) return null;
		if (!panelIds.every((id) => KNOWN_PANEL_IDS.has(id))) return null;
		if (!isRecord(data.grid)) return null;

		return data;
	} catch {
		return null;
	}
}

export function writeSchemaEditorDockLayout(layout: SerializedDockLayout) {
	try {
		localStorage.setItem(
			SCHEMA_EDITOR_DOCK_LAYOUT_STORAGE_KEY,
			JSON.stringify(layout),
		);
	} catch {
		// quota / private mode
	}
}

export function clearSchemaEditorDockLayoutStorage() {
	try {
		localStorage.removeItem(SCHEMA_EDITOR_DOCK_LAYOUT_STORAGE_KEY);
	} catch {
		// ignore
	}
}

export function restoreSchemaEditorDockLayout(api: DockviewApi): boolean {
	const saved = readSchemaEditorDockLayout();
	if (!saved) return false;

	try {
		api.fromJSON(saved);
		return true;
	} catch {
		clearSchemaEditorDockLayoutStorage();
		return false;
	}
}
