import { describe, expect, it } from "vitest";
import type { KanbanBoardData } from "@smart-anketa/api-contract";
import {
	buildKanbanBoardPersonTaskChips,
	groupKanbanBoardByCurrentAssignee,
} from "./kanbanBoardPeopleGroups";

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
			children: ["a", "b", "d"],
			totalChildrenCount: 3,
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
			createdAt: "2026-09-23T10:00:00.000Z",
			commentCount: 1,
			content: {
				title: "Задача Петрова",
				currentAssignee: "Петров",
				priority: "high",
				taskType: "bug",
				workType: "feature",
				stands: ["ift"],
				systems: ["sum"],
				hasBlocker: true,
				roleEstimates: { analyst: 2 },
				dueDate: "2026-10-01",
			},
			releases: [{ id: "rel-1", code: "REL-1", name: "Осень" }],
		},
		c: {
			id: "c",
			title: "Ещё Петров",
			parentId: "doing",
			children: [],
			totalChildrenCount: 0,
			type: "card",
			taskNumber: 3,
			content: {
				title: "Ещё Петров",
				currentAssignee: "Петров",
				priority: "low",
			},
		},
		d: {
			id: "d",
			title: "Средний Петров",
			parentId: "todo",
			children: [],
			totalChildrenCount: 0,
			type: "card",
			taskNumber: 4,
			content: {
				title: "Средний Петров",
				currentAssignee: "Петров",
				priority: "medium",
			},
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
			"COMMON-4",
			"COMMON-3",
		]);
		expect(groups[0]?.tasks.map((task) => task.priority)).toEqual([
			"high",
			"medium",
			"low",
		]);
		expect(groups[0]?.tasks.map((task) => task.statusTitle)).toEqual([
			"Сделать",
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
			["Петров", 3],
			["Сидоров", 0],
			["Без исполнителя", 1],
		]);
	});

	it("builds priority and board chips for a task", () => {
		const groups = groupKanbanBoardByCurrentAssignee(board(), "COMMON");
		const task = groups[0]?.tasks[0];
		expect(task?.priority).toBe("high");
		expect(task?.hasBlocker).toBe(true);
		expect(task?.chips.map((chip) => chip.label)).toEqual(
			expect.arrayContaining([
				"Высокий",
				"Баг",
				"Новая функциональность",
				"ИФТ",
				"SUM",
				"Осень",
			]),
		);
		expect(task?.chips.map((chip) => chip.label)).not.toContain("Блокер");
		expect(task?.chips.map((chip) => chip.label)).not.toContain("Есть блокер");
		expect(
			buildKanbanBoardPersonTaskChips({
				title: "X",
				priority: "hold",
				taskType: "epic",
			}).map((chip) => chip.label),
		).toEqual(["Холд", "Эпик"]);
		expect(task?.meta).toEqual(
			expect.objectContaining({
				createdLabel: "23 сент. 2026",
				dueLabel: "1 окт. 2026",
				estimatePd: 2,
				commentCount: 1,
			}),
		);
		expect(typeof task?.meta.ageDays).toBe("number");
	});
});
