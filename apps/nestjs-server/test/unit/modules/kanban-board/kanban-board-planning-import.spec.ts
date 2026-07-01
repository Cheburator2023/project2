import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
	defaultKanbanBoardColumns,
	KANBAN_BOARD_HEAP_BOARD_ID,
} from "@smart-anketa/api-contract";
import { importPlanningXlsx } from "../../../../src/modules/kanban-board/utils/kanban-board-planning-import.util";
import { exportTasksRegistryXlsx } from "../../../../src/modules/kanban-board/utils/kanban-board-registry-export.util";
import { parsePlanningWorkbook } from "../../../../src/modules/kanban-board/utils/kanban-board-planning-import.util";
import * as ExcelJS from "exceljs";

const BOARD_ID = KANBAN_BOARD_HEAP_BOARD_ID;
const STAND_ID = "stand-a";

const BOARD_COLUMNS = defaultKanbanBoardColumns(BOARD_ID).map((column) => ({
	id: column.id,
	title: column.title,
}));

const FIXTURE_PATH = join(
	__dirname,
	"fixtures",
	"manager-planning-sample.xlsx",
);

const SAMPLE_XLSX =
	"/Users/synikolaev/Downloads/Telegram Desktop/2026.2СС.6С. Планирование_2606.xlsx";

async function loadFixtureBuffer(): Promise<Buffer> {
	try {
		return await readFile(FIXTURE_PATH);
	} catch {
		return readFile(SAMPLE_XLSX);
	}
}

describe("kanban board planning import", () => {
	it("parses manager-style backlog and workload sheets", async () => {
		const buf = await loadFixtureBuffer();
		const result = await importPlanningXlsx(buf, {
			boardId: BOARD_ID,
			standId: STAND_ID,
			columns: BOARD_COLUMNS,
		});

		expect(result.payload.length).toBeGreaterThan(50);

		const parentTask = result.payload.find((task) =>
			task.content.title.includes("Автоматическое подтверждение аллокации"),
		);
		expect(parentTask).toBeDefined();
		expect(parentTask?.content.backlogNumber).toBe(1);
		expect(parentTask?.content.priority).toBe("high");
		expect(parentTask?.content.customer).toBe("ДАДМ");
		expect(parentTask?.content.sprintOutcome).toBe("Релиз");
		expect(parentTask?.content.dueDate).toBe("2026-05-26");

		const subtask = result.payload.find((task) =>
			task.content.title.includes("Тестирование обновленной формы"),
		);
		expect(subtask?.content.parentTask).toBe(
			"Автоматическое подтверждение аллокации",
		);
		expect(subtask?.parentId).toBe("done");
		expect(subtask?.content.roleEstimates?.qa).toBe(0.5);

		const workloadTask = result.payload.find((task) =>
			task.content.title.includes("Добавление ЭУЗ в АИС СУМ"),
		);
		expect(workloadTask?.content.currentAssignee).toBe("Якупова");
		expect(workloadTask?.content.assignees).toContain("Якупова");

		const workloadOnlyTask = result.payload.find((task) =>
			task.content.title.includes("Акт ввода в экспл"),
		);
		expect(workloadOnlyTask?.content.currentAssignee).toBe("Якупова");
		expect(
			result.warnings.some((warning) =>
				warning.includes("Акт ввода в экспл"),
			),
		).toBe(true);
	});

	it("imports registry export workbook", async () => {
		const exported = await exportTasksRegistryXlsx([
			{
				id: "01JTEST000000000000000001",
				boardId: BOARD_ID,
				projectId: "01J000000000000000000004",
				taskNumber: 1,
				parentId: "todo",
				position: 0,
				origin: STAND_ID,
				updatedAt: "2026-06-16T12:00:00.000Z",
				content: {
					title: "Экспортная задача",
					priority: "medium",
					customer: "ACME",
					roleEstimates: { developer: 2 },
					assignees: ["Иванов"],
					currentAssignee: "Иванов",
				},
				projectCode: "PRJ",
				projectName: "Demo",
				taskKey: "PRJ-1",
				boardSlug: "demo",
				boardName: "Demo board",
				boardKey: "PRJ-DEMO",
				title: "Экспортная задача",
				statusTitle: "К выполнению",
				taskTypeTitle: "Задача",
				workTypeTitle: "Фича",
				assigneeTitle: "Иванов",
				assignees: ["Иванов"],
				currentAssigneeTitle: "Иванов",
				assigneeRoles: [],
				assigneeRoleTitles: [],
				assigneeRoleTitle: "",
				customer: "ACME",
			},
		]);

		const result = await importPlanningXlsx(exported, {
			boardId: BOARD_ID,
			standId: STAND_ID,
			columns: BOARD_COLUMNS,
		});

		expect(result.payload).toHaveLength(1);
		expect(result.payload[0].content.title).toBe("Экспортная задача");
		expect(result.payload[0].parentId).toBe("todo");
		expect(result.payload[0].content.customer).toBe("ACME");
	});

	it("recognizes alternate sheet and column names", async () => {
		const workbook = new ExcelJS.Workbook();
		const sheet = workbook.addWorksheet("Backlog sprint 12");
		sheet.addRow([
			"Num",
			"Priority",
			"Column",
			"Name",
			"Customer",
			"Due",
			"Dev",
		]);
		sheet.addRow(["1", "High", "In progress", "Smoke task", "Client", "2026-07-01", "3"]);

		const parsed = parsePlanningWorkbook(workbook, {
			boardId: BOARD_ID,
			standId: STAND_ID,
			columns: BOARD_COLUMNS,
		});

		expect(parsed.payload).toHaveLength(1);
		expect(parsed.payload[0].content.title).toBe("Smoke task");
		expect(parsed.payload[0].parentId).toBe("in_progress");
		expect(parsed.payload[0].content.priority).toBe("high");
		expect(parsed.payload[0].content.roleEstimates?.developer).toBe(3);
	});
});
