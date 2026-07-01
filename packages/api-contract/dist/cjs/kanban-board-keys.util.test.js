"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const kanban_board_keys_util_1 = require("./kanban-board-keys.util");
(0, vitest_1.describe)("kanban-board-keys.util", () => {
    (0, vitest_1.it)("normalizeTrackerCode uppercases", () => {
        (0, vitest_1.expect)((0, kanban_board_keys_util_1.normalizeTrackerCode)(" smarta ")).toBe("SMARTA");
    });
    (0, vitest_1.it)("formatKanbanBoardKey omits MAIN slug", () => {
        (0, vitest_1.expect)((0, kanban_board_keys_util_1.formatKanbanBoardKey)("smarta", "main")).toBe("SMARTA");
        (0, vitest_1.expect)((0, kanban_board_keys_util_1.formatKanbanBoardKey)("SUM-RM", "heap")).toBe("SUM-RM-HEAP");
    });
    (0, vitest_1.it)("formatKanbanTaskKey", () => {
        (0, vitest_1.expect)((0, kanban_board_keys_util_1.formatKanbanTaskKey)("smarta", 1)).toBe("SMARTA-1");
        (0, vitest_1.expect)((0, kanban_board_keys_util_1.formatKanbanTaskKey)("SUM-RM", 42)).toBe("SUM-RM-42");
    });
    (0, vitest_1.it)("parseKanbanTaskKey", () => {
        (0, vitest_1.expect)((0, kanban_board_keys_util_1.parseKanbanTaskKey)("SMARTA-1")).toEqual({
            projectCode: "SMARTA",
            taskNumber: 1,
        });
        (0, vitest_1.expect)((0, kanban_board_keys_util_1.parseKanbanTaskKey)("SUM-RM-42")).toEqual({
            projectCode: "SUM-RM",
            taskNumber: 42,
        });
        (0, vitest_1.expect)((0, kanban_board_keys_util_1.parseKanbanTaskKey)("SMARTA")).toBeNull();
        (0, vitest_1.expect)((0, kanban_board_keys_util_1.parseKanbanTaskKey)("SMARTA-X")).toBeNull();
    });
    (0, vitest_1.it)("parseKanbanBoardKey longest project prefix", () => {
        const codes = ["SUM", "SUM-RM", "SMARTA"];
        (0, vitest_1.expect)((0, kanban_board_keys_util_1.parseKanbanBoardKey)("SMARTA", codes)).toEqual({
            projectCode: "SMARTA",
            boardSlug: "MAIN",
        });
        (0, vitest_1.expect)((0, kanban_board_keys_util_1.parseKanbanBoardKey)("SUM-RM", codes)).toEqual({
            projectCode: "SUM-RM",
            boardSlug: "MAIN",
        });
        (0, vitest_1.expect)((0, kanban_board_keys_util_1.parseKanbanBoardKey)("SUM-RM-HEAP", codes)).toEqual({
            projectCode: "SUM-RM",
            boardSlug: "HEAP",
        });
    });
    (0, vitest_1.it)("isKanbanUlid", () => {
        (0, vitest_1.expect)((0, kanban_board_keys_util_1.isKanbanUlid)("01KW1WKHYY035QRM7P2FHHFZJ7")).toBe(true);
        (0, vitest_1.expect)((0, kanban_board_keys_util_1.isKanbanUlid)("01J000000000000000000014")).toBe(false);
        (0, vitest_1.expect)((0, kanban_board_keys_util_1.isKanbanUlid)("SMARTA-1")).toBe(false);
    });
    (0, vitest_1.it)("isKanbanRecordId", () => {
        (0, vitest_1.expect)((0, kanban_board_keys_util_1.isKanbanRecordId)("01J000000000000000000014")).toBe(true);
        (0, vitest_1.expect)((0, kanban_board_keys_util_1.isKanbanRecordId)("01KW1WKHYY035QRM7P2FHHFZJ7")).toBe(true);
        (0, vitest_1.expect)((0, kanban_board_keys_util_1.isKanbanRecordId)("SMARTA-1")).toBe(false);
    });
});
