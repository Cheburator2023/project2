import { describe, expect, it } from "vitest";
import {
	isReleaseDockLayout,
	isReleaseDockPanelId,
	RELEASE_DOCK_PANEL_IDS,
} from "./releaseDockLayout.util";

describe("release dock layout", () => {
	it("keeps only the tasks and board panels for a release workspace", () => {
		expect(RELEASE_DOCK_PANEL_IDS).toEqual(["tasks", "board"]);
		expect(isReleaseDockPanelId("tasks")).toBe(true);
		expect(isReleaseDockPanelId("timeline")).toBe(false);
	});

	it("rejects a layout that still has planning-only panels", () => {
		expect(
			isReleaseDockLayout({
				grid: { root: {} },
				panels: { tasks: {}, board: {}, release: {} },
			}),
		).toBe(false);
		expect(
			isReleaseDockLayout({
				grid: { root: {} },
				panels: { tasks: {}, board: {} },
			}),
		).toBe(true);
	});
});
