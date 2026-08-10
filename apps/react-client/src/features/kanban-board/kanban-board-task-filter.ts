import {
	formatKanbanTaskKey,
	kanbanBoardTaskAssignees,
	type KanbanBoardData,
	type KanbanBoardItem,
	type KanbanBoardPriorityId,
	type KanbanBoardTaskContent,
	type KanbanBoardTaskTypeId,
} from "@smart-anketa/api-contract";
import { normalizeSearchText } from "@react-client/utils/substringSearch";

const asTaskContent = (
	content: KanbanBoardItem["content"],
): KanbanBoardTaskContent | undefined => {
	if (!content || typeof content !== "object") return undefined;
	if (!("title" in content) || typeof content.title !== "string") {
		return undefined;
	}
	return content as KanbanBoardTaskContent;
};

export type KanbanBoardTaskFilters = {
	/** Исполнитель (точное имя) */
	assignee: string;
	/** Назначил (точное имя) */
	createdBy: string;
	priority: KanbanBoardPriorityId | "";
	taskType: KanbanBoardTaskTypeId | "";
	/** YYYY-MM-DD */
	dueFrom: string;
	/** YYYY-MM-DD */
	dueTo: string;
	/** YYYY-MM-DD */
	createdFrom: string;
	/** YYYY-MM-DD */
	createdTo: string;
};

export const EMPTY_KANBAN_BOARD_TASK_FILTERS: KanbanBoardTaskFilters = {
	assignee: "",
	createdBy: "",
	priority: "",
	taskType: "",
	dueFrom: "",
	dueTo: "",
	createdFrom: "",
	createdTo: "",
};

export function kanbanBoardTaskFiltersActive(
	filters: KanbanBoardTaskFilters,
): boolean {
	return Object.values(filters).some((value) => Boolean(value?.trim?.() ?? value));
}

const dateOnly = (value: string | undefined | null): string => {
	if (!value?.trim()) return "";
	const trimmed = value.trim();
	if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10);
	try {
		return new Date(trimmed).toISOString().slice(0, 10);
	} catch {
		return "";
	}
};

const includesNormalized = (haystack: string, needle: string): boolean => {
	if (!needle) return true;
	return normalizeSearchText(haystack).includes(needle);
};

export function kanbanBoardTaskSearchHaystack(
	item: KanbanBoardItem,
	projectCode?: string,
): string {
	const content = asTaskContent(item.content);
	const taskKey =
		projectCode && item.taskNumber
			? formatKanbanTaskKey(projectCode, item.taskNumber)
			: "";
	const assignees = content ? kanbanBoardTaskAssignees(content).join(" ") : "";
	return [
		item.title,
		content?.title,
		content?.description,
		taskKey,
		content?.currentAssignee,
		content?.assignee,
		assignees,
		item.createdBy,
		content?.customer,
		content?.parentTask,
		content?.tags?.join(" "),
	]
		.filter(Boolean)
		.join(" ");
}

export function kanbanBoardTaskMatchesSearch(
	item: KanbanBoardItem,
	query: string,
	projectCode?: string,
): boolean {
	const normalized = normalizeSearchText(query);
	if (!normalized) return true;
	return includesNormalized(
		kanbanBoardTaskSearchHaystack(item, projectCode),
		normalized,
	);
}

export function kanbanBoardTaskMatchesFilters(
	item: KanbanBoardItem,
	filters: KanbanBoardTaskFilters,
): boolean {
	const content = asTaskContent(item.content);
	if (filters.priority && content?.priority !== filters.priority) {
		return false;
	}
	if (filters.taskType && content?.taskType !== filters.taskType) {
		return false;
	}
	if (filters.assignee) {
		const names = new Set(
			[
				content?.currentAssignee?.trim(),
				...(content ? kanbanBoardTaskAssignees(content) : []),
			].filter(Boolean),
		);
		if (!names.has(filters.assignee)) return false;
	}
	if (filters.createdBy) {
		if ((item.createdBy ?? "").trim() !== filters.createdBy) return false;
	}

	const due = dateOnly(content?.dueDate);
	if (filters.dueFrom && (!due || due < filters.dueFrom)) return false;
	if (filters.dueTo && (!due || due > filters.dueTo)) return false;

	const created = dateOnly(item.createdAt);
	if (filters.createdFrom && (!created || created < filters.createdFrom)) {
		return false;
	}
	if (filters.createdTo && (!created || created > filters.createdTo)) {
		return false;
	}

	return true;
}

export function filterKanbanBoardData(
	board: KanbanBoardData,
	predicate: (item: KanbanBoardItem) => boolean,
): KanbanBoardData {
	const next: KanbanBoardData = {
		...board,
		root: { ...board.root },
	};

	for (const columnId of board.root.children) {
		const column = board[columnId];
		if (!column) continue;
		const children = column.children.filter((taskId) => {
			const card = board[taskId];
			if (!card || card.type !== "card") return false;
			return predicate(card);
		});
		next[columnId] = {
			...column,
			children,
			totalChildrenCount: children.length,
		};
	}

	return next;
}

export function countKanbanBoardCards(board: KanbanBoardData): number {
	return board.root.children.reduce((sum, columnId) => {
		const column = board[columnId];
		return sum + (column?.children.length ?? 0);
	}, 0);
}
