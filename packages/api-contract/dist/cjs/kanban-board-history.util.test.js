"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const kanban_board_history_util_1 = require("./kanban-board-history.util");
(0, vitest_1.describe)("kanban-board-history.util", () => {
    (0, vitest_1.it)("formats subtasks as readable text", () => {
        (0, vitest_1.expect)((0, kanban_board_history_util_1.formatKanbanBoardHistoryValue)([
            { id: "1", text: "Сделать API", status: "done" },
            { id: "2", text: "Написать тесты", status: "in_progress" },
        ])).toBe("Сделать API (Готово); Написать тесты (В работе)");
    });
    (0, vitest_1.it)("formats role estimates", () => {
        (0, vitest_1.expect)((0, kanban_board_history_util_1.formatKanbanBoardHistoryValue)({ developer: 2, qa: 1, analyst: 0 })).toBe("developer: 2, qa: 1");
    });
    (0, vitest_1.it)("diffs subtasks without [object Object]", () => {
        const before = (0, kanban_board_history_util_1.kanbanBoardTaskHistorySnapshot)({
            parentId: "backlog",
            position: 0,
            boardId: "board-1",
            content: {
                title: "Задача",
                subtasks: [{ id: "1", text: "Шаг 1", status: "next_up" }],
            },
        });
        const after = (0, kanban_board_history_util_1.kanbanBoardTaskHistorySnapshot)({
            parentId: "backlog",
            position: 0,
            boardId: "board-1",
            content: {
                title: "Задача",
                subtasks: [{ id: "1", text: "Шаг 1", status: "done" }],
            },
        });
        const changes = (0, kanban_board_history_util_1.diffKanbanTaskChanges)(before, after);
        (0, vitest_1.expect)(changes).toEqual([
            vitest_1.expect.objectContaining({
                label: "Подзадачи",
                from: "Шаг 1 (Следующая)",
                to: "Шаг 1 (Готово)",
            }),
        ]);
    });
});
