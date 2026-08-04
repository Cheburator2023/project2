import { describe, expect, it } from "vitest";
import type { KanbanBoardTaskRegistryDto } from "@smart-anketa/api-contract";
import {
	buildTrackerMyTasksDashboard,
	isTrackerMyTask,
	trackerMyTaskRoles,
} from "./tracker-my-tasks";

const task = (
	partial: Partial<KanbanBoardTaskRegistryDto> & { id: string },
): KanbanBoardTaskRegistryDto =>
	({
		boardId: "b1",
		projectId: "p1",
		taskNumber: 1,
		parentId: "todo",
		position: 0,
		content: { title: "T" },
		origin: "local",
		updatedAt: "2026-01-01T00:00:00.000Z",
		projectCode: "PRJ",
		projectName: "Project",
		taskKey: "PRJ-1",
		boardSlug: "board",
		boardName: "Board",
		boardKey: "PRJ-board",
		title: "T",
		statusTitle: "Todo",
		taskTypeTitle: "",
		workTypeTitle: "",
		assigneeTitle: "",
		assignees: [],
		currentAssigneeTitle: "",
		assigneeRoles: [],
		assigneeRoleTitles: [],
		assigneeRoleTitle: "",
		priorityTitle: "",
		...partial,
	}) as KanbanBoardTaskRegistryDto;

describe("tracker-my-tasks", () => {
	it("matches assignee or creator", () => {
		expect(
			isTrackerMyTask(
				task({
					id: "1",
					currentAssigneeTitle: "Иванов",
					assignees: ["Иванов"],
				}),
				"Иванов",
			),
		).toBe(true);
		expect(
			isTrackerMyTask(task({ id: "2", createdBy: "Иванов" }), "Иванов"),
		).toBe(true);
		expect(
			isTrackerMyTask(
				task({ id: "3", assignees: ["Петров"], createdBy: "Петров" }),
				"Иванов",
			),
		).toBe(false);
	});

	it("builds dashboard counters", () => {
		const rows = [
			task({
				id: "1",
				currentAssigneeTitle: "Я",
				assignees: ["Я"],
				createdBy: "Я",
				content: { title: "A", priority: "high" },
				statusTitle: "Готово",
				boardKey: "A",
				boardName: "Alpha",
			}),
			task({
				id: "2",
				assignees: ["Я"],
				currentAssigneeTitle: "Я",
				createdBy: "Другой",
				statusTitle: "Todo",
				boardKey: "B",
				boardName: "Beta",
			}),
		];
		const dash = buildTrackerMyTasksDashboard(rows, "Я");
		expect(dash.total).toBe(2);
		expect(dash.asAssignee).toBe(2);
		expect(dash.asCreator).toBe(1);
		expect(dash.highPriority).toBe(1);
		expect(trackerMyTaskRoles(rows[0], "Я")).toEqual({
			asAssignee: true,
			asCreator: true,
		});
	});
});
