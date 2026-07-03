import { describe, expect, it } from "vitest";
import { diffKanbanTaskChanges, formatKanbanBoardHistoryValue, kanbanBoardTaskHistorySnapshot, } from "./kanban-board-history.util";
describe("kanban-board-history.util", () => {
    it("formats subtasks as readable text", () => {
        expect(formatKanbanBoardHistoryValue([
            { id: "1", text: "Сделать API", status: "done" },
            { id: "2", text: "Написать тесты", status: "in_progress" },
        ])).toBe("Сделать API (Готово); Написать тесты (В работе)");
    });
    it("formats role estimates", () => {
        expect(formatKanbanBoardHistoryValue({ developer: 2, qa: 1, analyst: 0 })).toBe("developer: 2, qa: 1");
    });
    it("diffs subtasks without [object Object]", () => {
        const before = kanbanBoardTaskHistorySnapshot({
            parentId: "backlog",
            position: 0,
            boardId: "board-1",
            content: {
                title: "Задача",
                subtasks: [{ id: "1", text: "Шаг 1", status: "next_up" }],
            },
        });
        const after = kanbanBoardTaskHistorySnapshot({
            parentId: "backlog",
            position: 0,
            boardId: "board-1",
            content: {
                title: "Задача",
                subtasks: [{ id: "1", text: "Шаг 1", status: "done" }],
            },
        });
        const changes = diffKanbanTaskChanges(before, after);
        expect(changes).toEqual([
            expect.objectContaining({
                label: "Подзадачи",
                from: "Шаг 1 (Следующая)",
                to: "Шаг 1 (Готово)",
            }),
        ]);
    });
});
