import { describe, expect, it } from "vitest";
import {
	isPlanningDockLayout,
	isPlanningDockPanelId,
	PLANNING_DOCK_PANEL_IDS,
} from "./planningDockLayout.util";

describe("planning dock layout", () => {
	it("accepts known panel ids", () => {
		expect(PLANNING_DOCK_PANEL_IDS).toContain("tasks");
		expect(isPlanningDockPanelId("board")).toBe(true);
		expect(isPlanningDockPanelId("assignees")).toBe(true);
		expect(isPlanningDockPanelId("unknown")).toBe(false);
	});

	it("rejects layouts with foreign panels", () => {
		expect(
			isPlanningDockLayout({
				grid: { root: {} },
				panels: { tasks: {}, ghost: {} },
			}),
		).toBe(false);
		expect(
			isPlanningDockLayout({
				grid: { root: {} },
				panels: { tasks: {} },
			}),
		).toBe(true);
	});
});
