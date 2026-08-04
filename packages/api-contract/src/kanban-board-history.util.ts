import type {
	KanbanBoardRoleEstimates,
	KanbanBoardSubtaskItem,
	KanbanBoardTaskChangeItem,
	KanbanBoardTaskContent,
	KanbanBoardTaskHistorySnapshot,
} from "./kanban-board.types";
import {
	kanbanBoardPriorityTitle,
	kanbanBoardSubtaskIsDone,
	kanbanBoardSubtaskStatusTitle,
	kanbanBoardTaskTypeTitle,
	kanbanBoardWorkTypeTitle,
} from "./kanban-board.types";

export const KANBAN_BOARD_TASK_HISTORY_MAX_PER_TASK = 6;

/** Сколько последних изменений показывать на общей странице истории по доске. */
export const KANBAN_BOARD_HISTORY_OVERVIEW_PREVIEW_LIMIT = 4;

const ROLE_ESTIMATE_KEYS = new Set([
	"analyst",
	"developer",
	"qa",
	"debug",
	"devops",
	"architect",
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const isSubtaskItem = (value: unknown): value is KanbanBoardSubtaskItem =>
	isRecord(value) && typeof value.text === "string";

const formatSubtasks = (value: unknown): string | null => {
	if (!Array.isArray(value) || !value.length) return null;
	return value
		.map((item, index) => {
			if (!isSubtaskItem(item)) {
				return formatKanbanBoardHistoryValue(item);
			}
			const status = item.status
				? kanbanBoardSubtaskStatusTitle(item.status)
				: kanbanBoardSubtaskIsDone(item)
					? "Готово"
					: "В работе";
			const text = item.text.trim() || `Подзадача ${index + 1}`;
			return `${text} (${status})`;
		})
		.filter(Boolean)
		.join("; ");
};

const formatRoleEstimates = (value: unknown): string | null => {
	if (!isRecord(value)) return null;
	const entries = Object.entries(value as KanbanBoardRoleEstimates).filter(
		([, amount]) => amount != null && amount !== 0,
	);
	if (!entries.length) return null;
	return entries.map(([role, amount]) => `${role}: ${amount}`).join(", ");
};

const formatPlainObject = (value: Record<string, unknown>): string | null => {
	const entries = Object.entries(value).filter(
		([, item]) => item !== undefined && item !== null && item !== "",
	);
	if (!entries.length) return null;
	return entries
		.map(([key, item]) => `${key}: ${formatKanbanBoardHistoryValue(item) ?? "—"}`)
		.join("; ");
};

/** Человекочитаемое значение поля для истории изменений. */
export function formatKanbanBoardHistoryValue(value: unknown): string | null {
	if (value === undefined || value === null) return null;
	if (typeof value === "string") {
		const trimmed = value.trim();
		if (!trimmed) return null;
		if (trimmed === "[object Object]") return null;
		if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
			try {
				return formatKanbanBoardHistoryValue(JSON.parse(trimmed));
			} catch {
				return trimmed;
			}
		}
		return trimmed;
	}
	if (typeof value === "number" || typeof value === "boolean") {
		return String(value);
	}
	if (Array.isArray(value)) {
		if (!value.length) return null;
		if (value.every(isSubtaskItem)) {
			return formatSubtasks(value);
		}
		return value
			.map((item) => formatKanbanBoardHistoryValue(item) ?? "—")
			.join(", ");
	}
	if (isRecord(value)) {
		if (isSubtaskItem(value)) {
			return formatSubtasks([value]);
		}
		if (typeof value.name === "string" && value.id != null) {
			return value.name.trim() || String(value.id);
		}
		if (Object.keys(value).some((key) => ROLE_ESTIMATE_KEYS.has(key))) {
			return formatRoleEstimates(value);
		}
		return formatPlainObject(value);
	}
	return String(value);
}

const formatValue = formatKanbanBoardHistoryValue;

const CONTENT_FIELDS: ReadonlyArray<{
	key: keyof KanbanBoardTaskContent;
	label: string;
	format?: (value: unknown) => string | null;
}> = [
	{ key: "title", label: "Название" },
	{ key: "description", label: "Описание" },
	{
		key: "priority",
		label: "Приоритет",
		format: (value) => kanbanBoardPriorityTitle(String(value ?? "")),
	},
	{ key: "backlogNumber", label: "№ в бэклоге" },
	{ key: "assignees", label: "Исполнители" },
	{ key: "currentAssignee", label: "Текущий исполнитель" },
	{
		key: "taskType",
		label: "Тип задачи",
		format: (value) => kanbanBoardTaskTypeTitle(String(value ?? "")),
	},
	{
		key: "workType",
		label: "Тип работ",
		format: (value) => kanbanBoardWorkTypeTitle(String(value ?? "")),
	},
	{ key: "estimatePd", label: "Оценка, чд" },
	{
		key: "roleEstimates",
		label: "Оценка по ролям",
		format: formatRoleEstimates,
	},
	{ key: "dueDate", label: "Срок" },
	{ key: "parentTask", label: "Родительская задача" },
	{ key: "customer", label: "Заказчик" },
	// deprecated: поле перенесено в description; оставлено для старых записей истории
	{ key: "sprintOutcome", label: "Результат спринта" },
	{ key: "sprintId", label: "Спринт" },
	{ key: "streamCustomer", label: "Стрим / заказчик" },
	{
		key: "subtasks",
		label: "Подзадачи",
		format: formatSubtasks,
	},
	{
		key: "images",
		label: "Изображения",
		format: (value) => {
			if (!Array.isArray(value) || !value.length) return null;
			return value
				.map((item) => formatKanbanBoardHistoryValue(item) ?? "—")
				.join(", ");
		},
	},
];

export function kanbanBoardTaskHistorySnapshot(input: {
	parentId: string;
	position: number;
	boardId: string;
	createdBy?: string | null;
	content: KanbanBoardTaskContent;
}): KanbanBoardTaskHistorySnapshot {
	return {
		parentId: input.parentId,
		position: input.position,
		boardId: input.boardId,
		createdBy: input.createdBy?.trim() || null,
		content: { ...input.content },
	};
}

export function diffKanbanTaskChanges(
	before: KanbanBoardTaskHistorySnapshot,
	after: KanbanBoardTaskHistorySnapshot,
	labels?: { columnTitle?: (columnId: string) => string },
): KanbanBoardTaskChangeItem[] {
	const changes: KanbanBoardTaskChangeItem[] = [];
	const columnTitle = labels?.columnTitle ?? ((id: string) => id);

	if (before.parentId !== after.parentId) {
		changes.push({
			field: "parentId",
			label: "Статус",
			from: columnTitle(before.parentId),
			to: columnTitle(after.parentId),
		});
	}

	if (before.boardId !== after.boardId) {
		changes.push({
			field: "boardId",
			label: "Доска",
			from: before.boardId,
			to: after.boardId,
		});
	}

	const beforeCreatedBy = before.createdBy?.trim() || null;
	const afterCreatedBy = after.createdBy?.trim() || null;
	if (beforeCreatedBy !== afterCreatedBy) {
		changes.push({
			field: "createdBy",
			label: "Назначил",
			from: beforeCreatedBy,
			to: afterCreatedBy,
		});
	}

	if (
		before.parentId === after.parentId &&
		before.position !== after.position
	) {
		changes.push({
			field: "position",
			label: "Порядок в колонке",
			from: String(before.position),
			to: String(after.position),
		});
	}

	for (const { key, label, format } of CONTENT_FIELDS) {
		const fromRaw = before.content[key];
		const toRaw = after.content[key];
		const from = format ? format(fromRaw) : formatValue(fromRaw);
		const to = format ? format(toRaw) : formatValue(toRaw);
		if (from === to) continue;
		changes.push({ field: `content.${String(key)}`, label, from, to });
	}

	return changes;
}
