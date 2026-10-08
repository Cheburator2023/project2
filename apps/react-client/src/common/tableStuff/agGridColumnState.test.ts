/** @vitest-environment happy-dom */

import { afterEach, describe, expect, it } from "vitest";
import {
	clearAgGridFilterModel,
	loadAgGridFilterModel,
	loadAgGridRowTintEnabled,
	saveAgGridFilterModel,
	saveAgGridRowTintEnabled,
} from "./agGridColumnState";

const GRID_ID = "v2.questionnaires";
const STORAGE_KEY = `smart_anketa:ag-grid-row-tint:${GRID_ID}`;
const FILTER_KEY = `smart_anketa:ag-grid-filter-model:${GRID_ID}`;

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

describe("ag-grid filter model", () => {
	afterEach(() => {
		window.localStorage.removeItem(FILTER_KEY);
	});

	it("keeps column filters so the planning grid restores them", () => {
		saveAgGridFilterModel(GRID_ID, {
			status: { filterType: "set", values: ["В работе"] },
		});
		expect(loadAgGridFilterModel(GRID_ID)).toEqual({
			status: { filterType: "set", values: ["В работе"] },
		});
	});

	it("drops a saved filter when the user resets the grid", () => {
		saveAgGridFilterModel(GRID_ID, { title: { filterType: "text", filter: "AD" } });
		clearAgGridFilterModel(GRID_ID);
		expect(loadAgGridFilterModel(GRID_ID)).toBeNull();
	});
});
