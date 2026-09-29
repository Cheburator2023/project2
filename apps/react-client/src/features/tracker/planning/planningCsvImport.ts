import {
	KANBAN_BOARD_STATUSES,
	KANBAN_BOARD_SYSTEMS,
	kanbanBoardRoleEstimatesTotal,
	type KanbanBoardRoleEstimates,
	type KanbanBoardSystemId,
} from "@smart-anketa/api-contract";

export const PLANNING_CSV_MATCH_THRESHOLD = 86;

const ROLE_COLUMNS: { header: string; key: keyof KanbanBoardRoleEstimates }[] =
	[
		{ header: "Аналитик", key: "analyst" },
		{ header: "Разработчик", key: "developer" },
		{ header: "Тестировщик", key: "qa" },
		{ header: "Отладка", key: "debug" },
		{ header: "DevOps", key: "devops" },
		{ header: "Архитектор", key: "architect" },
	];

const LATIN_LOOKALIKES: Record<string, string> = {
	a: "а",
	c: "с",
	e: "е",
	o: "о",
	p: "р",
	x: "х",
	y: "у",
	k: "к",
	m: "м",
	h: "н",
	t: "т",
	b: "в",
};

export type PlanningCsvExistingTask = {
	id: string;
	boardId: string;
	taskKey: string;
	title: string;
	sprintId?: string;
	roleEstimates?: KanbanBoardRoleEstimates;
};

export type PlanningCsvColumn = { id: string; title: string };

export type PlanningCsvSprint = { id: string; code: string; name: string };

export type PlanningCsvRow = {
	line: number;
	statusRaw: string;
	title: string;
	description: string;
	assignees: string[];
	sprintCode: string;
	comment: string;
	estimates: KanbanBoardRoleEstimates;
};

export type PlanningCsvAction = "create" | "update" | "unchanged";

export type PlanningCsvMatch = {
	row: PlanningCsvRow;
	action: PlanningCsvAction;
	score: number;
	task: PlanningCsvExistingTask | null;
	statusId: string;
	statusTitle: string;
	sprintId: string | null;
	sprintMissing: boolean;
	systemId: KanbanBoardSystemId | null;
	nextEstimates?: KanbanBoardRoleEstimates;
};

export function normalizePlanningTaskTitle(value: string): string {
	const folded = value
		.toLowerCase()
		.replace(/ё/g, "е")
		.split("")
		.map((char) => LATIN_LOOKALIKES[char] ?? char)
		.join("");
	return folded
		.replace(/[^\p{L}\p{N}]+/gu, " ")
		.replace(/\s+/g, " ")
		.trim();
}

function bigramDice(left: string, right: string): number {
	if (left === right) return 1;
	if (left.length < 2 || right.length < 2) return 0;
	const counts = (value: string) => {
		const map = new Map<string, number>();
		for (let index = 0; index < value.length - 1; index += 1) {
			const gram = value.slice(index, index + 2);
			map.set(gram, (map.get(gram) ?? 0) + 1);
		}
		return map;
	};
	const leftCounts = counts(left);
	const rightCounts = counts(right);
	let overlap = 0;
	for (const [gram, count] of leftCounts) {
		overlap += Math.min(count, rightCounts.get(gram) ?? 0);
	}
	return (2 * overlap) / (left.length - 1 + right.length - 1);
}

/** 0–100. Одинаковый текст после нормализации пунктуации даёт 100. */
export function planningTaskTitleSimilarity(left: string, right: string): number {
	const a = normalizePlanningTaskTitle(left);
	const b = normalizePlanningTaskTitle(right);
	if (!a || !b) return 0;
	if (a === b) return 100;
	const dice = bigramDice(a, b);
	const [shorter, longer] = a.length <= b.length ? [a, b] : [b, a];
	if (longer.includes(shorter) && shorter.length / longer.length >= 0.72) {
		return Math.round(Math.max(dice, shorter.length / longer.length) * 100);
	}
	return Math.round(dice * 100);
}

export function inferPlanningSystemFromTitle(
	title: string,
): KanbanBoardSystemId | null {
	const text = normalizePlanningTaskTitle(title);
	if (!text) return null;
	const has = (pattern: RegExp) => pattern.test(text);
	const hits = new Set<KanbanBoardSystemId>();
	if (
		has(/смарт\s*анкет|смартанкет|smart\s*anketa|конфигуратор/) ||
		has(/(^| )са( |$)/) ||
		has(/(^| )sa( |$)/)
	) {
		hits.add("smart-anketa");
	}
	if (has(/data\s*lineage|дата\s*лине/) || has(/(^| )dl( |$)/)) {
		hits.add("data-lineage");
	}
	const sumRm = has(/сурм|su[mм]\s*r[mм]|сумрм|sumrm/);
	const sumNext = has(
		/su[mм]\s*n[eе][xх][tт]|сум\s*н[еe][кk][сc][тt]|sumnext|сумнекст/,
	);
	const sum =
		has(/(^| )сум( |$)/) ||
		has(/sumd/) ||
		(has(/(^| )su[mм]( |$)/) && !sumRm && !sumNext);
	if ((sum && sumRm) || (sum && sumNext) || (sumRm && sumNext)) {
		// В названии несколько SUM-систем — не угадываем.
	} else if (sumNext) hits.add("sum-next");
	else if (sumRm) hits.add("sum-rm");
	else if (sum) hits.add("sum");
	if (has(/camunda|камунд/)) hits.add("camunda");
	if (has(/keycloak|кейклок/)) hits.add("keycloak");
	if (hits.size !== 1) return null;
	return [...hits][0] ?? null;
}

export function planningSystemTitle(id: KanbanBoardSystemId | null): string {
	if (!id) return "";
	return KANBAN_BOARD_SYSTEMS.find((item) => item.id === id)?.title ?? id;
}

function parseCsv(text: string): string[][] {
	const source = text.replace(/^\uFEFF/, "");
	const rows: string[][] = [];
	let row: string[] = [];
	let cell = "";
	let quoted = false;
	for (let index = 0; index < source.length; index += 1) {
		const char = source[index];
		if (quoted) {
			if (char === '"') {
				if (source[index + 1] === '"') {
					cell += '"';
					index += 1;
				} else quoted = false;
			} else cell += char;
		} else if (char === '"') quoted = true;
		else if (char === ";") {
			row.push(cell);
			cell = "";
		} else if (char === "\n") {
			row.push(cell);
			rows.push(row);
			row = [];
			cell = "";
		} else if (char !== "\r") cell += char;
	}
	if (cell.length || row.length) {
		row.push(cell);
		rows.push(row);
	}
	return rows;
}

function parseEstimate(value: string | undefined): number | undefined {
	const raw = value?.trim().replace(",", ".");
	if (!raw) return undefined;
	const parsed = Number(raw);
	if (!Number.isFinite(parsed) || parsed < 0) return undefined;
	return parsed;
}

export function parsePlanningCsv(text: string): PlanningCsvRow[] {
	const table = parseCsv(text).filter((row) => row.some((cell) => cell.trim()));
	if (!table.length) return [];
	const header = table[0]?.map((cell) => cell.trim()) ?? [];
	const indexOf = (name: string) => header.indexOf(name);
	const titleIndex = indexOf("Название задачи");
	if (titleIndex < 0) {
		throw new Error("В CSV нет колонки «Название задачи»");
	}
	const at = (row: string[], name: string) => {
		const index = indexOf(name);
		return index >= 0 ? (row[index] ?? "") : "";
	};
	const rows: PlanningCsvRow[] = [];
	for (let index = 1; index < table.length; index += 1) {
		const source = table[index] ?? [];
		const title = at(source, "Название задачи").trim();
		if (!title) continue;
		const estimates: KanbanBoardRoleEstimates = {};
		for (const column of ROLE_COLUMNS) {
			const value = parseEstimate(at(source, column.header));
			if (value !== undefined) estimates[column.key] = value;
		}
		const autotester = parseEstimate(at(source, "Автотетстер"));
		const commentParts = [at(source, "Комментарий").trim()];
		if (autotester !== undefined) {
			commentParts.push(`Автотестер, чд: ${autotester}`);
		}
		rows.push({
			line: index + 1,
			statusRaw: at(source, "Статус").trim(),
			title,
			description: at(source, "Описание").trim(),
			assignees: at(source, "Исполнитель")
				.split(",")
				.map((item) => item.trim())
				.filter(Boolean),
			sprintCode: at(source, "Спринт").trim(),
			comment: commentParts.filter(Boolean).join("\n"),
			estimates,
		});
	}
	return rows;
}

function resolveStatus(
	statusRaw: string,
	columns: PlanningCsvColumn[],
): { id: string; title: string } {
	const raw = statusRaw.trim();
	const byId = columns.find((column) => column.id === raw);
	if (byId) return byId;
	const known = KANBAN_BOARD_STATUSES.find((status) => status.id === raw);
	if (known) {
		const titled = columns.find((column) => column.title === known.title);
		if (titled) return titled;
	}
	const alias = raw.toLowerCase();
	const fallbackId = alias === "новая" || alias === "new" || !raw ? "todo" : "input_buffer";
	const fallbackKnown = KANBAN_BOARD_STATUSES.find((status) => status.id === fallbackId);
	const fallback =
		columns.find((column) => column.id === fallbackId) ??
		columns.find((column) => column.title === fallbackKnown?.title) ??
		columns[0];
	return fallback ?? { id: fallbackId, title: fallbackKnown?.title ?? fallbackId };
}

function estimatesEqual(
	left: KanbanBoardRoleEstimates | undefined,
	right: KanbanBoardRoleEstimates | undefined,
): boolean {
	const keys = new Set([
		...Object.keys(left ?? {}),
		...Object.keys(right ?? {}),
	]) as Set<keyof KanbanBoardRoleEstimates>;
	for (const key of keys) {
		if ((left?.[key] ?? undefined) !== (right?.[key] ?? undefined)) return false;
	}
	return true;
}

export function mergePlanningCsvEstimates(
	current: KanbanBoardRoleEstimates | undefined,
	incoming: KanbanBoardRoleEstimates,
): KanbanBoardRoleEstimates | undefined {
	if (!Object.keys(incoming).length) return current;
	const next: KanbanBoardRoleEstimates = { ...(current ?? {}) };
	for (const [key, value] of Object.entries(incoming) as [
		keyof KanbanBoardRoleEstimates,
		number,
	][]) {
		next[key] = value;
	}
	return next;
}

export function matchPlanningCsvRows(input: {
	rows: PlanningCsvRow[];
	tasks: PlanningCsvExistingTask[];
	columns: PlanningCsvColumn[];
	sprints: PlanningCsvSprint[];
	boardId?: string;
	threshold?: number;
}): PlanningCsvMatch[] {
	const threshold = input.threshold ?? PLANNING_CSV_MATCH_THRESHOLD;
	const tasks = input.boardId
		? input.tasks.filter((task) => task.boardId === input.boardId)
		: input.tasks;
	const usedTaskIds = new Set<string>();
	const ranked = input.rows.map((row) => {
		const candidates = tasks
			.map((task) => ({
				task,
				score: planningTaskTitleSimilarity(row.title, task.title),
			}))
			.filter((item) => item.score >= threshold)
			.sort((a, b) => b.score - a.score);
		return { row, candidates };
	});
	ranked.sort((a, b) => (b.candidates[0]?.score ?? 0) - (a.candidates[0]?.score ?? 0));

	const assigned = new Map<number, { task: PlanningCsvExistingTask; score: number }>();
	for (const item of ranked) {
		const candidate = item.candidates.find(
			(entry) => !usedTaskIds.has(entry.task.id),
		);
		if (!candidate) continue;
		usedTaskIds.add(candidate.task.id);
		assigned.set(item.row.line, candidate);
	}

	return input.rows.map((row) => {
		const status = resolveStatus(row.statusRaw, input.columns);
		const sprint = row.sprintCode
			? input.sprints.find(
					(item) =>
						item.code.localeCompare(row.sprintCode, undefined, {
							sensitivity: "accent",
						}) === 0,
				)
			: undefined;
		const match = assigned.get(row.line);
		const nextEstimates = mergePlanningCsvEstimates(
			match?.task.roleEstimates,
			row.estimates,
		);
		const estimatesChanged = !estimatesEqual(
			match?.task.roleEstimates,
			nextEstimates,
		);
		const sprintChanged = Boolean(sprint && sprint.id !== match?.task.sprintId);
		const hasComment = Boolean(row.comment.trim());
		let action: PlanningCsvAction = "create";
		if (match) {
			action =
				estimatesChanged || sprintChanged || hasComment ? "update" : "unchanged";
		}
		return {
			row,
			action,
			score: match?.score ?? 0,
			task: match?.task ?? null,
			statusId: status.id,
			statusTitle: status.title,
			sprintId: sprint?.id ?? null,
			sprintMissing: Boolean(row.sprintCode) && !sprint,
			systemId: inferPlanningSystemFromTitle(row.title),
			nextEstimates:
				kanbanBoardRoleEstimatesTotal(nextEstimates) !== undefined
					? nextEstimates
					: undefined,
		};
	});
}
