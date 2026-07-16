import { DOCK_PANEL_HEADINGS } from "./constants";
import type { SchemaEditorMainTab } from "./types";

const VALID_MAIN_TABS = new Set<string>(
	DOCK_PANEL_HEADINGS.map(([id]) => id),
);

function storageKey(templateId: string): string {
	return `v2.schemaEditor.mainTab:${templateId}`;
}

export function readStoredSchemaEditorMainTab(
	templateId: string,
): SchemaEditorMainTab | null {
	if (!templateId) return null;
	try {
		const raw = sessionStorage.getItem(storageKey(templateId));
		if (!raw || !VALID_MAIN_TABS.has(raw)) return null;
		return raw as SchemaEditorMainTab;
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
