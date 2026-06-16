import * as ExcelJS from "exceljs";
import type { KanbanBoardTaskRegistryDto } from "@smart-anketa/api-contract";

const UNASSIGNED_ASSIGNEE = "— без исполнителя —";

const TASK_EXPORT_COLUMNS = [
	{ header: "Заголовок", key: "title", width: 42 },
	{ header: "Проект", key: "project", width: 28 },
	{ header: "Доска", key: "board", width: 24 },
	{ header: "Статус", key: "status", width: 16 },
	{ header: "Тип", key: "taskType", width: 14 },
	{ header: "Тип работ", key: "workType", width: 24 },
	{ header: "Оценка, чд", key: "estimatePd", width: 12 },
	{ header: "Срок", key: "dueDate", width: 12 },
	{ header: "Родитель", key: "parentTask", width: 24 },
	{ header: "Спринт", key: "sprint", width: 20 },
	{ header: "Стрим", key: "stream", width: 20 },
	{ header: "Стенд", key: "origin", width: 12 },
	{ header: "Обновлено", key: "updatedAt", width: 22 },
] as const;

export function groupTasksByAssignee(
	tasks: KanbanBoardTaskRegistryDto[],
): Map<string, KanbanBoardTaskRegistryDto[]> {
	const groups = new Map<string, KanbanBoardTaskRegistryDto[]>();
	for (const task of tasks) {
		const assignee = task.content.assignee?.trim() || UNASSIGNED_ASSIGNEE;
		const bucket = groups.get(assignee) ?? [];
		bucket.push(task);
		groups.set(assignee, bucket);
	}
	return groups;
}

export function sortAssigneeGroupKeys(keys: string[]): string[] {
	return [...keys].sort((left, right) => {
		if (left === UNASSIGNED_ASSIGNEE) return 1;
		if (right === UNASSIGNED_ASSIGNEE) return -1;
		return left.localeCompare(right, "ru");
	});
}

export function sanitizeExcelWorksheetName(
	name: string,
	usedNames: Set<string>,
): string {
	const sanitized = name
		.replace(/[\\/*?:\[\]]/g, "-")
		.replace(/\s+/g, " ")
		.trim()
		.slice(0, 31);
	const base = sanitized || "Лист";
	let candidate = base;
	let suffix = 2;
	while (usedNames.has(candidate.toLowerCase())) {
		const tail = `-${suffix}`;
		candidate = `${base.slice(0, Math.max(1, 31 - tail.length))}${tail}`;
		suffix += 1;
	}
	usedNames.add(candidate.toLowerCase());
	return candidate;
}

function taskToExportRow(task: KanbanBoardTaskRegistryDto): Record<string, string | number> {
	return {
		title: task.title,
		project: `${task.projectCode} — ${task.projectName}`,
		board: `${task.boardSlug} — ${task.boardName}`,
		status: task.statusTitle,
		taskType: task.taskTypeTitle,
		workType: task.workTypeTitle,
		estimatePd: task.estimatePd ?? "",
		dueDate: task.dueDate ?? "",
		parentTask: task.parentTask ?? "",
		sprint: task.sprintTitle ?? "",
		stream: task.streamCustomer ?? "",
		origin: task.origin,
		updatedAt: task.updatedAt,
	};
}

export function fillGroupedTasksWorksheet(
	worksheet: ExcelJS.Worksheet,
	tasks: KanbanBoardTaskRegistryDto[],
): void {
	worksheet.columns = TASK_EXPORT_COLUMNS.map((column) => ({ ...column }));
	worksheet.getRow(1).font = { bold: true };
	worksheet.views = [{ state: "frozen", ySplit: 1 }];

	const groups = groupTasksByAssignee(tasks);
	const assignees = sortAssigneeGroupKeys([...groups.keys()]);
	let rowIndex = 2;

	for (const assignee of assignees) {
		const groupHeader = worksheet.getRow(rowIndex);
		groupHeader.getCell(1).value = `Исполнитель: ${assignee}`;
		groupHeader.font = { bold: true, italic: true };
		worksheet.mergeCells(rowIndex, 1, rowIndex, TASK_EXPORT_COLUMNS.length);
		rowIndex += 1;

		for (const task of groups.get(assignee) ?? []) {
			worksheet.addRow(taskToExportRow(task));
			rowIndex += 1;
		}

		rowIndex += 1;
	}
}

export async function exportTasksRegistryWorkbook(
	sheets: { name: string; tasks: KanbanBoardTaskRegistryDto[] }[],
): Promise<Buffer> {
	const workbook = new ExcelJS.Workbook();
	const usedNames = new Set<string>();

	if (!sheets.length) {
		const worksheet = workbook.addWorksheet("Задачи");
		fillGroupedTasksWorksheet(worksheet, []);
		return Buffer.from(await workbook.xlsx.writeBuffer());
	}

	for (const sheet of sheets) {
		const worksheet = workbook.addWorksheet(
			sanitizeExcelWorksheetName(sheet.name, usedNames),
		);
		fillGroupedTasksWorksheet(worksheet, sheet.tasks);
	}

	return Buffer.from(await workbook.xlsx.writeBuffer());
}

export async function exportTasksRegistryXlsx(
	tasks: KanbanBoardTaskRegistryDto[],
): Promise<Buffer> {
	return exportTasksRegistryWorkbook([{ name: "Задачи", tasks }]);
}
