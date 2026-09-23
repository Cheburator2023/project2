import { describe, expect, it } from "vitest";
import {
	applyKanbanBoardAssigneeHandoff,
	withKanbanBoardCurrentAssignee,
	diffKanbanTaskChanges,
	kanbanBoardAssigneeHandoffTitle,
	kanbanBoardTaskHasAssigneeHandoff,
	kanbanBoardTaskHistorySnapshot,
} from "@smart-anketa/api-contract";

describe("applyKanbanBoardAssigneeHandoff", () => {
	it("marks a reassigned task as waiting for pickup", () => {
		const next = applyKanbanBoardAssigneeHandoff(
			{ currentAssignee: "Иванов" },
			{ title: "Задача", currentAssignee: "Петров" },
		);
		expect(kanbanBoardTaskHasAssigneeHandoff(next)).toBe(true);
		expect(next.assigneeHandoffFrom).toBe("Иванов");
		expect(kanbanBoardAssigneeHandoffTitle(next)).toContain("Иванов → Петров");
	});

	it("keeps the handoff until the new assignee picks the task up", () => {
		const pending = applyKanbanBoardAssigneeHandoff(
			{ currentAssignee: "Иванов" },
			{ title: "Задача", currentAssignee: "Петров" },
		);
		const saved = applyKanbanBoardAssigneeHandoff(pending, {
			title: "Задача",
			currentAssignee: "Петров",
			description: "правка описания не должна снять передачу",
		});
		expect(kanbanBoardTaskHasAssigneeHandoff(saved)).toBe(true);
		expect(saved.assigneeHandoffFrom).toBe("Иванов");

		const taken = applyKanbanBoardAssigneeHandoff(
			saved,
			{ title: "Задача", currentAssignee: "Петров" },
			{ pickup: true },
		);
		expect(kanbanBoardTaskHasAssigneeHandoff(taken)).toBe(false);
		expect(taken.assigneeHandoffFrom).toBeUndefined();
	});

	it("starts a new handoff if the assignee changes again during pickup", () => {
		const next = applyKanbanBoardAssigneeHandoff(
			{
				currentAssignee: "Петров",
				assigneeHandoffPending: true,
				assigneeHandoffFrom: "Иванов",
			},
			{ title: "Задача", currentAssignee: "Сидоров" },
			{ pickup: true },
		);
		expect(next.assigneeHandoffPending).toBe(true);
		expect(next.assigneeHandoffFrom).toBe("Петров");
	});

	it("records pickup in task history as «Передача в работу»", () => {
		const before = kanbanBoardTaskHistorySnapshot({
			parentId: "todo",
			position: 0,
			boardId: "board-1",
			content: {
				title: "Задача",
				currentAssignee: "Петров",
				assigneeHandoffPending: true,
			},
		});
		const after = kanbanBoardTaskHistorySnapshot({
			parentId: "todo",
			position: 0,
			boardId: "board-1",
			content: { title: "Задача", currentAssignee: "Петров" },
		});
		expect(diffKanbanTaskChanges(before, after)).toEqual([
			expect.objectContaining({
				label: "Передача в работу",
				from: "ожидает",
				to: null,
			}),
		]);
	});
});

describe("withKanbanBoardCurrentAssignee", () => {
	it("adds the new current assignee and marks the handoff", () => {
		const next = withKanbanBoardCurrentAssignee(
			{
				title: "Задача",
				assignees: ["Иванов"],
				currentAssignee: "Иванов",
			},
			"Петров",
		);
		expect(next.currentAssignee).toBe("Петров");
		expect(next.assignees).toEqual(["Иванов", "Петров"]);
		expect(next.assigneeHandoffPending).toBe(true);
		expect(next.assigneeHandoffFrom).toBe("Иванов");
	});

	it("clears the current assignee without dropping the team", () => {
		const next = withKanbanBoardCurrentAssignee(
			{
				title: "Задача",
				assignees: ["Иванов"],
				currentAssignee: "Иванов",
			},
			"",
		);
		expect(next.currentAssignee).toBeUndefined();
		expect(next.assignees).toEqual(["Иванов"]);
		expect(next.assigneeHandoffPending).toBeUndefined();
	});
});
