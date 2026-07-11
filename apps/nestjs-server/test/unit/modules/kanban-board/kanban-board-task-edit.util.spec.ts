import { ConflictException } from "@nestjs/common";
import {
	assertKanbanBoardTaskVersion,
	throwKanbanBoardTaskVersionConflicts,
} from "../../../../src/modules/kanban-board/utils/kanban-board-task-edit.util";
import type { KanbanBoardTaskEntity } from "../../../../src/modules/kanban-board/entities/kanban-board-task.entity";

const task = {
	id: "task-1",
	updatedAt: "2026-07-11T10:00:00.000Z",
	content: { title: "Test" },
} as KanbanBoardTaskEntity;

describe("kanban-board-task-edit.util", () => {
	it("passes when expectedUpdatedAt matches", () => {
		expect(() =>
			assertKanbanBoardTaskVersion(
				task,
				"2026-07-11T10:00:00.000Z",
				false,
			),
		).not.toThrow();
	});

	it("passes when forceOverwrite is true", () => {
		expect(() =>
			assertKanbanBoardTaskVersion(
				task,
				"2026-07-11T09:00:00.000Z",
				true,
			),
		).not.toThrow();
	});

	it("passes when expectedUpdatedAt is omitted", () => {
		expect(() =>
			assertKanbanBoardTaskVersion(task, undefined, false),
		).not.toThrow();
	});

	it("throws ConflictException on version mismatch", () => {
		expect(() =>
			assertKanbanBoardTaskVersion(
				task,
				"2026-07-11T09:00:00.000Z",
				false,
				{ taskKey: "DEV-1", taskTitle: "Test" },
			),
		).toThrow(ConflictException);

		try {
			assertKanbanBoardTaskVersion(
				task,
				"2026-07-11T09:00:00.000Z",
				false,
			);
		} catch (error) {
			expect(error).toBeInstanceOf(ConflictException);
			const response = (error as ConflictException).getResponse() as {
				reason: string;
				conflicts: Array<{ taskId: string; actualUpdatedAt: string }>;
			};
			expect(response.reason).toBe("version");
			expect(response.conflicts[0]?.taskId).toBe("task-1");
			expect(response.conflicts[0]?.actualUpdatedAt).toBe(task.updatedAt);
		}
	});

	it("throws batch version conflicts", () => {
		expect(() =>
			throwKanbanBoardTaskVersionConflicts([
				{
					taskId: "a",
					expectedUpdatedAt: "1",
					actualUpdatedAt: "2",
				},
				{
					taskId: "b",
					expectedUpdatedAt: "3",
					actualUpdatedAt: "4",
				},
			]),
		).toThrow(ConflictException);
	});
});
