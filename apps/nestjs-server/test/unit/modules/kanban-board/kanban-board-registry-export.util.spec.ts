import type { KanbanBoardTaskRegistryDto } from "@smart-anketa/api-contract";
import {
	groupTasksByAssignee,
	sanitizeExcelWorksheetName,
	sortAssigneeGroupKeys,
} from "../../../../src/modules/kanban-board/utils/kanban-board-registry-export.util";

function task(
	overrides: Partial<KanbanBoardTaskRegistryDto> & Pick<KanbanBoardTaskRegistryDto, "id">,
): KanbanBoardTaskRegistryDto {
	return {
		boardId: "board-1",
		parentId: "backlog",
		position: 0,
		content: { title: overrides.title ?? "Task" },
		origin: "local",
		updatedAt: "2026-06-16T00:00:00.000Z",
		projectCode: "prj",
		projectName: "Project",
		boardSlug: "main",
		boardName: "Main",
		title: overrides.title ?? "Task",
		statusTitle: "Backlog",
		taskTypeTitle: "",
		workTypeTitle: "",
		assigneeTitle: "",
		assignees: [],
		currentAssigneeTitle: "",
		assigneeRoles: [],
		assigneeRoleTitles: [],
		assigneeRoleTitle: "",
		...overrides,
	};
}

describe("kanban-board-registry-export.util", () => {
	it("groups tasks by assignee with unassigned bucket last", () => {
		const groups = groupTasksByAssignee([
			task({ id: "1", content: { title: "A", assignees: ["Bob"] } }),
			task({ id: "2", content: { title: "B" } }),
			task({ id: "3", content: { title: "C", assignees: ["Alice", "Bob"] } }),
		]);

		expect(sortAssigneeGroupKeys([...groups.keys()])).toEqual([
			"Alice",
			"Bob",
			"— без исполнителя —",
		]);
		expect(groups.get("Alice")).toHaveLength(1);
		expect(groups.get("Bob")).toHaveLength(2);
		expect(groups.get("— без исполнителя —")).toHaveLength(1);
	});

	it("sanitizes worksheet names and keeps them unique", () => {
		const used = new Set<string>();
		expect(sanitizeExcelWorksheetName("sp/01 — Sprint", used)).toBe("sp-01 — Sprint");
		expect(sanitizeExcelWorksheetName("sp/01 — Sprint", used)).toBe("sp-01 — Sprint-2");
	});
});
