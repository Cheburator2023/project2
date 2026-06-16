import { describe, expect, it } from "vitest";
import { boardsEquivalent, fromBoardData, toBoardData, } from "@smart-anketa/api-contract";
const sampleBoard = () => ({
    root: {
        id: "root",
        title: "Root",
        parentId: null,
        children: ["backlog", "todo", "in_progress", "review", "done"],
        totalChildrenCount: 5,
    },
    backlog: {
        id: "backlog",
        title: "Бэклог",
        parentId: "root",
        children: ["task-1"],
        totalChildrenCount: 1,
    },
    todo: {
        id: "todo",
        title: "К выполнению",
        parentId: "root",
        children: [],
        totalChildrenCount: 0,
    },
    in_progress: {
        id: "in_progress",
        title: "В работе",
        parentId: "root",
        children: [],
        totalChildrenCount: 0,
    },
    review: {
        id: "review",
        title: "Ревью",
        parentId: "root",
        children: [],
        totalChildrenCount: 0,
    },
    done: {
        id: "done",
        title: "Готово",
        parentId: "root",
        children: [],
        totalChildrenCount: 0,
    },
    "task-1": {
        id: "task-1",
        title: "Demo",
        parentId: "backlog",
        children: [],
        totalChildrenCount: 0,
        type: "card",
        content: { title: "Demo", priority: "medium" },
        origin: "local-dev",
    },
});
describe("task-tracker board mapping", () => {
    it("preserves board structure in fromBoardData → toBoardData cycle", () => {
        const board = sampleBoard();
        const rows = fromBoardData(board, "local-dev", "2026-06-16T12:00:00.000Z");
        const restored = toBoardData(rows);
        expect(boardsEquivalent(board, restored)).toBe(true);
    });
});
