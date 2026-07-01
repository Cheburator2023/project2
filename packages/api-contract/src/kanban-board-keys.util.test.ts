import { describe, expect, it } from "vitest";
import {
	formatKanbanBoardKey,
	formatKanbanTaskKey,
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

	it("formatKanbanBoardKey omits MAIN slug", () => {
		expect(formatKanbanBoardKey("smarta", "main")).toBe("SMARTA");
		expect(formatKanbanBoardKey("SUM-RM", "heap")).toBe("SUM-RM-HEAP");
	});

	it("formatKanbanTaskKey", () => {
		expect(formatKanbanTaskKey("smarta", 1)).toBe("SMARTA-1");
		expect(formatKanbanTaskKey("SUM-RM", 42)).toBe("SUM-RM-42");
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
