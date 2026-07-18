import type { DockviewApi } from "dockview-react";
import {
	DOCK_PANEL_HEADINGS,
	MAIN_DOCK_PANEL_ID,
} from "./constants";
import { WORKSPACE_PANEL_IDS } from "./workspacePanels";

export const SCHEMA_EDITOR_DOCK_LAYOUT_STORAGE_KEY =
	"v2.schemaEditor.dockLayout.v3";

const KNOWN_PANEL_IDS = new Set<string>(WORKSPACE_PANEL_IDS);

const DOCK_PANEL_TITLE_BY_ID = new Map<string, string>(
	DOCK_PANEL_HEADINGS.map(([id, title]) => [id, title]),
);

type SerializedDockLayout = ReturnType<DockviewApi["toJSON"]>;

export function getDockPanelTitle(panelId: string): string {
	return DOCK_PANEL_TITLE_BY_ID.get(panelId) ?? panelId;
}

export function getMissingDockPanelIds(api: DockviewApi): string[] {
	const openIds = new Set(api.panels.map((panel) => panel.id));
	return WORKSPACE_PANEL_IDS.filter((id) => !openIds.has(id));
}

function resolveDockPanelReference(api: DockviewApi): string | undefined {
	if (api.getPanel(MAIN_DOCK_PANEL_ID)) {
		return MAIN_DOCK_PANEL_ID;
	}
	return api.panels[0]?.id;
}

export function ensureDockPanel(
	api: DockviewApi,
	panelId: string,
	options?: { active?: boolean },
) {
	const existing = api.getPanel(panelId);
	if (existing) {
		return existing;
	}

	if (!KNOWN_PANEL_IDS.has(panelId)) {
		return undefined;
	}

	const referencePanel = resolveDockPanelReference(api);
	if (!referencePanel) {
		if (panelId !== MAIN_DOCK_PANEL_ID) {
			return undefined;
		}

		return api.addPanel({
			id: panelId,
			component: panelId,
			title: getDockPanelTitle(panelId),
			inactive: options?.active === false,
		});
	}

	return api.addPanel({
		id: panelId,
		component: panelId,
		title: getDockPanelTitle(panelId),
		position: { referencePanel },
		inactive: options?.active === false,
	});
}

/** Добавляет панели, отсутствующие в сохранённом layout (например, «Проблемы» после обновления). */
export function ensureAllMissingDockPanels(api: DockviewApi): string[] {
	const missing = getMissingDockPanelIds(api);
	for (const panelId of missing) {
		ensureDockPanel(api, panelId, { active: false });
	}
	return missing;
}

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
