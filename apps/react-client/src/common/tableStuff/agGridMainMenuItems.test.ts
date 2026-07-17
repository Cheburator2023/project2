import { describe, expect, it } from "vitest";
import {
	createAgGridMainMenuItems,
	getAgGridMainMenuItems,
} from "./agGridMainMenuItems";

describe("getAgGridMainMenuItems", () => {
	it("removes columnChooser from default menu items", () => {
		const items = getAgGridMainMenuItems({
			defaultItems: [
				"sortAscending",
				"columnChooser",
				"resetColumns",
			],
		} as Parameters<typeof getAgGridMainMenuItems>[0]);

		expect(items).toEqual(["sortAscending", "resetColumns"]);
	});

	it("supports custom hidden items", () => {
		const filterMenu = createAgGridMainMenuItems(["columnChooser", "rowGroup"]);
		const items = filterMenu({
			defaultItems: ["columnChooser", "rowGroup", "resetColumns"],
		} as Parameters<typeof filterMenu>[0]);

		expect(items).toEqual(["resetColumns"]);
	});
});
