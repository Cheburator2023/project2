import { describe, expect, it } from "vitest";
import {
	boardKeyToSlug,
	formatKanbanBoardKey,
	formatKanbanTaskKey,
	formatKanbanTaskKeyForBoard,
	isKanbanRecordId,
	isKanbanUlid,
	normalizeTrackerCode,
	parseKanbanBoardKey,
	parseKanbanTaskKey,
} from "./kanban-board-keys.util";

describe("kanban-board-keys.util", () => {
	it("normalizeTrackerCode uppercases", () => {
		expect(normalizeTrackerCode(" smarta ")).toBe("SMARTA");
	});

	it("formatKanbanBoardKey omits MAIN slug and keeps exact keys", () => {
		expect(formatKanbanBoardKey("smarta", "main")).toBe("SMARTA");
		expect(formatKanbanBoardKey("SUM-RM", "SUM-RM-HEAP")).toBe("SUM-RM-HEAP");
		expect(formatKanbanBoardKey("PRJ-COM", "BRD-COMMON")).toBe("BRD-COMMON");
		expect(formatKanbanBoardKey("PRJ-COM", "PRJ-COM-BRD-COMMON_44")).toBe(
			"PRJ-COM-BRD-COMMON_44",
		);
	});

	it("boardKeyToSlug stores the typed public key", () => {
		expect(boardKeyToSlug("SMARTA", "SMARTA")).toBe("MAIN");
		expect(boardKeyToSlug("main", "SMARTA")).toBe("MAIN");
		expect(boardKeyToSlug("SMARTA-DEV", "SMARTA")).toBe("SMARTA-DEV");
		expect(boardKeyToSlug("DEV", "SMARTA")).toBe("DEV");
		expect(boardKeyToSlug("SUM-RM", "SUM-RM")).toBe("MAIN");
		expect(boardKeyToSlug("SUM-RM-HEAP", "SUM-RM")).toBe("SUM-RM-HEAP");
		expect(boardKeyToSlug("HEAP", "SUM-RM")).toBe("HEAP");
		expect(boardKeyToSlug("BRD-COMMON", "PRJ-COM")).toBe("BRD-COMMON");
		expect(boardKeyToSlug("PRJ-COM-BRD-COMMON_44", "PRJ-COM")).toBe(
			"PRJ-COM-BRD-COMMON_44",
		);
	});

	it("boardKeyToSlug roundtrips through formatKanbanBoardKey", () => {
		expect(formatKanbanBoardKey("SMARTA", boardKeyToSlug("SMARTA", "SMARTA"))).toBe(
			"SMARTA",
		);
		expect(formatKanbanBoardKey("SMARTA", boardKeyToSlug("DEV", "SMARTA"))).toBe(
			"DEV",
		);
		expect(
			formatKanbanBoardKey("SMARTA", boardKeyToSlug("SMARTA-DEV", "SMARTA")),
		).toBe("SMARTA-DEV");
		expect(
			formatKanbanBoardKey("SUM-RM", boardKeyToSlug("SUM-RM-HEAP", "SUM-RM")),
		).toBe("SUM-RM-HEAP");
		expect(
			formatKanbanBoardKey("PRJ-COM", boardKeyToSlug("BRD-COMMON", "PRJ-COM")),
		).toBe("BRD-COMMON");
	});

	it("formatKanbanTaskKey", () => {
		expect(formatKanbanTaskKey("smarta", 1)).toBe("SMARTA-1");
		expect(formatKanbanTaskKey("SUM-RM", 42)).toBe("SUM-RM-42");
		expect(formatKanbanTaskKey("SUM-RM-HEAP", 42)).toBe("SUM-RM-HEAP-42");
	});

	it("task key follows board key", () => {
		expect(formatKanbanTaskKeyForBoard("SMARTA", "MAIN", 12)).toBe("SMARTA-12");
		expect(formatKanbanTaskKeyForBoard("SMARTA", "DEV", 12)).toBe("DEV-12");
		expect(formatKanbanTaskKeyForBoard("SMARTA", "SMARTA-DEV", 12)).toBe(
			"SMARTA-DEV-12",
		);
		expect(formatKanbanTaskKeyForBoard("SUM-RM", "SUM-RM-HEAP", 42)).toBe(
			"SUM-RM-HEAP-42",
		);
		expect(formatKanbanTaskKeyForBoard("PRJ-COM", "BRD-COMMON", 11)).toBe(
			"BRD-COMMON-11",
		);
	});

	it("parseKanbanTaskKey", () => {
		expect(parseKanbanTaskKey("SMARTA-1")).toEqual({
			projectCode: "SMARTA",
			taskNumber: 1,
		});
		expect(parseKanbanTaskKey("SUM-RM-42")).toEqual({
			projectCode: "SUM-RM",
			taskNumber: 42,
		});
		expect(parseKanbanTaskKey("SUM-RM-HEAP-42")).toEqual({
			projectCode: "SUM-RM-HEAP",
			taskNumber: 42,
		});
		expect(parseKanbanTaskKey("SMARTA")).toBeNull();
		expect(parseKanbanTaskKey("SMARTA-X")).toBeNull();
	});

	it("parseKanbanBoardKey longest project prefix", () => {
		const codes = ["SUM", "SUM-RM", "SMARTA"];
		expect(parseKanbanBoardKey("SMARTA", codes)).toEqual({
			projectCode: "SMARTA",
			boardSlug: "MAIN",
		});
		expect(parseKanbanBoardKey("SUM-RM", codes)).toEqual({
			projectCode: "SUM-RM",
			boardSlug: "MAIN",
		});
		expect(parseKanbanBoardKey("SUM-RM-HEAP", codes)).toEqual({
			projectCode: "SUM-RM",
			boardSlug: "HEAP",
		});
	});

	it("isKanbanUlid", () => {
		expect(isKanbanUlid("01KW1WKHYY035QRM7P2FHHFZJ7")).toBe(true);
		expect(isKanbanUlid("01J000000000000000000014")).toBe(false);
		expect(isKanbanUlid("SMARTA-1")).toBe(false);
	});

	it("isKanbanRecordId", () => {
		expect(isKanbanRecordId("01J000000000000000000014")).toBe(true);
		expect(isKanbanRecordId("01KW1WKHYY035QRM7P2FHHFZJ7")).toBe(true);
		expect(isKanbanRecordId("SMARTA-1")).toBe(false);
	});
});
