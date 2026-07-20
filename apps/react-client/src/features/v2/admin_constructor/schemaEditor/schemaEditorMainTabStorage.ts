import {
	CALCULATION_PANEL_ID,
	DOCK_PANEL_HEADINGS,
	PREVIEW_PANEL_ID,
} from "./constants";
import type { SchemaEditorMainTab } from "./types";

const VALID_MAIN_TABS = new Set<string>(
	DOCK_PANEL_HEADINGS.map(([id]) => id),
);

function storageKey(templateId: string): string {
	return `v2.schemaEditor.mainTab:${templateId}`;
}

function normalizeStoredMainTab(raw: string): SchemaEditorMainTab | null {
	// Бывшая отдельная вкладка «Калькуляция» объединена с превью.
	if (raw === CALCULATION_PANEL_ID) return PREVIEW_PANEL_ID;
	if (!VALID_MAIN_TABS.has(raw)) return null;
	return raw as SchemaEditorMainTab;
}

export function readStoredSchemaEditorMainTab(
	templateId: string,
): SchemaEditorMainTab | null {
	if (!templateId) return null;
	try {
		const raw = sessionStorage.getItem(storageKey(templateId));
		if (!raw) return null;
		return normalizeStoredMainTab(raw);
	} catch {
		return null;
	}
}

export function writeStoredSchemaEditorMainTab(
	templateId: string,
	tab: SchemaEditorMainTab,
): void {
	if (!templateId) return;
	try {
		sessionStorage.setItem(storageKey(templateId), tab);
	} catch {
		// private mode / quota
	}
}
