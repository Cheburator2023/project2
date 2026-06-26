import { describe, expect, it } from "vitest";
import type {
	KanbanBoardSprintDto,
	KanbanBoardTaskRegistryDto,
} from "@smart-anketa/api-contract";
import {
	buildTrackerGanttTasks,
	estimatePdFromGanttBar,
	formatTrackerDueDate,
	resolveTrackerGanttTimelineBounds,
	resolveTaskBarDates,
} from "./trackerGanttModel";
import {
	TRACKER_GANTT_UNASSIGNED_SPRINT_ID,
	trackerGanttSprintId,
} from "./trackerGanttIds";

function task(
	overrides: Partial<KanbanBoardTaskRegistryDto> & Pick<KanbanBoardTaskRegistryDto, "id">,
): KanbanBoardTaskRegistryDto {
	const { id, content, ...rest } = overrides;
	return {
		boardId: "board-1",
		parentId: "col-1",
		position: 0,
		content: { title: "Task", ...content },
		origin: "manual",
		updatedAt: "2026-06-01T00:00:00.000Z",
		projectCode: "p1",
		projectName: "Project",
		boardSlug: "board",
		boardName: "Board",
		title: "Task",
		statusTitle: "Backlog",
		taskTypeTitle: "",
		workTypeTitle: "",
		assigneeTitle: "",
		assignees: [],
		currentAssigneeTitle: "",
		assigneeRoles: [],
		assigneeRoleTitles: [],
		assigneeRoleTitle: "",
		...rest,
		id,
	};
}

function sprint(overrides: Partial<KanbanBoardSprintDto> & Pick<KanbanBoardSprintDto, "id">) {
	const { id, ...rest } = overrides;
	return {
		supersprintId: null,
		supersprintCode: "",
		supersprintName: "",
		code: "SP1",
		name: "Sprint 1",
		description: null,
		startDate: "2026-06-01",
		endDate: "2026-06-14",
		taskCount: 0,
		createdAt: "2026-06-01T00:00:00.000Z",
		updatedAt: "2026-06-01T00:00:00.000Z",
		...rest,
		id,
	};
}

describe("resolveTaskBarDates", () => {
	it("uses due date and estimate as duration", () => {
		const bar = resolveTaskBarDates(
			task({
				id: "t1",
				dueDate: "2026-06-10",
				estimatePd: 3,
			}),
		);
		expect(bar.duration).toBe(3);
		expect(formatTrackerDueDate(bar.end)).toBe("2026-06-10");
		expect(formatTrackerDueDate(bar.start)).toBe("2026-06-08");
	});
});

describe("buildTrackerGanttTasks", () => {
	it("groups tasks under sprint summaries", () => {
		const rows = buildTrackerGanttTasks({
			tasks: [
				task({
					id: "t1",
					title: "Alpha",
					content: { title: "Alpha", sprintId: "sp1" },
					dueDate: "2026-06-05",
				}),
			],
			sprints: [sprint({ id: "sp1", code: "S1", name: "June" })],
		});

		expect(rows).toHaveLength(2);
		expect(rows[0]?.id).toBe(trackerGanttSprintId("sp1"));
		expect(rows[0]?.type).toBe("summary");
		expect(rows[1]?.parent).toBe(trackerGanttSprintId("sp1"));
		expect(rows[1]?.trackerTaskId).toBe("t1");
	});

	it("puts tasks without sprint into unassigned group", () => {
		const rows = buildTrackerGanttTasks({
			tasks: [task({ id: "t2", title: "Loose" })],
			sprints: [],
		});

		expect(rows[0]?.id).toBe(TRACKER_GANTT_UNASSIGNED_SPRINT_ID);
		expect(rows[1]?.parent).toBe(TRACKER_GANTT_UNASSIGNED_SPRINT_ID);
	});
});

describe("estimatePdFromGanttBar", () => {
	it("counts inclusive calendar days", () => {
		expect(
			estimatePdFromGanttBar(new Date(2026, 5, 8), new Date(2026, 5, 10)),
		).toBe(3);
	});
});

describe("resolveTrackerGanttTimelineBounds", () => {
	it("adds padding around task dates", () => {
		const bounds = resolveTrackerGanttTimelineBounds(
			[
				{
					start: new Date(2026, 5, 10),
					end: new Date(2026, 5, 20),
				},
			],
			new Date(2026, 5, 1),
		);
		expect(bounds.start.getDate()).toBe(3);
		expect(bounds.end.getDate()).toBe(27);
	});
});
