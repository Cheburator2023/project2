import type { DockviewApi } from "dockview-react";

export const PLANNING_DOCK_PANEL_IDS = [
	"tasks",
	"board",
	"timeline",
	"release",
] as const;

export type PlanningDockPanelId = (typeof PLANNING_DOCK_PANEL_IDS)[number];

export const PLANNING_DOCK_PANEL_TITLES: Record<PlanningDockPanelId, string> = {
	tasks: "Задачи",
	board: "Доска",
	timeline: "Таймлайн",
	release: "Релизы",
};

export type PlanningLayoutPresetId = "roadmap" | "empty";

type SerializedDockLayout = ReturnType<DockviewApi["toJSON"]>;

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function isPlanningDockPanelId(
	value: string,
): value is PlanningDockPanelId {
	return (PLANNING_DOCK_PANEL_IDS as readonly string[]).includes(value);
}

export function isPlanningDockLayout(
	value: unknown,
): value is SerializedDockLayout {
	if (!isRecord(value)) return false;
	if (!isRecord(value.panels) || !isRecord(value.grid)) return false;
	const panelIds = Object.keys(value.panels);
	if (!panelIds.length) return false;
	return panelIds.every((id) => isPlanningDockPanelId(id));
}

export function getMissingPlanningDockPanelIds(
	api: DockviewApi,
): PlanningDockPanelId[] {
	const openIds = new Set(api.panels.map((panel) => panel.id));
	return PLANNING_DOCK_PANEL_IDS.filter((id) => !openIds.has(id));
}

export function addPlanningDockPanel(
	api: DockviewApi,
	panelId: PlanningDockPanelId,
) {
	if (api.getPanel(panelId)) return;
	const referencePanel = api.panels[0]?.id;
	api.addPanel({
		id: panelId,
		component: panelId,
		title: PLANNING_DOCK_PANEL_TITLES[panelId],
		...(referencePanel ? { position: { referencePanel } } : {}),
	});
}

export function applyPlanningDockPreset(
	api: DockviewApi,
	preset: PlanningLayoutPresetId,
) {
	api.clear();

	if (preset === "empty") {
		api.addPanel({
			id: "tasks",
			component: "tasks",
			title: PLANNING_DOCK_PANEL_TITLES.tasks,
		});
		return;
	}

	api.addPanel({
		id: "timeline",
		component: "timeline",
		title: PLANNING_DOCK_PANEL_TITLES.timeline,
	});
	api.addPanel({
		id: "tasks",
		component: "tasks",
		title: PLANNING_DOCK_PANEL_TITLES.tasks,
		position: { referencePanel: "timeline", direction: "above" },
	});
	api.addPanel({
		id: "board",
		component: "board",
		title: PLANNING_DOCK_PANEL_TITLES.board,
		position: { referencePanel: "tasks", direction: "right" },
	});
	api.addPanel({
		id: "release",
		component: "release",
		title: PLANNING_DOCK_PANEL_TITLES.release,
		position: { referencePanel: "tasks", direction: "within" },
	});
}

export function restorePlanningDockLayout(
	api: DockviewApi,
	layout: unknown,
): boolean {
	if (!isPlanningDockLayout(layout)) return false;
	try {
		api.fromJSON(layout);
		return true;
	} catch {
		return false;
	}
}
