import { describe, expect, it } from "vitest";
import {
	diffKanbanTaskChanges,
	formatKanbanBoardHistoryValue,
	kanbanBoardTaskHistorySnapshot,
} from "./kanban-board-history.util";

describe("kanban-board-history.util", () => {
	it("formats subtasks as readable text", () => {
		expect(
			formatKanbanBoardHistoryValue([
				{ id: "1", text: "Сделать API", status: "done" },
				{ id: "2", text: "Написать тесты", status: "in_progress" },
			]),
		).toBe("Сделать API (Готово); Написать тесты (В работе)");
	});

	it("includes subtask image count in history text", () => {
		expect(
			formatKanbanBoardHistoryValue([
				{
					id: "1",
					text: "Скрин",
					status: "next_up",
					images: [
						{
							id: "img-1",
							name: "a.png",
							width: 1,
							height: 1,
							fullByteSize: 1,
							thumbByteSize: 1,
							createdAt: "2026-09-15T00:00:00.000Z",
						},
					],
				},
			]),
		).toBe("Скрин (Следующая · 1 изобр.)");
	});

	it("formats role estimates", () => {
		expect(
			formatKanbanBoardHistoryValue({ developer: 2, qa: 1, analyst: 0 }),
		).toBe("developer: 2, qa: 1");
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

	it("diffs createdBy as Назначил", () => {
		const before = kanbanBoardTaskHistorySnapshot({
			parentId: "backlog",
			position: 0,
			boardId: "board-1",
			createdBy: "Иванов",
			content: { title: "Задача" },
		});
		const after = kanbanBoardTaskHistorySnapshot({
			parentId: "backlog",
			position: 0,
			boardId: "board-1",
			createdBy: "Петров",
			content: { title: "Задача" },
		});
		expect(diffKanbanTaskChanges(before, after)).toEqual([
			{
				field: "createdBy",
				label: "Назначил",
				from: "Иванов",
				to: "Петров",
			},
		]);
	});

	it("diffs hasBlocker as Блокер", () => {
		const before = kanbanBoardTaskHistorySnapshot({
			parentId: "backlog",
			position: 0,
			boardId: "board-1",
			content: { title: "Задача" },
		});
		const after = kanbanBoardTaskHistorySnapshot({
			parentId: "backlog",
			position: 0,
			boardId: "board-1",
			content: { title: "Задача", hasBlocker: true },
		});
		expect(diffKanbanTaskChanges(before, after)).toEqual([
			{
				field: "content.hasBlocker",
				label: "Блокер",
				from: null,
				to: "есть",
			},
		]);
	});
});
