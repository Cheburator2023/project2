import * as ExcelJS from "exceljs";
import type {
	KanbanBoardAssigneeRoleId,
	KanbanBoardRoleEstimates,
	KanbanBoardTaskRegistryDto,
} from "@smart-anketa/api-contract";
import {
	KANBAN_BOARD_ROLE_ESTIMATE_FIELDS,
	kanbanBoardAssigneeRoleTitle,
	kanbanBoardEffectiveEstimatePd,
	kanbanBoardPriorityTitle,
	kanbanBoardRoleEstimatesTotal,
	kanbanBoardTaskAssignees,
	kanbanBoardTaskStandsTitle,
	kanbanBoardTaskSystemsTitle,
} from "@smart-anketa/api-contract";

const UNASSIGNED_ASSIGNEE = "— без исполнителя —";

const TASK_EXPORT_COLUMNS = [
	{ header: "№", key: "backlogNumber", width: 6 },
	{ header: "Приоритет", key: "priority", width: 12 },
	{ header: "Статус", key: "status", width: 14 },
	{ header: "Заголовок", key: "title", width: 42 },
	{ header: "Заказчик", key: "customer", width: 14 },
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
	{ header: "Релиз", key: "release", width: 22 },
	{ header: "Стрим", key: "stream", width: 18 },
	{ header: "Стенд", key: "stand", width: 12 },
	{ header: "Система", key: "system", width: 16 },
	{ header: "Стенд данных", key: "origin", width: 14 },
	{ header: "Создал", key: "createdBy", width: 18 },
	{ header: "Создано", key: "createdAt", width: 22 },
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
		dueDate: task.dueDate ?? "",
		estimatePd: kanbanBoardEffectiveEstimatePd(task.content) ?? "",
		project: `${task.projectCode} — ${task.projectName}`,
		board: `${task.boardKey} — ${task.boardName}`,
		taskType: task.taskTypeTitle,
		workType: task.workTypeTitle,
		assignee: task.assigneeTitle,
		parentTask: task.parentTask ?? "",
		sprint: task.sprintTitle ?? "",
		release: task.releaseTitle ?? "",
		stream: task.streamCustomer ?? "",
		stand: task.standTitle || kanbanBoardTaskStandsTitle(task.content),
		system: task.systemTitle || kanbanBoardTaskSystemsTitle(task.content),
		origin: task.origin,
		createdBy: task.createdBy ?? "",
		createdAt: task.createdAt ?? "",
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

const PLANNING_TASK_COLUMNS = [
	{ header: "№", key: "backlogNumber", width: 6 },
	{ header: "Ключ", key: "taskKey", width: 16 },
	...TASK_EXPORT_COLUMNS.slice(1),
] as const;

const PLANNING_COLUMN_WIDTHS: Record<string, number> = {
	backlogNumber: 28,
	assignee: 40,
	analyst: 18,
	developer: 18,
	qa: 18,
	debug: 16,
	devops: 16,
	architect: 18,
	estimatePd: 16,
};

const PLANNING_ESTIMATE_KEYS = new Set<string>([
	...KANBAN_BOARD_ROLE_ESTIMATE_FIELDS.map((field) => field.key),
	"estimatePd",
]);

const PLANNING_FILL = {
	title: "FF1E3A5F",
	header: "FF1F4E79",
	estimateHeader: "FFB45309",
	estimate: "FFFEF3C7",
	estimateTotal: "FFFDE68A",
	zebra: "FFF8FAFC",
	white: "FFFFFFFF",
	subtotal: "FFE8EEF5",
	assigneeTitle: "FF14532D",
	assigneeHeader: "FF166534",
	assigneeZebra: "FFF0FDF4",
	assigneeTotal: "FFDCFCE7",
	border: "FFD0D7DE",
	ink: "FF1F2937",
	whiteInk: "FFFFFFFF",
} as const;

export type PlanningExportTask = {
	themeId: string | null;
	position: number;
	releaseIds: string[];
	task: KanbanBoardTaskRegistryDto;
};

export type PlanningExportTheme = {
	id: string;
	name: string;
	position: number;
	color?: string;
};

export type PlanningExportRelease = {
	id: string;
	code: string;
	name: string;
};

export type PlanningExportAssignee = {
	name: string;
	role?: KanbanBoardAssigneeRoleId | null;
	roleTitle?: string;
};

type PlanningExportSection = {
	name: string;
	color?: string;
	tasks: PlanningExportTask[];
};

/** Первый лист — все задачи по группам, дальше по листу на релиз. */
export async function exportPlanningXlsx(input: {
	name: string;
	themes: ReadonlyArray<PlanningExportTheme>;
	releases: ReadonlyArray<PlanningExportRelease>;
	tasks: ReadonlyArray<PlanningExportTask>;
	assignees?: ReadonlyArray<PlanningExportAssignee>;
}): Promise<Buffer> {
	const workbook = new ExcelJS.Workbook();
	const usedNames = new Set<string>();
	const assignees = input.assignees ?? [];
	const overview = workbook.addWorksheet(
		sanitizeExcelWorksheetName("Общий", usedNames),
	);
	overview.properties.tabColor = { argb: PLANNING_FILL.title };
	fillPlanningTaskSheet(overview, {
		title: `Планирование: ${input.name.trim() || "без названия"}`,
		sections: planningSections(input.tasks, input.themes),
		releaseLabel: (item) => planningReleaseLabels(item, input.releases),
	});

	for (const release of input.releases) {
		const tasks = input.tasks
			.filter((item) => item.releaseIds.includes(release.id))
			.sort((left, right) => left.position - right.position);
		const worksheet = workbook.addWorksheet(
			sanitizeExcelWorksheetName(
				`${release.code} — ${release.name}`.trim(),
				usedNames,
			),
		);
		worksheet.properties.tabColor = { argb: "FFC2410C" };
		fillPlanningTaskSheet(worksheet, {
			title: `Релиз: ${release.code} — ${release.name}`.trim(),
			sections: planningSections(tasks, input.themes),
			releaseLabel: () => `${release.code} — ${release.name}`.trim(),
		});
		writePlanningAssigneeTable(worksheet, tasks, assignees);
	}

	return Buffer.from(await workbook.xlsx.writeBuffer());
}

function planningSections(
	tasks: ReadonlyArray<PlanningExportTask>,
	themes: ReadonlyArray<PlanningExportTheme>,
): PlanningExportSection[] {
	const byTheme = new Map<string, PlanningExportTask[]>();
	for (const item of [...tasks].sort(
		(left, right) => left.position - right.position,
	)) {
		const key = item.themeId ?? "";
		const bucket = byTheme.get(key) ?? [];
		bucket.push(item);
		byTheme.set(key, bucket);
	}
	const sections: PlanningExportSection[] = [...themes]
		.sort(
			(left, right) =>
				left.position - right.position ||
				left.name.localeCompare(right.name, "ru"),
		)
		.filter((theme) => byTheme.has(theme.id))
		.map((theme) => ({
			name: theme.name,
			color: theme.color,
			tasks: byTheme.get(theme.id) ?? [],
		}));
	const unthemed = byTheme.get("") ?? [];
	if (unthemed.length) {
		sections.push({
			name: "Без группы",
			color: "#64748b",
			tasks: unthemed,
		});
	}
	return sections;
}

function planningReleaseLabels(
	item: PlanningExportTask,
	releases: ReadonlyArray<PlanningExportRelease>,
): string {
	return item.releaseIds
		.map((id) => releases.find((release) => release.id === id))
		.filter((release): release is PlanningExportRelease => Boolean(release))
		.map((release) => `${release.code} — ${release.name}`.trim())
		.join(", ");
}

function fillPlanningTaskSheet(
	worksheet: ExcelJS.Worksheet,
	input: {
		title: string;
		sections: PlanningExportSection[];
		releaseLabel: (item: PlanningExportTask) => string;
	},
): void {
	worksheet.columns = PLANNING_TASK_COLUMNS.map((column) => ({
		key: column.key,
		width: PLANNING_COLUMN_WIDTHS[column.key] ?? column.width,
	}));
	worksheet.views = [{ state: "frozen", ySplit: 2 }];
	writePlanningBanner(worksheet, input.title, PLANNING_FILL.title);
	writePlanningHeader(worksheet);

	let dataIndex = 0;
	for (const section of input.sections) {
		writePlanningGroupBanner(worksheet, section);
		for (const item of section.tasks) {
			const row = worksheet.addRow(
				planningTaskCells(item.task, input.releaseLabel(item)),
			);
			stylePlanningDataRow(row, dataIndex % 2 === 1);
			dataIndex += 1;
		}
		writePlanningSubtotal(worksheet, `Итого: ${section.name}`, section.tasks);
		worksheet.addRow([]);
	}
	if (!input.sections.length) {
		const empty = worksheet.addRow({ title: "Нет задач" });
		empty.font = { italic: true, color: { argb: "FF64748B" } };
	}
}

function planningTaskCells(
	task: KanbanBoardTaskRegistryDto,
	releaseLabel: string,
): Record<string, string | number> {
	const row = taskToExportRow(task);
	row.taskKey = task.taskKey;
	row.release = releaseLabel;
	const estimates = task.content.roleEstimates ?? {};
	for (const field of KANBAN_BOARD_ROLE_ESTIMATE_FIELDS) {
		const value = estimates[field.key];
		row[field.key] = typeof value === "number" ? value : "";
	}
	const total = kanbanBoardEffectiveEstimatePd(task.content);
	row.estimatePd = typeof total === "number" ? total : "";
	return row;
}

function writePlanningBanner(
	worksheet: ExcelJS.Worksheet,
	text: string,
	fill: string,
): void {
	const row = worksheet.addRow([text]);
	row.height = 26;
	worksheet.mergeCells(row.number, 1, row.number, PLANNING_TASK_COLUMNS.length);
	paintPlanningCell(row.getCell(1), fill, {
		bold: true,
		size: 14,
		color: { argb: PLANNING_FILL.whiteInk },
	});
	row.getCell(1).alignment = { vertical: "middle", horizontal: "left" };
}

function writePlanningHeader(worksheet: ExcelJS.Worksheet): void {
	const row = worksheet.addRow(
		PLANNING_TASK_COLUMNS.map((column) => column.header),
	);
	row.height = 22;
	PLANNING_TASK_COLUMNS.forEach((column, index) => {
		const estimate = PLANNING_ESTIMATE_KEYS.has(column.key);
		paintPlanningCell(
			row.getCell(index + 1),
			estimate ? PLANNING_FILL.estimateHeader : PLANNING_FILL.header,
			{ bold: true, color: { argb: PLANNING_FILL.whiteInk } },
		);
		row.getCell(index + 1).alignment = {
			vertical: "middle",
			horizontal: estimate ? "center" : "left",
			wrapText: !estimate,
		};
	});
}

function writePlanningGroupBanner(
	worksheet: ExcelJS.Worksheet,
	section: PlanningExportSection,
): void {
	const total = sectionEstimateTotal(section.tasks);
	const label = total
		? `Группа: ${section.name} · ${section.tasks.length} · ${formatPlanningPd(total)} чд`
		: `Группа: ${section.name} · ${section.tasks.length}`;
	const row = worksheet.addRow([label]);
	row.height = 22;
	worksheet.mergeCells(row.number, 1, row.number, PLANNING_TASK_COLUMNS.length);
	const fill = excelColor(section.color, "FF334155");
	paintPlanningCell(row.getCell(1), fill, {
		bold: true,
		size: 12,
		color: { argb: PLANNING_FILL.whiteInk },
	});
	row.getCell(1).alignment = { vertical: "middle" };
}

function writePlanningSubtotal(
	worksheet: ExcelJS.Worksheet,
	label: string,
	tasks: ReadonlyArray<PlanningExportTask>,
): void {
	const sums = estimateSums(tasks);
	const row = worksheet.addRow({ title: label, ...sums });
	row.font = { bold: true };
	PLANNING_TASK_COLUMNS.forEach((column, index) => {
		const cell = row.getCell(index + 1);
		const estimate = PLANNING_ESTIMATE_KEYS.has(column.key);
		paintPlanningCell(
			cell,
			estimate ? PLANNING_FILL.estimateTotal : PLANNING_FILL.subtotal,
			{ bold: true, color: { argb: PLANNING_FILL.ink } },
		);
		if (estimate) {
			cell.alignment = { horizontal: "center", vertical: "middle" };
			if (typeof cell.value === "number") cell.numFmt = "0.##";
		}
	});
}

function stylePlanningDataRow(row: ExcelJS.Row, zebra: boolean): void {
	PLANNING_TASK_COLUMNS.forEach((column, index) => {
		const cell = row.getCell(index + 1);
		const estimate = PLANNING_ESTIMATE_KEYS.has(column.key);
		paintPlanningCell(
			cell,
			estimate
				? PLANNING_FILL.estimate
				: zebra
					? PLANNING_FILL.zebra
					: PLANNING_FILL.white,
			{ color: { argb: PLANNING_FILL.ink } },
		);
		if (estimate) {
			cell.alignment = { horizontal: "center", vertical: "middle" };
			if (typeof cell.value === "number") cell.numFmt = "0.##";
		}
	});
}

function writePlanningAssigneeTable(
	worksheet: ExcelJS.Worksheet,
	tasks: ReadonlyArray<PlanningExportTask>,
	assignees: ReadonlyArray<PlanningExportAssignee>,
): void {
	worksheet.addRow([]);
	const title = worksheet.addRow(["Исполнители"]);
	title.height = 22;
	worksheet.mergeCells(title.number, 1, title.number, 4);
	paintPlanningCell(title.getCell(1), PLANNING_FILL.assigneeTitle, {
		bold: true,
		size: 12,
		color: { argb: PLANNING_FILL.whiteInk },
	});

	const header = worksheet.addRow(["Исполнитель", "Роль", "Задач", "ч/д"]);
	header.height = 20;
	for (let column = 1; column <= 4; column += 1) {
		paintPlanningCell(header.getCell(column), PLANNING_FILL.assigneeHeader, {
			bold: true,
			color: { argb: PLANNING_FILL.whiteInk },
		});
	}

	const people = planningAssigneeLoads(tasks, assignees);
	people.forEach((person, index) => {
		const row = worksheet.addRow([
			person.name,
			person.roleTitle,
			person.taskCount,
			person.pd,
		]);
		for (let column = 1; column <= 4; column += 1) {
			paintPlanningCell(
				row.getCell(column),
				index % 2 === 1 ? PLANNING_FILL.assigneeZebra : PLANNING_FILL.white,
				{ color: { argb: PLANNING_FILL.ink } },
			);
		}
		row.getCell(4).numFmt = "0.##";
		row.getCell(4).alignment = { horizontal: "right" };
	});

	const totalPd = people.reduce((sum, person) => sum + person.pd, 0);
	const total = worksheet.addRow([
		"Итого",
		"",
		tasks.length,
		Math.round(totalPd * 100) / 100,
	]);
	for (let column = 1; column <= 4; column += 1) {
		paintPlanningCell(total.getCell(column), PLANNING_FILL.assigneeTotal, {
			bold: true,
			color: { argb: PLANNING_FILL.ink },
		});
	}
	total.getCell(4).numFmt = "0.##";
}

function planningAssigneeLoads(
	tasks: ReadonlyArray<PlanningExportTask>,
	assignees: ReadonlyArray<PlanningExportAssignee>,
): Array<{ name: string; roleTitle: string; taskCount: number; pd: number }> {
	const roleByName = new Map(assignees.map((person) => [person.name, person.role]));
	const roleTitleByName = new Map(
		assignees.map((person) => [
			person.name,
			person.roleTitle ||
				kanbanBoardAssigneeRoleTitle(person.role ?? undefined),
		]),
	);
	const rows = new Map<
		string,
		{ name: string; roleTitle: string; taskCount: number; pd: number }
	>();
	const ensure = (name: string) => {
		const existing = rows.get(name);
		if (existing) return existing;
		const created = {
			name,
			roleTitle:
				name === UNASSIGNED_ASSIGNEE ? "" : (roleTitleByName.get(name) ?? ""),
			taskCount: 0,
			pd: 0,
		};
		rows.set(name, created);
		return created;
	};

	for (const item of tasks) {
		const names = planningTaskAssigneeNames(item.task);
		const shares = allocatePlanningEstimate(item.task, roleByName);
		const counted = names.length ? names : [UNASSIGNED_ASSIGNEE];
		for (const name of counted) {
			const row = ensure(name);
			row.taskCount += 1;
			row.pd += shares.get(name) ?? 0;
		}
	}

	return [...rows.values()]
		.map((row) => ({ ...row, pd: Math.round(row.pd * 100) / 100 }))
		.sort((left, right) => {
			if (left.name === UNASSIGNED_ASSIGNEE) return 1;
			if (right.name === UNASSIGNED_ASSIGNEE) return -1;
			return left.name.localeCompare(right.name, "ru");
		});
}

function planningTaskAssigneeNames(task: KanbanBoardTaskRegistryDto): string[] {
	const names = new Set(kanbanBoardTaskAssignees(task.content));
	const current = task.content.currentAssignee?.trim();
	if (current) names.add(current);
	for (const name of task.assignees ?? []) {
		const trimmed = name.trim();
		if (trimmed) names.add(trimmed);
	}
	return [...names];
}

/** Как на панели исполнителей: по ролям, иначе оценка делится поровну. */
function allocatePlanningEstimate(
	task: KanbanBoardTaskRegistryDto,
	roleByName: ReadonlyMap<string, KanbanBoardAssigneeRoleId | null | undefined>,
): Map<string, number> {
	const shares = new Map<string, number>();
	const names = planningTaskAssigneeNames(task);
	const total = kanbanBoardEffectiveEstimatePd(task.content) ?? 0;
	if (!names.length || !total) return shares;
	const roleEstimates = task.content.roleEstimates;
	if (kanbanBoardRoleEstimatesTotal(roleEstimates) === undefined) {
		const each = total / names.length;
		for (const name of names) shares.set(name, each);
		return shares;
	}

	let leftover = 0;
	for (const field of KANBAN_BOARD_ROLE_ESTIMATE_FIELDS) {
		const amount = roleEstimates?.[field.key as keyof KanbanBoardRoleEstimates];
		if (typeof amount !== "number" || !amount) continue;
		const matching = names.filter((name) => roleByName.get(name) === field.key);
		if (!matching.length) {
			leftover += amount;
			continue;
		}
		const each = amount / matching.length;
		for (const name of matching) {
			shares.set(name, (shares.get(name) ?? 0) + each);
		}
	}
	if (leftover) {
		const current = task.content.currentAssignee?.trim();
		const fallback =
			current && names.includes(current) ? [current] : names;
		const each = leftover / fallback.length;
		for (const name of fallback) {
			shares.set(name, (shares.get(name) ?? 0) + each);
		}
	}
	return shares;
}

function estimateSums(
	tasks: ReadonlyArray<PlanningExportTask>,
): Record<string, number> {
	const sums: Record<string, number> = {};
	for (const field of KANBAN_BOARD_ROLE_ESTIMATE_FIELDS) {
		let sum = 0;
		let hasValue = false;
		for (const item of tasks) {
			const value = item.task.content.roleEstimates?.[field.key];
			if (typeof value !== "number") continue;
			sum += value;
			hasValue = true;
		}
		if (hasValue) sums[field.key] = sum;
	}
	const total = sectionEstimateTotal(tasks);
	if (total) sums.estimatePd = total;
	return sums;
}

function sectionEstimateTotal(tasks: ReadonlyArray<PlanningExportTask>): number {
	return tasks.reduce((sum, item) => {
		return sum + (kanbanBoardEffectiveEstimatePd(item.task.content) ?? 0);
	}, 0);
}

function formatPlanningPd(value: number): string {
	const rounded = Math.round(value * 100) / 100;
	return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
}

function excelColor(color: string | undefined, fallback: string): string {
	const raw = color?.trim().replace("#", "") ?? "";
	if (/^[0-9a-fA-F]{6}$/.test(raw)) return `FF${raw.toUpperCase()}`;
	return fallback;
}

function paintPlanningCell(
	cell: ExcelJS.Cell,
	fill: string,
	font: Partial<ExcelJS.Font>,
): void {
	cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fill } };
	cell.font = font;
	cell.border = {
		top: { style: "thin", color: { argb: PLANNING_FILL.border } },
		left: { style: "thin", color: { argb: PLANNING_FILL.border } },
		bottom: { style: "thin", color: { argb: PLANNING_FILL.border } },
		right: { style: "thin", color: { argb: PLANNING_FILL.border } },
	};
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
