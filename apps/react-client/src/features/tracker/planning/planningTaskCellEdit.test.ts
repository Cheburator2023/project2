import { describe, expect, it } from "vitest";
import type { KanbanBoardTaskRegistryDto } from "@smart-anketa/api-contract";
import {
	applyPlanningTaskFieldToTask,
	isPlanningTaskPersistColId,
	roleEstimateColId,
} from "./planningTaskCellEdit";

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
		statusTitle: "Сделать",
		taskTypeTitle: "",
		workTypeTitle: "",
		assigneeTitle: "",
		assignees: [],
		currentAssigneeTitle: "",
		assigneeRoles: [],
		assigneeRoleTitles: [],
		assigneeRoleTitle: "",
		...partial,
	}) as KanbanBoardTaskRegistryDto;

describe("applyPlanningTaskFieldToTask", () => {
	it("updates title in content so the planning grid can save from the row", () => {
		const row = task({ id: "1" });
		expect(applyPlanningTaskFieldToTask(row, "title", "Новое имя")).toBe(true);
		expect(row.title).toBe("Новое имя");
		expect(row.content.title).toBe("Новое имя");
	});

	it("rejects an empty title so the card stays valid", () => {
		const row = task({ id: "1" });
		expect(applyPlanningTaskFieldToTask(row, "title", "  ")).toBe(false);
		expect(row.content.title).toBe("T");
	});

	it("maps status title to the board column id", () => {
		const row = task({ id: "1" });
		expect(
			applyPlanningTaskFieldToTask(row, "status", "Разработка (В работе)"),
		).toBe(true);
		expect(row.parentId).toBe("dev_wip");
		expect(row.statusTitle).toBe("Разработка (В работе)");
	});

	it("turns the blocker flag on and off", () => {
		const row = task({ id: "1" });
		expect(applyPlanningTaskFieldToTask(row, "blocker", "есть")).toBe(true);
		expect(row.content.hasBlocker).toBe(true);
		expect(applyPlanningTaskFieldToTask(row, "blocker", "")).toBe(true);
		expect(row.content.hasBlocker).toBeUndefined();
	});

	it("sums role estimates into the total person-days", () => {
		const row = task({ id: "1" });
		expect(
			applyPlanningTaskFieldToTask(row, roleEstimateColId("developer"), "2"),
		).toBe(true);
		expect(
			applyPlanningTaskFieldToTask(row, roleEstimateColId("qa"), "1.5"),
		).toBe(true);
		expect(row.content.roleEstimates).toEqual({ developer: 2, qa: 1.5 });
		expect(row.effectiveEstimatePd).toBe(3.5);
		expect(row.content.estimatePd).toBe(3.5);
	});

	it("lets a manual total replace role estimates", () => {
		const row = task({
			id: "1",
			content: { title: "T", roleEstimates: { developer: 2 } },
		});
		expect(applyPlanningTaskFieldToTask(row, "estimatePd", "5")).toBe(true);
		expect(row.content.roleEstimates).toBeUndefined();
		expect(row.content.estimatePd).toBe(5);
	});
});

describe("isPlanningTaskPersistColId", () => {
	it("persists task fields but not the planning release column", () => {
		expect(isPlanningTaskPersistColId("title")).toBe(true);
		expect(isPlanningTaskPersistColId(roleEstimateColId("analyst"))).toBe(true);
		expect(isPlanningTaskPersistColId("releaseId")).toBe(false);
		expect(isPlanningTaskPersistColId("groupTitle")).toBe(false);
	});
});
