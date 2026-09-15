import type { DockviewApi } from "dockview-react";

export const RELEASE_DOCK_PANEL_IDS = ["tasks", "board"] as const;

export type ReleaseDockPanelId = (typeof RELEASE_DOCK_PANEL_IDS)[number];

export const RELEASE_DOCK_PANEL_TITLES: Record<ReleaseDockPanelId, string> = {
	tasks: "Задачи релиза",
	board: "Доски",
};

type SerializedDockLayout = ReturnType<DockviewApi["toJSON"]>;

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function isReleaseDockPanelId(
	value: string,
): value is ReleaseDockPanelId {
	return (RELEASE_DOCK_PANEL_IDS as readonly string[]).includes(value);
}

export function isReleaseDockLayout(
	value: unknown,
): value is SerializedDockLayout {
	if (!isRecord(value)) return false;
	if (!isRecord(value.panels) || !isRecord(value.grid)) return false;
	const panelIds = Object.keys(value.panels);
	if (!panelIds.length) return false;
	return panelIds.every((id) => isReleaseDockPanelId(id));
}

export function applyReleaseDockLayout(api: DockviewApi) {
	api.clear();
	api.addPanel({
		id: "tasks",
		component: "tasks",
		title: RELEASE_DOCK_PANEL_TITLES.tasks,
	});
	api.addPanel({
		id: "board",
		component: "board",
		title: RELEASE_DOCK_PANEL_TITLES.board,
		position: { referencePanel: "tasks", direction: "right" },
	});
}

export function restoreReleaseDockLayout(
	api: DockviewApi,
	layout: unknown,
): boolean {
	if (!isReleaseDockLayout(layout)) return false;
	try {
		api.fromJSON(layout);
		return true;
	} catch {
		return false;
	}
}

export function releaseDockLayoutStorageKey(releaseId: string) {
	return `smart-anketa:release:${releaseId}:dockLayout`;
}

export function loadReleaseDockLayout(releaseId: string): unknown | null {
	try {
		const raw = sessionStorage.getItem(releaseDockLayoutStorageKey(releaseId));
		if (!raw) return null;
		return JSON.parse(raw) as unknown;
	} catch {
		return null;
	}
}

export function saveReleaseDockLayout(
	releaseId: string,
	layout: unknown,
): void {
	try {
		sessionStorage.setItem(
			releaseDockLayoutStorageKey(releaseId),
			JSON.stringify(layout),
		);
	} catch {
		/* quota */
	}
}
