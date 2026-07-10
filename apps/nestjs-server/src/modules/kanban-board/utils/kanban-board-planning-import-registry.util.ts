import {
	KANBAN_BOARD_PRIORITIES,
	KANBAN_BOARD_INPUT_BUFFER_COLUMN_ID,
	KANBAN_BOARD_STATUSES,
	KANBAN_BOARD_TASK_TYPES,
	KANBAN_BOARD_WORK_TYPES,
	type KanbanBoardPriorityId,
	type KanbanBoardTaskTypeId,
	type KanbanBoardWorkTypeId,
} from "@smart-anketa/api-contract";

export type PlanningImportColumnRef = { id: string; title: string };

export function normalizePlanningToken(text: string): string {
	return text
		.toLowerCase()
		.replace(/ё/g, "е")
		.replace(/[^\p{L}\p{N}]+/gu, " ")
		.trim()
		.replace(/\s+/g, " ");
}

export type PlanningAssigneeRef = Pick<
	import("@smart-anketa/api-contract").KanbanBoardAssigneeDto,
	"id" | "name" | "code"
>;

export type PlanningSprintRef = {
	id: string;
	code: string;
	name: string;
};

export type PlanningStreamRef = {
	id: string;
	code: string;
	name: string;
};

const STATUS_ALIASES: Record<string, string> = {
	готово: "done",
	done: "done",
	завершено: "done",
	выполнено: "done",
	закрыто: "done",
	"в работе": "dev_wip",
	"in progress": "dev_wip",
	in_progress: "dev_wip",
	работа: "dev_wip",
	разработка: "dev_wip",
	сделать: "todo",
	"в очереди": "todo",
	очередь: "todo",
	"к выполнению": "todo",
	todo: "todo",
	запланировано: "todo",
	бэклог: "input_buffer",
	backlog: "input_buffer",
	"входной буфер": "input_buffer",
	буфер: "input_buffer",
	новая: "input_buffer",
	анализ: "analysis_wip",
	ревью: "review_wip",
	review: "review_wip",
	"на проверке": "review_wip",
	"code review": "review_wip",
	проверка: "review_wip",
	qa: "review_wip",
	"qa testing": "review_wip",
	тестирование: "review_wip",
	uat: "review_wip",
	"на тестировании": "review_wip",
	демонстрация: "demo",
	demo: "demo",
};

export function scoreStatusColumnMatch(
	statusText: string,
	column: PlanningImportColumnRef,
): number {
	const normalized = normalizePlanningToken(statusText);
	if (!normalized) return -1;

	const columnTitle = normalizePlanningToken(column.title);
	if (columnTitle === normalized) return 100;

	const aliasId = STATUS_ALIASES[normalized];
	if (aliasId && column.id === aliasId) return 95;

	const statusDef = KANBAN_BOARD_STATUSES.find((item) => item.id === column.id);
	if (statusDef && normalizePlanningToken(statusDef.title) === normalized) {
		return 90;
	}

	if (aliasId && statusDef?.id === aliasId) return 88;

	if (columnTitle.includes(normalized) || normalized.includes(columnTitle)) {
		return 70;
	}

	if (statusDef) {
		const defTitle = normalizePlanningToken(statusDef.title);
		if (defTitle.includes(normalized) || normalized.includes(defTitle)) {
			return 65;
		}
	}

	const statusWords = normalized.split(" ").filter(Boolean);
	const columnWords = columnTitle.split(" ").filter(Boolean);
	const overlap = statusWords.filter((word) => columnWords.includes(word)).length;
	if (overlap > 0) return 40 + overlap * 8;

	for (const [alias, statusId] of Object.entries(STATUS_ALIASES)) {
		if (!normalized.includes(alias) && !alias.includes(normalized)) continue;
		if (column.id === statusId) return 55;
		if (statusDef?.id === statusId) return 50;
	}

	return 0;
}

export function resolveBestStatusColumnId(
	statusText: string,
	columns: PlanningImportColumnRef[],
): { columnId: string; columnTitle: string; score: number } {
	const fallback = columns[0] ?? {
		id: KANBAN_BOARD_STATUSES[0].id,
		title: KANBAN_BOARD_STATUSES[0].title,
	};

	if (!columns.length) {
		return {
			columnId: fallback.id,
			columnTitle: fallback.title,
			score: 0,
		};
	}

	let best = {
		column: columns[0],
		score: scoreStatusColumnMatch(statusText, columns[0]),
	};

	for (const column of columns.slice(1)) {
		const score = scoreStatusColumnMatch(statusText, column);
		if (score > best.score) {
			best = { column, score };
		}
	}

	if (!normalizePlanningToken(statusText)) {
		const buffer =
			columns.find((column) => column.id === KANBAN_BOARD_INPUT_BUFFER_COLUMN_ID) ??
			columns.find((column) => column.id === "backlog") ??
			columns.find(
				(column) =>
					normalizePlanningToken(column.title) ===
					normalizePlanningToken(KANBAN_BOARD_STATUSES[1]?.title ?? ""),
			) ??
			columns[0];
		return {
			columnId: buffer.id,
			columnTitle: buffer.title,
			score: 100,
		};
	}

	return {
		columnId: best.column.id,
		columnTitle: best.column.title,
		score: best.score,
	};
}

export function matchAssigneeByName(
	rawName: string,
	assignees: PlanningAssigneeRef[],
): PlanningAssigneeRef | null {
	const normalized = normalizePlanningToken(rawName);
	if (!normalized) return null;

	const exact = assignees.find(
		(item) => normalizePlanningToken(item.name) === normalized,
	);
	if (exact) return exact;

	const byContains = assignees.filter((item) => {
		const name = normalizePlanningToken(item.name);
		return (
			name.includes(normalized) ||
			normalized.includes(name) ||
			name.startsWith(`${normalized} `) ||
			name.endsWith(` ${normalized}`) ||
			name.split(" ").includes(normalized)
		);
	});
	if (byContains.length === 1) return byContains[0];

	const byWord = assignees.filter((item) => {
		const words = normalizePlanningToken(item.name).split(" ").filter(Boolean);
		return words.some(
			(word) =>
				word === normalized ||
				word.startsWith(normalized) ||
				normalized.startsWith(word),
		);
	});
	if (byWord.length === 1) return byWord[0];

	if (byContains.length > 1) {
		const startsWith = byContains.filter((item) =>
			normalizePlanningToken(item.name).startsWith(normalized),
		);
		if (startsWith.length === 1) return startsWith[0];
	}

	return null;
}

export function resolvePriorityIdFromText(
	text: string,
): KanbanBoardPriorityId | undefined {
	const normalized = normalizePlanningToken(text);
	if (!normalized) return undefined;

	for (const priority of KANBAN_BOARD_PRIORITIES) {
		if (normalizePlanningToken(priority.title) === normalized) return priority.id;
	}
	if (normalized.includes("высок") || normalized === "high") return "high";
	if (normalized.includes("средн") || normalized === "medium") return "medium";
	if (normalized.includes("низк") || normalized === "low") return "low";
	if (normalized.includes("холд") || normalized.includes("hold")) return "hold";
	return undefined;
}

export function resolveTaskTypeIdFromText(
	text: string,
): KanbanBoardTaskTypeId | undefined {
	const normalized = normalizePlanningToken(text);
	if (!normalized) return undefined;

	for (const item of KANBAN_BOARD_TASK_TYPES) {
		const title = normalizePlanningToken(item.title);
		if (title === normalized || normalized.includes(title) || title.includes(normalized)) {
			return item.id;
		}
	}
	if (normalized.includes("баг") || normalized.includes("bug")) return "bug";
	if (normalized.includes("эпик") || normalized.includes("epic")) return "epic";
	if (normalized.includes("истор")) return "story";
	if (normalized.includes("подзадач")) return "subtask";
	return undefined;
}

export function resolveWorkTypeIdFromText(
	text: string,
): KanbanBoardWorkTypeId | undefined {
	const normalized = normalizePlanningToken(text);
	if (!normalized) return undefined;

	for (const item of KANBAN_BOARD_WORK_TYPES) {
		const title = normalizePlanningToken(item.title);
		if (title === normalized || normalized.includes(title) || title.includes(normalized)) {
			return item.id;
		}
	}
	return undefined;
}

export function matchSprintByText(
	text: string,
	sprints: PlanningSprintRef[],
): PlanningSprintRef | null {
	const normalized = normalizePlanningToken(text);
	if (!normalized) return null;

	const exact = sprints.find((item) => {
		const code = normalizePlanningToken(item.code);
		const name = normalizePlanningToken(item.name);
		const combined = normalizePlanningToken(`${item.code} ${item.name}`);
		return (
			code === normalized ||
			name === normalized ||
			combined === normalized ||
			combined.includes(normalized) ||
			normalized.includes(name)
		);
	});
	if (exact) return exact;

	const partial = sprints.filter((item) => {
		const code = normalizePlanningToken(item.code);
		const name = normalizePlanningToken(item.name);
		return (
			code.includes(normalized) ||
			normalized.includes(code) ||
			name.includes(normalized) ||
			normalized.includes(name)
		);
	});
	return partial.length === 1 ? partial[0] : null;
}

export type PlanningCustomerRef = {
	id: string;
	code: string;
	name: string;
};

export function matchCustomerByText(
	text: string,
	customers: PlanningCustomerRef[],
): PlanningCustomerRef | null {
	const normalized = normalizePlanningToken(text);
	if (!normalized) return null;

	const exactName = customers.find(
		(item) => normalizePlanningToken(item.name) === normalized,
	);
	if (exactName) return exactName;

	const exactCode = customers.find(
		(item) => normalizePlanningToken(item.code) === normalized,
	);
	if (exactCode) return exactCode;

	const partial = customers.filter((item) => {
		const name = normalizePlanningToken(item.name);
		const code = normalizePlanningToken(item.code);
		return (
			name.includes(normalized) ||
			normalized.includes(name) ||
			code.includes(normalized) ||
			normalized.includes(code)
		);
	});
	return partial.length === 1 ? partial[0] : null;
}

export function buildCustomerImportCode(name: string, takenCodes: Set<string>): string {
	return buildAssigneeImportCode(name, takenCodes);
}

export function matchStreamByText(
	text: string,
	streams: PlanningStreamRef[],
): PlanningStreamRef | null {
	const normalized = normalizePlanningToken(text);
	if (!normalized) return null;

	const exact = streams.find((item) => {
		const code = normalizePlanningToken(item.code);
		const name = normalizePlanningToken(item.name);
		return (
			code === normalized ||
			name === normalized ||
			normalizePlanningToken(`${item.code} ${item.name}`) === normalized
		);
	});
	if (exact) return exact;

	const partial = streams.filter((item) => {
		const code = normalizePlanningToken(item.code);
		const name = normalizePlanningToken(item.name);
		return (
			code.includes(normalized) ||
			normalized.includes(code) ||
			name.includes(normalized) ||
			normalized.includes(name)
		);
	});
	return partial.length === 1 ? partial[0] : null;
}

export function buildAssigneeImportCode(name: string, takenCodes: Set<string>): string {
	const token = normalizePlanningToken(name).replace(/\s+/g, "-");
	const ascii = token
		.replace(/[^a-z0-9-]/g, "")
		.replace(/-+/g, "-")
		.replace(/^-|-$/g, "");
	const base =
		ascii.length >= 2
			? ascii
			: `assignee-${Math.random().toString(36).slice(2, 10)}`;
	let candidate = base.slice(0, 48);
	let suffix = 2;
	let unique = candidate;
	while (takenCodes.has(unique.toLowerCase())) {
		const tail = `-${suffix++}`;
		unique = `${candidate.slice(0, Math.max(1, 48 - tail.length))}${tail}`;
	}
	takenCodes.add(unique.toLowerCase());
	return unique;
}
