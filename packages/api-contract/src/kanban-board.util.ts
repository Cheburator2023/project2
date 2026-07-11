import {
	type KanbanBoardAssigneeRoleId,
	type KanbanBoardColumnDto,
	type KanbanBoardData,
	type KanbanBoardRoleEstimates,
	type KanbanBoardSubtaskItem,
	type KanbanBoardSubtaskStatusId,
	type KanbanBoardTaskContent,
	type KanbanBoardTaskRecord,
	defaultKanbanBoardColumns,
	KANBAN_BOARD_ASSIGNEE_ROLES,
	KANBAN_BOARD_DEFAULT_SPRINT_CAPACITY_PD,
	KANBAN_BOARD_INPUT_BUFFER_COLUMN_ID,
	KANBAN_BOARD_LEGACY_COLUMN_ID_MAP,
	KANBAN_BOARD_STATUSES,
	KANBAN_BOARD_SUBTASK_STATUSES,
	kanbanBoardAssigneeRoleTitle,
	kanbanBoardSubtaskIsDone,
} from "./kanban-board.types";

export function toBoardData(
	rows: KanbanBoardTaskRecord[],
	columns: KanbanBoardColumnDto[],
): KanbanBoardData {
	const effectiveColumns =
		columns.length > 0 ? columns : defaultKanbanBoardColumns("board");
	const sortedColumns = [...effectiveColumns].sort(
		(a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title),
	);
	const columnIds = new Set(sortedColumns.map((column) => column.id));
	const fallbackColumnId =
		sortedColumns[0]?.id ?? KANBAN_BOARD_STATUSES[0].id;

	const byColumn = new Map<string, KanbanBoardTaskRecord[]>();
	for (const column of sortedColumns) {
		byColumn.set(column.id, []);
	}
	for (const task of rows) {
		const columnId = columnIds.has(task.parentId)
			? task.parentId
			: fallbackColumnId;
		(byColumn.get(columnId) ?? []).push(task);
	}
	for (const tasks of byColumn.values()) {
		tasks.sort((a, b) => a.position - b.position);
	}

	const board: KanbanBoardData = {
		root: {
			id: "root",
			title: "Root",
			parentId: null,
			children: sortedColumns.map((column) => column.id),
			totalChildrenCount: sortedColumns.length,
		},
	};

	for (const column of sortedColumns) {
		const tasks = byColumn.get(column.id) ?? [];
		board[column.id] = {
			id: column.id,
			title: column.title,
			parentId: "root",
			children: tasks.map((task) => task.id),
			totalChildrenCount: tasks.length,
			content: { color: column.color },
		};
		for (const task of tasks) {
			board[task.id] = {
				id: task.id,
				title: task.content.title,
				parentId: column.id,
				children: [],
				totalChildrenCount: 0,
				type: "card",
				content: task.content,
				origin: task.origin,
				updatedAt: task.updatedAt,
			};
		}
	}

	return board;
}

export function normalizeKanbanBoardData(board: KanbanBoardData): KanbanBoardData {
	const next: KanbanBoardData = { ...board, root: { ...board.root } };

	for (const columnId of board.root.children) {
		const column = board[columnId];
		if (!column) continue;

		const childCount = column.children.length;
		next[columnId] = {
			...column,
			totalChildrenCount: childCount,
		};

		for (const cardId of column.children) {
			const card = board[cardId];
			if (!card) continue;
			next[cardId] = {
				...card,
				parentId: columnId,
			};
		}
	}

	return next;
}

export function fromBoardData(
	board: KanbanBoardData,
	stand: string,
	now: string,
	boardId: string,
): KanbanBoardTaskRecord[] {
	const out: KanbanBoardTaskRecord[] = [];
	const columnIds = board.root?.children ?? [];
	for (const columnId of columnIds) {
		const column = board[columnId];
		if (!column) continue;
		column.children.forEach((cardId, position) => {
			const node = board[cardId];
			if (!node) return;
			out.push({
				id: node.id,
				boardId,
				parentId: columnId,
				position,
				content: node.content as KanbanBoardTaskContent,
				origin: node.origin ?? stand,
				updatedAt: now,
			});
		});
	}
	return out;
}

export function kanbanBoardTaskAssignees(
	content: Pick<KanbanBoardTaskContent, "assignee" | "assignees">,
): string[] {
	if (content.assignees?.length) {
		return [...new Set(content.assignees.map((item) => item.trim()).filter(Boolean))];
	}
	const legacyAssignee = content.assignee?.trim();
	return legacyAssignee ? [legacyAssignee] : [];
}

export function kanbanBoardTaskAssigneesTitle(
	content: Pick<KanbanBoardTaskContent, "assignee" | "assignees">,
): string {
	return kanbanBoardTaskAssignees(content).join(", ");
}

const KANBAN_BOARD_ASSIGNEE_ROLE_IDS = new Set<string>(
	KANBAN_BOARD_ASSIGNEE_ROLES.map((item) => item.id),
);

export function isKanbanBoardAssigneeRoleId(
	value: string | null | undefined,
): value is KanbanBoardAssigneeRoleId {
	return Boolean(value && KANBAN_BOARD_ASSIGNEE_ROLE_IDS.has(value));
}

export function kanbanBoardAssigneeRoleByName(
	assignees: ReadonlyArray<{
		name: string;
		role: KanbanBoardAssigneeRoleId | null;
	}>,
): Map<string, KanbanBoardAssigneeRoleId | null> {
	return new Map(assignees.map((item) => [item.name, item.role]));
}

/** Уникальные роли исполнителей задачи по справочнику. */
export function kanbanBoardTaskAssigneeRoles(
	content: Pick<KanbanBoardTaskContent, "assignee" | "assignees">,
	roleByAssigneeName: ReadonlyMap<string, KanbanBoardAssigneeRoleId | null | undefined>,
): KanbanBoardAssigneeRoleId[] {
	const roles = new Set<KanbanBoardAssigneeRoleId>();
	for (const name of kanbanBoardTaskAssignees(content)) {
		const role = roleByAssigneeName.get(name);
		if (role) roles.add(role);
	}
	return [...roles];
}

export function kanbanBoardTaskAssigneeRoleTitles(
	content: Pick<KanbanBoardTaskContent, "assignee" | "assignees">,
	roleByAssigneeName: ReadonlyMap<string, KanbanBoardAssigneeRoleId | null | undefined>,
): string[] {
	return kanbanBoardTaskAssigneeRoles(content, roleByAssigneeName).map((role) =>
		kanbanBoardAssigneeRoleTitle(role),
	);
}

export function kanbanBoardRoleEstimatesTotal(
	roleEstimates?: KanbanBoardRoleEstimates,
): number | undefined {
	if (!roleEstimates) return undefined;
	let sum = 0;
	let hasValue = false;
	for (const value of Object.values(roleEstimates)) {
		if (value === undefined || value === null || Number.isNaN(value)) continue;
		sum += value;
		hasValue = true;
	}
	return hasValue ? sum : undefined;
}

/** Итоговая оценка: сумма по ролям или явное estimatePd. */
export function kanbanBoardEffectiveEstimatePd(
	content: Pick<KanbanBoardTaskContent, "estimatePd" | "roleEstimates">,
): number | undefined {
	return kanbanBoardRoleEstimatesTotal(content.roleEstimates) ?? content.estimatePd;
}

export function kanbanBoardEffectiveSprintCapacityPd(input: {
	sprintCapacityPd?: number | null;
	defaultSprintCapacityPd?: number;
}): number {
	if (
		input.sprintCapacityPd !== undefined &&
		input.sprintCapacityPd !== null &&
		!Number.isNaN(input.sprintCapacityPd)
	) {
		return input.sprintCapacityPd;
	}
	const fallback =
		input.defaultSprintCapacityPd ?? KANBAN_BOARD_DEFAULT_SPRINT_CAPACITY_PD;
	return fallback;
}

/** Нормализует чеклист подзадач: убирает пустые строки, сохраняет порядок. */
export function normalizeKanbanBoardSubtasks(
	items: KanbanBoardSubtaskItem[] | undefined,
): KanbanBoardSubtaskItem[] | undefined {
	if (!items?.length) return undefined;
	const cleaned = items
		.map((item) => {
			const status = normalizeKanbanBoardSubtaskStatus(item);
			return {
				id: item.id.trim(),
				text: item.text.trim(),
				status,
			};
		})
		.filter((item) => item.id && item.text);
	return cleaned.length ? cleaned : undefined;
}

function normalizeKanbanBoardSubtaskStatus(
	item: Pick<KanbanBoardSubtaskItem, "status" | "done">,
): KanbanBoardSubtaskStatusId {
	if (
		item.status &&
		KANBAN_BOARD_SUBTASK_STATUSES.some((entry) => entry.id === item.status)
	) {
		return item.status;
	}
	if (item.done) return "done";
	return "next_up";
}

export function kanbanBoardSubtasksProgress(
	content: Pick<KanbanBoardTaskContent, "subtasks"> | undefined,
): { done: number; total: number } | undefined {
	const items = content?.subtasks;
	if (!items?.length) return undefined;
	const done = items.filter((item) => kanbanBoardSubtaskIsDone(item)).length;
	return { done, total: items.length };
}

/** Нормализует content: проставляет estimatePd из roleEstimates, убирает пустые роли. */
export function normalizeKanbanBoardTaskContent(
	content: KanbanBoardTaskContent,
): KanbanBoardTaskContent {
	const next: KanbanBoardTaskContent = { ...content };
	next.subtasks = normalizeKanbanBoardSubtasks(next.subtasks);
	if (content.images !== undefined) {
		if (content.images.length) {
			next.images = content.images
				.filter(
					(item) =>
						item &&
						typeof item.id === "string" &&
						typeof item.name === "string" &&
						Number.isFinite(item.width) &&
						Number.isFinite(item.height),
				)
				.map((item) => ({
					id: item.id,
					name: item.name.trim().slice(0, 255) || "image",
					width: Math.max(0, Math.round(item.width)),
					height: Math.max(0, Math.round(item.height)),
					fullByteSize: Math.max(0, Math.round(item.fullByteSize ?? 0)),
					thumbByteSize: Math.max(0, Math.round(item.thumbByteSize ?? 0)),
					createdAt: item.createdAt ?? new Date().toISOString(),
				}));
			if (!next.images.length) next.images = undefined;
		} else {
			next.images = undefined;
		}
	}
	if (next.roleEstimates) {
		const cleaned: KanbanBoardRoleEstimates = {};
		for (const [key, value] of Object.entries(next.roleEstimates) as [
			keyof KanbanBoardRoleEstimates,
			number | undefined,
		][]) {
			if (value !== undefined && value !== null && !Number.isNaN(value)) {
				cleaned[key] = value;
			}
		}
		next.roleEstimates = Object.keys(cleaned).length ? cleaned : undefined;
	}
	const roleTotal = kanbanBoardRoleEstimatesTotal(next.roleEstimates);
	if (roleTotal !== undefined) {
		next.estimatePd = roleTotal;
	}
	return next;
}

export function boardsEquivalent(
	left: KanbanBoardData,
	right: KanbanBoardData,
): boolean {
	const leftRows = fromBoardData(left, "stand", "1970-01-01T00:00:00.000Z", "board");
	const rightRows = fromBoardData(right, "stand", "1970-01-01T00:00:00.000Z", "board");
	if (leftRows.length !== rightRows.length) return false;

	const sortKey = (row: KanbanBoardTaskRecord) =>
		`${row.id}:${row.parentId}:${row.position}:${row.content.title}:${row.content.description ?? ""}:${row.content.priority ?? ""}:${kanbanBoardTaskAssigneesTitle(row.content)}`;
	const leftKeys = leftRows.map(sortKey).sort();
	const rightKeys = rightRows.map(sortKey).sort();
	return leftKeys.every((key, index) => key === rightKeys[index]);
}

export function resolveKanbanBoardLegacyColumnId(
	columnId: string,
	validIds?: ReadonlySet<string>,
): string {
	const mapped = KANBAN_BOARD_LEGACY_COLUMN_ID_MAP[columnId] ?? columnId;
	if (validIds && !validIds.has(mapped)) {
		return validIds.has(KANBAN_BOARD_INPUT_BUFFER_COLUMN_ID)
			? KANBAN_BOARD_INPUT_BUFFER_COLUMN_ID
			: (KANBAN_BOARD_STATUSES[0]?.id ?? mapped);
	}
	return mapped;
}
