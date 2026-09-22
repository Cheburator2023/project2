import type { KanbanBoardTaskRegistryDto } from "@smart-anketa/api-contract";
import * as ExcelJS from "exceljs";
import { exportPlanningXlsx } from "../../../../src/modules/kanban-board/utils/kanban-board-registry-export.util";

function task(
	title: string,
	roleEstimates?: KanbanBoardTaskRegistryDto["content"]["roleEstimates"],
): KanbanBoardTaskRegistryDto {
	return {
		id: "01JTEST000000000000000001",
		boardId: "board",
		projectId: "project",
		taskNumber: 1,
		parentId: "todo",
		position: 0,
		origin: "stand",
		updatedAt: "2026-06-16T12:00:00.000Z",
		content: {
			title,
			assignees: ["Иванов"],
			currentAssignee: "Иванов",
			roleEstimates,
		},
		projectCode: "PRJ",
		projectName: "Demo",
		taskKey: "PRJ-1",
		boardSlug: "demo",
		boardName: "Demo",
		boardKey: "PRJ-DEMO",
		title,
		statusTitle: "К выполнению",
		taskTypeTitle: "Задача",
		workTypeTitle: "",
		assigneeTitle: "Иванов",
		assignees: ["Иванов"],
		currentAssigneeTitle: "Иванов",
		assigneeRoles: [],
		assigneeRoleTitles: [],
		assigneeRoleTitle: "",
	};
}

function cellText(worksheet: ExcelJS.Worksheet, row: number, column: number) {
	return worksheet.getRow(row).getCell(column).value;
}

describe("planning xlsx export", () => {
	it("starts with all tasks grouped by theme, then one sheet per release with assignee load", async () => {
		const buffer = await exportPlanningXlsx({
			name: "План",
			themes: [
				{ id: "th1", name: "Платформа", position: 0, color: "#1d4ed8" },
			],
			releases: [
				{ id: "r1", code: "REL-1", name: "Июнь" },
				{ id: "r2", code: "REL-2", name: "Июль" },
			],
			assignees: [
				{ name: "Иванов", role: "developer", roleTitle: "Разработчик" },
			],
			tasks: [
				{
					themeId: "th1",
					position: 0,
					releaseIds: ["r1"],
					task: task("Июньская", { developer: 3 }),
				},
				{
					themeId: null,
					position: 1,
					releaseIds: [],
					task: task("Вне релиза", { analyst: 1 }),
				},
				{
					themeId: "th1",
					position: 2,
					releaseIds: ["r1", "r2"],
					task: task("В двух релизах", { developer: 2 }),
				},
			],
		});

		const workbook = new ExcelJS.Workbook();
		await workbook.xlsx.load(buffer);
		expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual([
			"Общий",
			"REL-1 — Июнь",
			"REL-2 — Июль",
		]);

		const overview = workbook.getWorksheet("Общий");
		expect(cellText(overview!, 1, 1)).toBe("Планирование: План");
		expect(cellText(overview!, 3, 1)).toContain("Группа: Платформа");
		expect(overview!.getRow(3).getCell(1).fill).toMatchObject({
			fgColor: { argb: "FF1D4ED8" },
		});
		const titleColumn = columnByHeader(overview!, "Заголовок");
		const overviewTitles = columnValues(overview!, titleColumn);
		expect(overviewTitles).toEqual(
			expect.arrayContaining(["Июньская", "В двух релизах", "Вне релиза"]),
		);
		expect(columnValues(overview!, 1).join("\n")).toContain("Группа: Без группы");
		const juneEstimate = overview!
			.getRow(rowWithTitle(overview!, "Июньская", titleColumn))
			.getCell(estimateColumn(overview!));
		expect(juneEstimate.value).toBe(3);
		expect(juneEstimate.fill).toMatchObject({
			fgColor: { argb: "FFFEF3C7" },
		});

		const june = workbook.getWorksheet("REL-1 — Июнь");
		const juneTitle = columnByHeader(june!, "Заголовок");
		expect(columnValues(june!, juneTitle)).toEqual(
			expect.arrayContaining(["Июньская", "В двух релизах"]),
		);
		expect(columnValues(june!, juneTitle)).not.toContain("Вне релиза");
		const assigneeHeader = rowWithTitle(june!, "Исполнители", 1);
		expect(assigneeHeader).toBeGreaterThan(
			rowWithTitle(june!, "Июньская", juneTitle),
		);
		expect(cellText(june!, assigneeHeader + 2, 1)).toBe("Иванов");
		expect(cellText(june!, assigneeHeader + 2, 2)).toBe("Разработчик");
		expect(cellText(june!, assigneeHeader + 2, 4)).toBe(5);

		const july = workbook.getWorksheet("REL-2 — Июль");
		const julyTitle = columnByHeader(july!, "Заголовок");
		expect(columnValues(july!, julyTitle)).toContain("В двух релизах");
		expect(columnValues(july!, julyTitle)).not.toContain("Июньская");
		expect(cellText(july!, rowWithTitle(july!, "Иванов", 1), 4)).toBe(2);
	});
});

function columnValues(worksheet: ExcelJS.Worksheet, column: number): unknown[] {
	const values: unknown[] = [];
	worksheet.eachRow((row) => {
		const value = row.getCell(column).value;
		if (value !== null && value !== undefined && value !== "") values.push(value);
	});
	return values;
}

function rowWithTitle(
	worksheet: ExcelJS.Worksheet,
	title: string,
	column = 4,
): number {
	let found = 0;
	worksheet.eachRow((row) => {
		if (found) return;
		if (row.getCell(column).value === title) found = row.number;
	});
	return found;
}

function columnByHeader(worksheet: ExcelJS.Worksheet, header: string): number {
	const row = worksheet.getRow(2);
	for (let column = 1; column <= row.cellCount; column += 1) {
		if (row.getCell(column).value === header) return column;
	}
	throw new Error(`Не найдена колонка «${header}»`);
}

function estimateColumn(worksheet: ExcelJS.Worksheet): number {
	return columnByHeader(worksheet, "Итого, чд");
}
