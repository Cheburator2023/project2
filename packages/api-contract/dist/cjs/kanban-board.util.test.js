"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const api_contract_1 = require("@smart-anketa/api-contract");
const boardColumns = (0, api_contract_1.defaultKanbanBoardColumns)("board-1").map((column) => ({
    ...column,
    createdAt: "2026-06-16T12:00:00.000Z",
    updatedAt: "2026-06-16T12:00:00.000Z",
}));
const sampleBoard = () => ({
    root: {
        id: "root",
        title: "Root",
        parentId: null,
        children: ["backlog", "todo", "in_progress", "review", "qa", "done"],
        totalChildrenCount: 6,
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
    qa: {
        id: "qa",
        title: "QA",
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
(0, vitest_1.describe)("kanban board mapping", () => {
    (0, vitest_1.it)("preserves board structure in fromBoardData → toBoardData cycle", () => {
        const board = sampleBoard();
        const rows = (0, api_contract_1.fromBoardData)(board, "local-dev", "2026-06-16T12:00:00.000Z", "board-1");
        const restored = (0, api_contract_1.toBoardData)(rows, boardColumns);
        (0, vitest_1.expect)((0, api_contract_1.boardsEquivalent)(board, restored)).toBe(true);
    });
});
(0, vitest_1.describe)("kanban board role estimates", () => {
    (0, vitest_1.it)("sums role estimates and normalizes estimatePd", () => {
        (0, vitest_1.expect)((0, api_contract_1.kanbanBoardRoleEstimatesTotal)({
            analyst: 0.5,
            developer: 2,
            qa: 0.5,
        })).toBe(3);
        const normalized = (0, api_contract_1.normalizeKanbanBoardTaskContent)({
            title: "Task",
            roleEstimates: { developer: 2, qa: 1 },
        });
        (0, vitest_1.expect)(normalized.estimatePd).toBe(3);
        (0, vitest_1.expect)((0, api_contract_1.kanbanBoardEffectiveEstimatePd)(normalized)).toBe(3);
    });
    (0, vitest_1.it)("preserves images when images field is omitted on update", () => {
        const withImages = (0, api_contract_1.normalizeKanbanBoardTaskContent)({
            title: "Task",
            images: [
                {
                    id: "img1",
                    name: "shot.png",
                    width: 100,
                    height: 50,
                    fullByteSize: 1000,
                    thumbByteSize: 200,
                    createdAt: "2026-06-16T12:00:00.000Z",
                },
            ],
        });
        const updated = (0, api_contract_1.normalizeKanbanBoardTaskContent)({
            title: "Task updated",
            images: withImages.images,
        });
        (0, vitest_1.expect)(updated.images).toHaveLength(1);
        const titleOnly = (0, api_contract_1.normalizeKanbanBoardTaskContent)({
            title: "Task updated again",
        });
        (0, vitest_1.expect)(titleOnly.images).toBeUndefined();
    });
});
(0, vitest_1.describe)("kanban board sprint capacity", () => {
    (0, vitest_1.it)("uses individual capacity or default", () => {
        (0, vitest_1.expect)((0, api_contract_1.kanbanBoardEffectiveSprintCapacityPd)({
            sprintCapacityPd: 6,
            defaultSprintCapacityPd: 9,
        })).toBe(6);
        (0, vitest_1.expect)((0, api_contract_1.kanbanBoardEffectiveSprintCapacityPd)({
            sprintCapacityPd: null,
            defaultSprintCapacityPd: 9,
        })).toBe(9);
    });
});
(0, vitest_1.describe)("kanban board subtasks", () => {
    (0, vitest_1.it)("normalizes and counts progress", () => {
        const normalized = (0, api_contract_1.normalizeKanbanBoardSubtasks)([
            { id: "a", text: " One ", done: true },
            { id: "b", text: "", done: false },
            { id: "c", text: "Two", done: false },
        ]);
        (0, vitest_1.expect)(normalized).toEqual([
            { id: "a", text: "One", status: "done" },
            { id: "c", text: "Two", status: "next_up" },
        ]);
        (0, vitest_1.expect)((0, api_contract_1.kanbanBoardSubtasksProgress)({ subtasks: normalized })).toEqual({
            done: 1,
            total: 2,
        });
    });
    (0, vitest_1.it)("keeps explicit status", () => {
        const normalized = (0, api_contract_1.normalizeKanbanBoardSubtasks)([
            { id: "a", text: "Review", status: "in_review" },
        ]);
        (0, vitest_1.expect)(normalized).toEqual([
            { id: "a", text: "Review", status: "in_review" },
        ]);
    });
    (0, vitest_1.it)("keeps qa status", () => {
        const normalized = (0, api_contract_1.normalizeKanbanBoardSubtasks)([
            { id: "a", text: "Check regression", status: "qa" },
        ]);
        (0, vitest_1.expect)(normalized).toEqual([
            { id: "a", text: "Check regression", status: "qa" },
        ]);
    });
});
