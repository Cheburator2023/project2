import { describe, expect, it } from "vitest";
import {
	KANBAN_BOARD_PLANNING_UNTHEMED_ID,
	type KanbanBoardReleaseTaskDto,
} from "@smart-anketa/api-contract";
import {
	allocatePlanningTaskEstimatePd,
	buildPlanningAssigneeLoadRows,
	PLANNING_ASSIGNEE_UNASSIGNED,
} from "./planningAssigneeLoad";

function planningTask(partial: {
	taskId: string;
	releaseId?: string;
	themeId?: string | null;
	assignees?: string[];
	currentAssignee?: string;
	estimatePd?: number;
	roleEstimates?: KanbanBoardReleaseTaskDto["task"]["content"]["roleEstimates"];
}): KanbanBoardReleaseTaskDto {
	const assignees = partial.assignees ?? [];
	return {
		taskId: partial.taskId,
		releaseId: partial.releaseId ?? "rel-1",
		themeId: partial.themeId ?? null,
		position: 0,
		task: {
			id: partial.taskId,
			boardId: "b1",
			projectId: "p1",
			taskNumber: 1,
			parentId: "todo",
			position: 0,
			content: {
				title: partial.taskId,
				assignees,
				currentAssignee: partial.currentAssignee,
				estimatePd: partial.estimatePd,
				roleEstimates: partial.roleEstimates,
			},
			origin: "local",
			updatedAt: "2026-01-01T00:00:00.000Z",
			projectCode: "PRJ",
			projectName: "Project",
			taskKey: `PRJ-${partial.taskId}`,
			boardSlug: "board",
			boardName: "Board",
			boardKey: "PRJ-board",
			title: partial.taskId,
			statusTitle: "Сделать",
			taskTypeTitle: "",
			workTypeTitle: "",
			assigneeTitle: assignees.join(", "),
			assignees,
			currentAssigneeTitle: partial.currentAssignee ?? "",
			assigneeRoles: [],
			assigneeRoleTitles: [],
			assigneeRoleTitle: "",
		},
	};
}

describe("allocatePlanningTaskEstimatePd", () => {
	it("gives analysis days to the analyst, not the developer", () => {
		const item = planningTask({
			taskId: "t1",
			assignees: ["Иванов", "Петрова"],
			roleEstimates: { analyst: 2, developer: 5 },
		});
		const shares = allocatePlanningTaskEstimatePd(
			item.task,
			new Map([
				["Иванов", "developer"],
				["Петрова", "analyst"],
			]),
		);
		expect(shares.get("Петрова")).toBe(2);
		expect(shares.get("Иванов")).toBe(5);
	});

	it("sends unmatched role estimates to the current assignee", () => {
		const item = planningTask({
			taskId: "t1",
			assignees: ["Иванов", "Петрова"],
			currentAssignee: "Иванов",
			roleEstimates: { developer: 3, debug: 1 },
		});
		const shares = allocatePlanningTaskEstimatePd(
			item.task,
			new Map([
				["Иванов", "developer"],
				["Петрова", "analyst"],
			]),
		);
		expect(shares.get("Иванов")).toBe(4);
		expect(shares.get("Петрова")).toBeUndefined();
	});

	it("splits a flat estimate so the sum stays equal to the task", () => {
		const item = planningTask({
			taskId: "t1",
			assignees: ["А", "Б"],
			estimatePd: 3,
		});
		const shares = allocatePlanningTaskEstimatePd(item.task, new Map());
		expect(shares.get("А")).toBe(1.5);
		expect(shares.get("Б")).toBe(1.5);
	});

	it("keeps unassigned work instead of dropping it", () => {
		const item = planningTask({
			taskId: "t1",
			estimatePd: 4,
		});
		const shares = allocatePlanningTaskEstimatePd(item.task, new Map());
		expect(shares.get(PLANNING_ASSIGNEE_UNASSIGNED)).toBe(4);
	});
});

describe("buildPlanningAssigneeLoadRows", () => {
	it("sums the same person across releases and themes", () => {
		const rows = buildPlanningAssigneeLoadRows({
			tasks: [
				planningTask({
					taskId: "t1",
					releaseId: "r1",
					themeId: "theme-a",
					assignees: ["Иванов"],
					estimatePd: 2,
				}),
				planningTask({
					taskId: "t2",
					releaseId: "r2",
					themeId: null,
					assignees: ["Иванов"],
					estimatePd: 3,
				}),
			],
			directory: [
				{
					name: "Иванов",
					role: "developer",
					roleTitle: "Разработчик",
					effectiveSprintCapacityPd: 10,
				},
			],
		});
		expect(rows).toHaveLength(1);
		expect(rows[0]?.totalPd).toBe(5);
		expect(rows[0]?.taskCount).toBe(2);
		expect(rows[0]?.byRelease).toEqual({ r1: 2, r2: 3 });
		expect(rows[0]?.byTheme).toEqual({
			"theme-a": 2,
			[KANBAN_BOARD_PLANNING_UNTHEMED_ID]: 3,
		});
		expect(rows[0]?.loadPercent).toBe(50);
	});
});
