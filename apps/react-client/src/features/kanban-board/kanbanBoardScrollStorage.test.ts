/** @vitest-environment happy-dom */
import { afterEach, describe, expect, it } from "vitest";
import {
	loadKanbanBoardScroll,
	resetKanbanBoardScrollMemory,
	restoreKanbanBoardScroll,
	saveKanbanBoardScroll,
} from "./kanbanBoardScrollStorage";

function makeScroller(options: {
	left: number;
	top?: number;
	overflowX: number;
}) {
	const element = document.createElement("div");
	let left = options.left;
	let top = options.top ?? 0;
	const clientWidth = 400;
	Object.defineProperties(element, {
		clientWidth: { configurable: true, get: () => clientWidth },
		scrollWidth: { configurable: true, get: () => clientWidth + options.overflowX },
		clientHeight: { configurable: true, get: () => 300 },
		scrollHeight: { configurable: true, get: () => 300 },
		scrollLeft: {
			configurable: true,
			get: () => left,
			set: (value: number) => {
				left = Math.max(0, Math.min(Number(value), options.overflowX));
			},
		},
		scrollTop: {
			configurable: true,
			get: () => top,
			set: (value: number) => {
				top = Number(value);
			},
		},
	});
	return element;
}

describe("kanbanBoardScrollStorage", () => {
	afterEach(() => {
		resetKanbanBoardScrollMemory();
		sessionStorage.clear();
	});

	it("saves and restores the board scroller position for the same board", () => {
		saveKanbanBoardScroll(
			"PRJ-board",
			makeScroller({ left: 640, top: 12, overflowX: 2000 }),
		);
		expect(loadKanbanBoardScroll("PRJ-board")).toEqual({ left: 640, top: 12 });

		const next = makeScroller({ left: 0, overflowX: 2000 });
		expect(restoreKanbanBoardScroll("PRJ-board", next)).toBe(true);
		expect(next.scrollLeft).toBe(640);
		expect(next.scrollTop).toBe(12);
	});

	it("does not overwrite a saved offset when the board collapses on unmount", () => {
		saveKanbanBoardScroll(
			"PRJ-board",
			makeScroller({ left: 640, overflowX: 2000 }),
		);
		saveKanbanBoardScroll(
			"PRJ-board",
			makeScroller({ left: 0, overflowX: 0 }),
		);
		expect(loadKanbanBoardScroll("PRJ-board")).toEqual({ left: 640, top: 0 });
	});

	it("keeps retrying restore until the scroller is wide enough", () => {
		saveKanbanBoardScroll(
			"PRJ-board",
			makeScroller({ left: 640, overflowX: 2000 }),
		);
		const narrow = makeScroller({ left: 0, overflowX: 40 });
		expect(restoreKanbanBoardScroll("PRJ-board", narrow)).toBe(false);
		expect(narrow.scrollLeft).toBe(40);

		const wide = makeScroller({ left: 0, overflowX: 2000 });
		expect(restoreKanbanBoardScroll("PRJ-board", wide)).toBe(true);
		expect(wide.scrollLeft).toBe(640);
	});
});
