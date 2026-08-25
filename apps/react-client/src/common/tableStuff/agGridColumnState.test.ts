/** @vitest-environment happy-dom */

import { afterEach, describe, expect, it } from "vitest";
import {
	loadAgGridRowTintEnabled,
	saveAgGridRowTintEnabled,
} from "./agGridColumnState";

const GRID_ID = "tracker.planning.tasks";
const STORAGE_KEY = `smart_anketa:ag-grid-row-tint:${GRID_ID}`;

describe("ag-grid row tint preference", () => {
	afterEach(() => {
		window.localStorage.removeItem(STORAGE_KEY);
	});

	it("stays on by default so planning rows keep their status colors", () => {
		expect(loadAgGridRowTintEnabled(GRID_ID)).toBe(true);
	});

	it("remembers when the user turns row tint off", () => {
		saveAgGridRowTintEnabled(GRID_ID, false);
		expect(loadAgGridRowTintEnabled(GRID_ID)).toBe(false);
	});
});
