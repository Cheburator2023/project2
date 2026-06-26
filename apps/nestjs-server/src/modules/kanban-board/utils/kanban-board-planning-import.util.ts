import * as ExcelJS from "exceljs";
import { ulid } from "ulid";
import {
	KANBAN_BOARD_ROLE_ESTIMATE_FIELDS,
	KANBAN_BOARD_STATUSES,
	kanbanBoardRoleEstimatesTotal,
	normalizeKanbanBoardTaskContent,
	type KanbanBoardColumnDto,
	type KanbanBoardRoleEstimates,
	type KanbanBoardTaskRecord,
} from "@smart-anketa/api-contract";
import {
	resolveBestStatusColumnId,
	resolvePriorityIdFromText,
} from "./kanban-board-planning-import-registry.util";

export type PlanningImportColumnRef = Pick<KanbanBoardColumnDto, "id" | "title">;

export interface PlanningImportOptions {
	boardId: string;
	standId: string;
	columns: PlanningImportColumnRef[];
}

export interface PlanningImportTaskHints {
	statusText?: string;
	sprintText?: string;
	streamText?: string;
	taskTypeText?: string;
	workTypeText?: string;
}

export interface PlanningImportResult {
	payload: KanbanBoardTaskRecord[];
	warnings: string[];
	hintsByTaskId: Record<string, PlanningImportTaskHints>;
	sheetName?: string;
}

type BacklogFieldKey =
	| "backlogNumber"
	| "priority"
	| "status"
	| "title"
	| "customer"
	| "sprintOutcome"
	| "dueDate"
	| "parentTask"
	| "assignee"
	| "estimatePd"
	| "taskType"
	| "workType"
	| "sprint"
	| "stream"
	| keyof KanbanBoardRoleEstimates;

const BACKLOG_HEADER_ALIASES: Record<BacklogFieldKey, string[]> = {
	backlogNumber: ["№ п/п", "№ пп", "№", "п п", "номер", "no", "n", "backlognumber", "num"],
	priority: ["приоритет", "priority"],
	status: [
		"статус работ",
		"статус",
		"status",
		"колонка",
		"column",
		"стадия",
		"этап",
	],
	title: [
		"название задачи",
		"название",
		"задача",
		"title",
		"наименование",
		"name",
		"заголовок",
		"описание задачи",
	],
	customer: ["заказчик", "customer", "клиент", "stream customer"],
	sprintOutcome: [
		"ожидаемый результат спринта",
		"результат спринта",
		"sprint outcome",
		"итог спринта",
		"результат",
	],
	dueDate: [
		"плановая дата",
		"срок",
		"due date",
		"deadline",
		"дата",
		"плановый срок",
	],
	parentTask: ["родитель", "parent", "родительская задача", "parent task"],
	assignee: ["исполнитель", "assignee", "ответственный", "фио исполнителя"],
	estimatePd: [
		"итого чд",
		"итого",
		"трудоемкость",
		"трудоёмкость",
		"оценка",
		"estimate",
		"estimate pd",
		"чд",
	],
	taskType: ["тип", "task type", "тип задачи"],
	workType: ["тип работ", "work type", "вид работ"],
	sprint: ["спринт", "sprint"],
	stream: ["стрим", "stream"],
	analyst: ["аналитик", "analyst"],
	developer: ["разработчик", "developer", "dev"],
	qa: ["тестировщик", "qa", "тест", "tester"],
	debug: ["отладка", "debug"],
	devops: ["devops", "dev ops"],
	architect: ["архитектор", "architect"],
};

const WORKLOAD_HEADER_ALIASES = {
	assignee: ["фио", "исполнитель", "assignee", "сотрудник"],
	title: ["задача", "название", "title", "наименование"],
	effort: [
		"трудоемкость",
		"трудоёмкость",
		"effort",
		"оценка",
		"чд",
		"трудоемкость чд",
		"трудоёмкость чд",
	],
} as const;

const BACKLOG_SHEET_NAME_HINTS = ["бэклог", "backlog", "planning", "планирование"];
const WORKLOAD_SHEET_NAME_HINTS = [
	"задачи",
	"загрузка",
	"workload",
	"load",
	"исполнител",
];

function normalizeHeaderToken(text: string): string {
	return text
		.toLowerCase()
		.replace(/ё/g, "е")
		.replace(/[^\p{L}\p{N}]+/gu, " ")
		.trim()
		.replace(/\s+/g, " ");
}

export const normalizePlanningToken = normalizeHeaderToken;

function cellText(value: ExcelJS.CellValue): string {
	if (value == null) return "";
	if (typeof value === "object") {
		if ("richText" in value && Array.isArray(value.richText)) {
			return value.richText.map((part) => part.text).join("").trim();
		}
		if ("result" in value && value.result != null) {
			return cellText(value.result as ExcelJS.CellValue);
		}
		if (value instanceof Date) {
			return value.toISOString().slice(0, 10);
		}
	}
	return String(value).trim();
}

function parseNumber(value: ExcelJS.CellValue): number | undefined {
	const text = cellText(value).replace(",", ".");
	if (!text) return undefined;
	const parsed = Number.parseFloat(text);
	return Number.isFinite(parsed) ? parsed : undefined;
}

function parseBacklogNumber(value: ExcelJS.CellValue): number | undefined {
	const text = cellText(value);
	if (!text) return undefined;
	const parsed = Number.parseInt(text, 10);
	if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
	return parsed;
}

function parseDueDate(value: ExcelJS.CellValue): string | undefined {
	const text = cellText(value);
	if (!text || text === "?") return undefined;
	if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
	if (value instanceof Date) return value.toISOString().slice(0, 10);
	return text;
}

function mapHeaders<T extends string>(
	row: ExcelJS.Row,
	aliases: Record<T, readonly string[]>,
): Partial<Record<T, number>> {
	const normalizedAliases = Object.fromEntries(
		Object.entries(aliases).map(([key, values]) => [
			key,
			(values as readonly string[]).map((item) => normalizeHeaderToken(item)),
		]),
	) as Record<T, string[]>;

	const mapping: Partial<Record<T, number>> = {};
	row.eachCell({ includeEmpty: false }, (cell, col) => {
		const token = normalizeHeaderToken(cellText(cell.value));
		if (!token) return;
		for (const [field, fieldAliases] of Object.entries(normalizedAliases) as [
			T,
			string[],
		][]) {
			if (mapping[field]) continue;
			if (fieldAliases.some((alias) => token === alias || token.includes(alias))) {
				mapping[field] = col;
			}
		}
	});
	return mapping;
}

function hasBacklogShape(headers: Partial<Record<BacklogFieldKey, number>>): boolean {
	return Boolean(headers.title && (headers.status || headers.priority || headers.backlogNumber));
}

function hasWorkloadShape(
	headers: Partial<Record<keyof typeof WORKLOAD_HEADER_ALIASES, number>>,
): boolean {
	return Boolean(headers.assignee && headers.title);
}

function sheetNameScore(name: string, hints: string[]): number {
	const normalized = normalizeHeaderToken(name);
	return hints.reduce(
		(score, hint) => (normalized.includes(normalizeHeaderToken(hint)) ? score + 1 : score),
		0,
	);
}

function findBacklogWorksheet(
	workbook: ExcelJS.Workbook,
): { worksheet: ExcelJS.Worksheet; headers: Partial<Record<BacklogFieldKey, number>> } | null {
	let best: {
		worksheet: ExcelJS.Worksheet;
		headers: Partial<Record<BacklogFieldKey, number>>;
		score: number;
	} | null = null;

	for (const worksheet of workbook.worksheets) {
		const headers = mapHeaders(worksheet.getRow(1), BACKLOG_HEADER_ALIASES);
		if (!hasBacklogShape(headers)) continue;
		const score =
			sheetNameScore(worksheet.name, BACKLOG_SHEET_NAME_HINTS) +
			Object.keys(headers).length;
		if (!best || score > best.score) {
			best = { worksheet, headers, score };
		}
	}
	return best ? { worksheet: best.worksheet, headers: best.headers } : null;
}

function findWorkloadWorksheet(
	workbook: ExcelJS.Workbook,
): { worksheet: ExcelJS.Worksheet; headers: Partial<Record<keyof typeof WORKLOAD_HEADER_ALIASES, number>> } | null {
	let best: {
		worksheet: ExcelJS.Worksheet;
		headers: Partial<Record<keyof typeof WORKLOAD_HEADER_ALIASES, number>>;
		score: number;
	} | null = null;

	for (const worksheet of workbook.worksheets) {
		const headers = mapHeaders(worksheet.getRow(1), WORKLOAD_HEADER_ALIASES);
		if (!hasWorkloadShape(headers)) continue;
		const score =
			sheetNameScore(worksheet.name, WORKLOAD_SHEET_NAME_HINTS) +
			Object.keys(headers).length;
		if (!best || score > best.score) {
			best = { worksheet, headers, score };
		}
	}
	return best ? { worksheet: best.worksheet, headers: best.headers } : null;
}

function resolveStatusColumnId(
	statusText: string,
	columns: PlanningImportColumnRef[],
	warnings: string[],
): string {
	const resolved = resolveBestStatusColumnId(statusText, columns);
	if (normalizeHeaderToken(statusText) && resolved.score < 45) {
		warnings.push(
			`Статус «${statusText.trim()}» сопоставлен с колонкой «${resolved.columnTitle}»`,
		);
	}
	return resolved.columnId;
}

function normalizeTitleKey(title: string): string {
	return normalizeHeaderToken(title);
}

function isGroupHeaderRow(
	row: ExcelJS.Row,
	titleCol: number | undefined,
): boolean {
	const firstCell = cellText(row.getCell(1).value);
	if (/^исполнитель\s*:/i.test(firstCell)) return true;
	if (!titleCol) return false;
	const title = cellText(row.getCell(titleCol).value);
	return /^исполнитель\s*:/i.test(title);
}

function readMappedCell(row: ExcelJS.Row, col?: number): ExcelJS.CellValue {
	if (!col) return null;
	return row.getCell(col).value;
}

function parseBacklogRows(
	worksheet: ExcelJS.Worksheet,
	headers: Partial<Record<BacklogFieldKey, number>>,
	options: PlanningImportOptions,
): {
	tasks: KanbanBoardTaskRecord[];
	warnings: string[];
	hintsByTaskId: Record<string, PlanningImportTaskHints>;
} {
	const warnings: string[] = [];
	const hintsByTaskId: Record<string, PlanningImportTaskHints> = {};
	const titleCol = headers.title;
	if (!titleCol) {
		throw new Error("Не удалось определить колонку с названием задачи");
	}

	const now = new Date().toISOString();
	const positionByColumn = new Map<string, number>();
	let currentParentTitle: string | undefined;
	const tasks: KanbanBoardTaskRecord[] = [];

	worksheet.eachRow((row, rowIndex) => {
		if (rowIndex === 1) return;
		if (isGroupHeaderRow(row, titleCol)) return;

		const title = cellText(readMappedCell(row, titleCol));
		if (!title || /^итого$/i.test(title)) return;

		const backlogNumber = parseBacklogNumber(readMappedCell(row, headers.backlogNumber));
		if (backlogNumber) {
			currentParentTitle = title;
		}

		const roleEstimates: KanbanBoardRoleEstimates = {};
		for (const field of KANBAN_BOARD_ROLE_ESTIMATE_FIELDS) {
			const value = parseNumber(readMappedCell(row, headers[field.key]));
			if (value != null) roleEstimates[field.key] = value;
		}

		const estimateFromRoles = kanbanBoardRoleEstimatesTotal(roleEstimates);
		const estimatePd =
			parseNumber(readMappedCell(row, headers.estimatePd)) ?? estimateFromRoles;

		const assignee = cellText(readMappedCell(row, headers.assignee));
		const parentFromColumn = cellText(readMappedCell(row, headers.parentTask));
		const parentTask =
			parentFromColumn ||
			(!backlogNumber && currentParentTitle && currentParentTitle !== title
				? currentParentTitle
				: undefined);

		const statusText = cellText(readMappedCell(row, headers.status));
		const parentId = resolveStatusColumnId(statusText, options.columns, warnings);
		const position = positionByColumn.get(parentId) ?? 0;
		positionByColumn.set(parentId, position + 1);

		const priorityText = cellText(readMappedCell(row, headers.priority));
		const resolvedPriority = resolvePriorityIdFromText(priorityText);
		if (priorityText && !resolvedPriority) {
			warnings.push(
				`Приоритет «${priorityText}» не найден в справочнике — поле пропущено`,
			);
		}
		const sprintText = cellText(readMappedCell(row, headers.sprint));
		const streamText = cellText(readMappedCell(row, headers.stream));
		const taskTypeText = cellText(readMappedCell(row, headers.taskType));
		const workTypeText = cellText(readMappedCell(row, headers.workType));

		const content = normalizeKanbanBoardTaskContent({
			title,
			priority: resolvedPriority,
			backlogNumber,
			customer: cellText(readMappedCell(row, headers.customer)) || undefined,
			sprintOutcome:
				cellText(readMappedCell(row, headers.sprintOutcome)) || undefined,
			dueDate: parseDueDate(readMappedCell(row, headers.dueDate)),
			parentTask: parentTask || undefined,
			assignees: assignee ? [assignee] : undefined,
			currentAssignee: assignee || undefined,
			estimatePd,
			roleEstimates: Object.keys(roleEstimates).length ? roleEstimates : undefined,
		});

		const taskId = ulid();
		hintsByTaskId[taskId] = {
			statusText: statusText || undefined,
			sprintText: sprintText || undefined,
			streamText: streamText || undefined,
			taskTypeText: taskTypeText || undefined,
			workTypeText: workTypeText || undefined,
		};

		tasks.push({
			id: taskId,
			boardId: options.boardId,
			parentId,
			position,
			content,
			origin: options.standId,
			updatedAt: now,
		});
	});

	return { tasks, warnings, hintsByTaskId };
}

function applyWorkloadSheet(
	workbook: ExcelJS.Workbook,
	tasks: KanbanBoardTaskRecord[],
	options: PlanningImportOptions,
	warnings: string[],
	hintsByTaskId: Record<string, PlanningImportTaskHints>,
): void {
	const match = findWorkloadWorksheet(workbook);
	if (!match) return;

	const { worksheet, headers } = match;
	const titleCol = headers.title;
	const assigneeCol = headers.assignee;
	if (!titleCol || !assigneeCol) return;

	const byTitle = new Map<string, KanbanBoardTaskRecord[]>();
	for (const task of tasks) {
		const key = normalizeTitleKey(task.content.title);
		const bucket = byTitle.get(key) ?? [];
		bucket.push(task);
		byTitle.set(key, bucket);
	}

	const defaultColumnId =
		options.columns[0]?.id ?? KANBAN_BOARD_STATUSES[0].id;
	const positionByColumn = new Map<string, number>();
	for (const task of tasks) {
		positionByColumn.set(
			task.parentId,
			Math.max(positionByColumn.get(task.parentId) ?? 0, task.position + 1),
		);
	}
	const now = new Date().toISOString();

	worksheet.eachRow((row, rowIndex) => {
		if (rowIndex === 1) return;
		const title = cellText(readMappedCell(row, titleCol));
		if (!title || /^итого$/i.test(title)) return;

		const assignee = cellText(readMappedCell(row, assigneeCol));
		if (!assignee) return;

		const effort = parseNumber(readMappedCell(row, headers.effort));
		const matches = byTitle.get(normalizeTitleKey(title));
		if (!matches?.length) {
			const position = positionByColumn.get(defaultColumnId) ?? 0;
			positionByColumn.set(defaultColumnId, position + 1);
			const taskId = ulid();
			const task: KanbanBoardTaskRecord = {
				id: taskId,
				boardId: options.boardId,
				parentId: defaultColumnId,
				position,
				content: normalizeKanbanBoardTaskContent({
					title,
					assignees: [assignee],
					currentAssignee: assignee,
					estimatePd: effort,
				}),
				origin: options.standId,
				updatedAt: now,
			};
			tasks.push(task);
			hintsByTaskId[taskId] = {};
			byTitle.set(normalizeTitleKey(title), [task]);
			warnings.push(
				`Задача «${title}» добавлена только из листа загрузки (не было в бэклоге)`,
			);
			return;
		}
		if (matches.length > 1) {
			warnings.push(
				`Несколько задач с названием «${title}» — исполнитель назначен первой`,
			);
		}

		const task = matches[0];
		const assignees = new Set(task.content.assignees ?? []);
		assignees.add(assignee);
		task.content.assignees = [...assignees];
		task.content.currentAssignee = assignee;
		if (effort != null && task.content.estimatePd == null) {
			task.content.estimatePd = effort;
		}
		task.content = normalizeKanbanBoardTaskContent(task.content);
	});
}

export function parsePlanningWorkbook(
	workbook: ExcelJS.Workbook,
	options: PlanningImportOptions,
): PlanningImportResult {
	const backlog = findBacklogWorksheet(workbook);
	if (!backlog) {
		throw new Error(
			"Не найден лист бэклога: ожидаются колонки вроде «Название задачи», «Статус», «Приоритет»",
		);
	}

	const { tasks, warnings, hintsByTaskId } = parseBacklogRows(
		backlog.worksheet,
		backlog.headers,
		options,
	);
	if (!tasks.length) {
		throw new Error("На листе бэклога не найдено задач с названием");
	}

	applyWorkloadSheet(workbook, tasks, options, warnings, hintsByTaskId);

	return {
		payload: tasks,
		warnings,
		hintsByTaskId,
		sheetName: backlog.worksheet.name,
	};
}

export async function importPlanningXlsx(
	buf: Buffer,
	options: PlanningImportOptions,
): Promise<PlanningImportResult> {
	const workbook = new ExcelJS.Workbook();
	await workbook.xlsx.load(buf);
	return parsePlanningWorkbook(workbook, options);
}

export function isSnapshotWorkbook(workbook: ExcelJS.Workbook): boolean {
	if (workbook.getWorksheet("_meta")) return true;
	for (const name of ["kanban_board_tasks", "tasks"] as const) {
		const worksheet = workbook.getWorksheet(name);
		if (!worksheet) continue;
		let hasJsonCol = false;
		worksheet.getRow(1).eachCell((cell) => {
			if (cell.value === "__json") hasJsonCol = true;
		});
		if (hasJsonCol) return true;
	}
	return false;
}
