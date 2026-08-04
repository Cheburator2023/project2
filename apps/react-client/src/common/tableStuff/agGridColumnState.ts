import type { ColumnState } from "ag-grid-community";

const STORAGE_PREFIX = "smart_anketa:ag-grid-column-state:";

export const TRACKER_AG_GRID_STATE_KEYS = [
	"tracker.tasks",
	"tracker.my-tasks",
	"tracker.trash",
	"tracker.projects",
	"tracker.boards",
	"tracker.assignees",
	"tracker.customers",
	"tracker.settings-assignees",
	"tracker.sprints",
	"tracker.supersprints",
	"tracker.streams",
] as const;

export type TrackerAgGridStateKey = (typeof TRACKER_AG_GRID_STATE_KEYS)[number];

export const ALL_AG_GRID_STATE_KEYS = [
	...TRACKER_AG_GRID_STATE_KEYS,
	"v1.home.calculations",
	"v2.questionnaires",
	"v2.dictionaries",
	"v2.dictionaries.panel",
	"v2.dictionary.items",
	"v2.dictionary.field-usage",
	"v2.templates",
	"v2.template-history",
	"v1.calculation-result",
	"v1.calculation-result-preview",
] as const;

export type AgGridStateKey = (typeof ALL_AG_GRID_STATE_KEYS)[number];

function storageKey(gridId: string): string {
	return `${STORAGE_PREFIX}${gridId}`;
}

export function loadAgGridColumnState(gridId: string): ColumnState[] | null {
	if (typeof window === "undefined") return null;
	try {
		const raw = window.localStorage.getItem(storageKey(gridId));
		if (!raw) return null;
		const parsed = JSON.parse(raw) as unknown;
		if (!Array.isArray(parsed)) return null;
		return parsed as ColumnState[];
	} catch {
		return null;
	}
}

export function saveAgGridColumnState(
	gridId: string,
	columnState: ColumnState[],
): void {
	if (typeof window === "undefined") return;
	try {
		window.localStorage.setItem(
			storageKey(gridId),
			JSON.stringify(columnState),
		);
	} catch {
		// ignore quota errors
	}
}

export function clearAgGridColumnState(gridId: string): void {
	if (typeof window === "undefined") return;
	window.localStorage.removeItem(storageKey(gridId));
}

export function clearAgGridColumnStates(gridIds: readonly string[]): void {
	for (const gridId of gridIds) {
		clearAgGridColumnState(gridId);
	}
}

export function clearAllAgGridColumnStates(): void {
	if (typeof window === "undefined") return;
	const keysToRemove: string[] = [];
	for (let index = 0; index < window.localStorage.length; index += 1) {
		const key = window.localStorage.key(index);
		if (key?.startsWith(STORAGE_PREFIX)) {
			keysToRemove.push(key);
		}
	}
	for (const key of keysToRemove) {
		window.localStorage.removeItem(key);
	}
}

export function applyAgGridColumnState(
	gridId: string,
	apply: (state: ColumnState[]) => void,
): boolean {
	const saved = loadAgGridColumnState(gridId);
	if (!saved?.length) return false;
	apply(saved);
	return true;
}
