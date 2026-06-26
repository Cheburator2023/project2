import * as ExcelJS from "exceljs";
import type { KanbanBoardTaskRegistryDto } from "@smart-anketa/api-contract";
import {
	KANBAN_BOARD_ROLE_ESTIMATE_FIELDS,
	kanbanBoardEffectiveEstimatePd,
	kanbanBoardPriorityTitle,
	kanbanBoardTaskAssignees,
} from "@smart-anketa/api-contract";

const UNASSIGNED_ASSIGNEE = "— без исполнителя —";

const TASK_EXPORT_COLUMNS = [
	{ header: "№", key: "backlogNumber", width: 6 },
	{ header: "Приоритет", key: "priority", width: 12 },
	{ header: "Статус", key: "status", width: 14 },
	{ header: "Заголовок", key: "title", width: 42 },
	{ header: "Заказчик", key: "customer", width: 14 },
	{ header: "Результат спринта", key: "sprintOutcome", width: 28 },
	{ header: "Срок", key: "dueDate", width: 14 },
	{ header: "Аналитик", key: "analyst", width: 10 },
	{ header: "Разработчик", key: "developer", width: 12 },
	{ header: "Тестировщик", key: "qa", width: 12 },
	{ header: "Отладка", key: "debug", width: 10 },
	{ header: "DevOps", key: "devops", width: 10 },
	{ header: "Архитектор", key: "architect", width: 12 },
	{ header: "Итого, чд", key: "estimatePd", width: 10 },
	{ header: "Проект", key: "project", width: 24 },
	{ header: "Доска", key: "board", width: 20 },
	{ header: "Тип", key: "taskType", width: 14 },
	{ header: "Тип работ", key: "workType", width: 22 },
	{ header: "Исполнитель", key: "assignee", width: 18 },
	{ header: "Родитель", key: "parentTask", width: 24 },
	{ header: "Спринт", key: "sprint", width: 18 },
	{ header: "Стрим", key: "stream", width: 18 },
	{ header: "Стенд", key: "origin", width: 12 },
	{ header: "Обновлено", key: "updatedAt", width: 22 },
] as const;

const WORKLOAD_COLUMNS = [
	{ header: "ФИО", key: "assignee", width: 22 },
	{ header: "Задача", key: "title", width: 48 },
	{ header: "Трудоёмкость, чд", key: "effort", width: 16 },
	{ header: "Ёмкость, чд", key: "capacity", width: 14 },
] as const;

export function groupTasksByAssignee(
	tasks: KanbanBoardTaskRegistryDto[],
): Map<string, KanbanBoardTaskRegistryDto[]> {
	const groups = new Map<string, KanbanBoardTaskRegistryDto[]>();
	for (const task of tasks) {
		const assignees = kanbanBoardTaskAssignees(task.content);
		if (!assignees.length) {
			const bucket = groups.get(UNASSIGNED_ASSIGNEE) ?? [];
			bucket.push(task);
			groups.set(UNASSIGNED_ASSIGNEE, bucket);
			continue;
		}
		for (const assignee of assignees) {
			const bucket = groups.get(assignee) ?? [];
			bucket.push(task);
			groups.set(assignee, bucket);
		}
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
	const roleEstimates = task.content.roleEstimates ?? {};
	const row: Record<string, string | number> = {
		backlogNumber: task.backlogNumber ?? "",
		priority: task.priorityTitle ?? kanbanBoardPriorityTitle(task.content.priority),
		status: task.statusTitle,
		title: task.title,
		customer: task.customer ?? "",
		sprintOutcome: task.sprintOutcome ?? task.content.sprintOutcome ?? "",
		dueDate: task.dueDate ?? "",
		estimatePd: kanbanBoardEffectiveEstimatePd(task.content) ?? "",
		project: `${task.projectCode} — ${task.projectName}`,
		board: `${task.boardSlug} — ${task.boardName}`,
		taskType: task.taskTypeTitle,
		workType: task.workTypeTitle,
		assignee: task.assigneeTitle,
		parentTask: task.parentTask ?? "",
		sprint: task.sprintTitle ?? "",
		stream: task.streamCustomer ?? "",
		origin: task.origin,
		updatedAt: task.updatedAt,
	};
	for (const field of KANBAN_BOARD_ROLE_ESTIMATE_FIELDS) {
		row[field.key] = roleEstimates[field.key] ?? "";
	}
	return row;
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

export function fillAssigneeWorkloadWorksheet(
	worksheet: ExcelJS.Worksheet,
	tasks: KanbanBoardTaskRegistryDto[],
	assigneeCapacities: Map<string, number> = new Map(),
): void {
	worksheet.columns = WORKLOAD_COLUMNS.map((column) => ({ ...column }));
	worksheet.getRow(1).font = { bold: true };
	worksheet.views = [{ state: "frozen", ySplit: 1 }];

	const groups = groupTasksByAssignee(tasks);
	const assignees = sortAssigneeGroupKeys([...groups.keys()]);

	for (const assignee of assignees) {
		const groupTasks = groups.get(assignee) ?? [];
		let total = 0;
		const capacity = assigneeCapacities.get(assignee) ?? "";
		for (const task of groupTasks) {
			const effort = kanbanBoardEffectiveEstimatePd(task.content) ?? 0;
			total += effort;
			worksheet.addRow({
				assignee,
				title: task.title,
				effort: effort || "",
				capacity: "",
			});
		}
		if (groupTasks.length) {
			const totalRow = worksheet.addRow({
				assignee,
				title: "Итого",
				effort: total || "",
				capacity: capacity === "" ? "" : capacity,
			});
			totalRow.font = { bold: true };
		}
	}
}

export async function exportTasksRegistryWorkbook(
	sheets: { name: string; tasks: KanbanBoardTaskRegistryDto[] }[],
): Promise<Buffer> {
	const workbook = new ExcelJS.Workbook();
	const usedNames = new Set<string>();

	if (!sheets.length) {
		const worksheet = workbook.addWorksheet("Бэклог");
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
	assigneeCapacities: Map<string, number> = new Map(),
): Promise<Buffer> {
	const workbook = new ExcelJS.Workbook();
	const usedNames = new Set<string>();

	const backlogSheet = workbook.addWorksheet(
		sanitizeExcelWorksheetName("Бэклог", usedNames),
	);
	fillGroupedTasksWorksheet(backlogSheet, tasks);

	const workloadSheet = workbook.addWorksheet(
		sanitizeExcelWorksheetName("Загрузка", usedNames),
	);
	fillAssigneeWorkloadWorksheet(workloadSheet, tasks, assigneeCapacities);

	return Buffer.from(await workbook.xlsx.writeBuffer());
}
