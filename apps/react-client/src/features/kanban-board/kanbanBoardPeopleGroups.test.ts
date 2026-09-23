import { describe, expect, it } from "vitest";
import type { KanbanBoardData } from "@smart-anketa/api-contract";
import { groupKanbanBoardByCurrentAssignee } from "./kanbanBoardPeopleGroups";

function board(): KanbanBoardData {
	return {
		root: {
			id: "root",
			title: "Root",
			parentId: null,
			children: ["todo", "doing"],
			totalChildrenCount: 2,
		},
		todo: {
			id: "todo",
			title: "Сделать",
			parentId: "root",
			children: ["a", "b"],
			totalChildrenCount: 2,
			content: { color: "#111111" },
		},
		doing: {
			id: "doing",
			title: "В работе",
			parentId: "root",
			children: ["c"],
			totalChildrenCount: 1,
			content: { color: "#222222" },
		},
		a: {
			id: "a",
			title: "Без человека",
			parentId: "todo",
			children: [],
			totalChildrenCount: 0,
			type: "card",
			taskNumber: 1,
			content: { title: "Без человека" },
		},
		b: {
			id: "b",
			title: "Задача Петрова",
			parentId: "todo",
			children: [],
			totalChildrenCount: 0,
			type: "card",
			taskNumber: 2,
			content: { title: "Задача Петрова", currentAssignee: "Петров" },
		},
		c: {
			id: "c",
			title: "Ещё Петров",
			parentId: "doing",
			children: [],
			totalChildrenCount: 0,
			type: "card",
			taskNumber: 3,
			content: { title: "Ещё Петров", currentAssignee: "Петров" },
		},
	};
}

describe("groupKanbanBoardByCurrentAssignee", () => {
	it("groups by current assignee and leaves unassigned last", () => {
		const groups = groupKanbanBoardByCurrentAssignee(board(), "COMMON");
		expect(groups.map((group) => group.title)).toEqual([
			"Петров",
			"Без исполнителя",
		]);
		expect(groups[0]?.tasks.map((task) => task.taskKey)).toEqual([
			"COMMON-2",
			"COMMON-3",
		]);
		expect(groups[0]?.tasks.map((task) => task.statusTitle)).toEqual([
			"Сделать",
			"В работе",
		]);
		expect(groups[1]?.tasks).toEqual([
			expect.objectContaining({
				taskKey: "COMMON-1",
				statusColor: "#111111",
				parentId: "todo",
			}),
		]);
	});

	it("keeps an assignee with no tasks", () => {
		const groups = groupKanbanBoardByCurrentAssignee(board(), "COMMON", [
			"Сидоров",
			"Петров",
		]);
		expect(groups.map((group) => [group.title, group.tasks.length])).toEqual([
			["Петров", 2],
			["Сидоров", 0],
			["Без исполнителя", 1],
		]);
	});
});
