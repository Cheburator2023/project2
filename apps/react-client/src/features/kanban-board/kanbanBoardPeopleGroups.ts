import {
	formatKanbanTaskKey,
	kanbanBoardDisplayColumnTitle,
	kanbanBoardRelatedLinksFromContent,
	KANBAN_BOARD_DEFAULT_TASK_TYPE_ID,
	type KanbanBoardData,
	type KanbanBoardItem,
	type KanbanBoardRelatedTaskLink,
	type KanbanBoardTaskContent,
	type KanbanBoardTaskTypeId,
} from "@smart-anketa/api-contract";

export const KANBAN_BOARD_UNASSIGNED_PERSON_TITLE = "Без исполнителя";

export type KanbanBoardPersonTask = {
	id: string;
	parentId: string;
	title: string;
	taskKey: string;
	statusTitle: string;
	statusColor: string;
	taskType: KanbanBoardTaskTypeId;
	relatedLinks: KanbanBoardRelatedTaskLink[];
};

export type KanbanBoardPersonGroup = {
	assignee: string;
	title: string;
	tasks: KanbanBoardPersonTask[];
};

function taskContent(
	item: KanbanBoardItem,
): KanbanBoardTaskContent | undefined {
	const content = item.content;
	if (!content || typeof content !== "object" || !("title" in content)) {
		return undefined;
	}
	return content;
}

function columnColor(column: KanbanBoardItem | undefined): string {
	const color = column?.content;
	if (
		color &&
		typeof color === "object" &&
		"color" in color &&
		typeof color.color === "string" &&
		color.color
	) {
		return color.color;
	}
	return "#94a3b8";
}

function ensurePersonGroup(
	groups: Map<string, KanbanBoardPersonGroup>,
	assignee: string,
): KanbanBoardPersonGroup {
	const existing = groups.get(assignee);
	if (existing) return existing;
	const group: KanbanBoardPersonGroup = {
		assignee,
		title: assignee || KANBAN_BOARD_UNASSIGNED_PERSON_TITLE,
		tasks: [],
	};
	groups.set(assignee, group);
	return group;
}

/** Группы по текущему исполнителю. Порядок задач — как на доске. Без исполнителя в конце. */
export function groupKanbanBoardByCurrentAssignee(
	board: KanbanBoardData,
	taskKeyPrefix?: string,
	assigneeNames: readonly string[] = [],
): KanbanBoardPersonGroup[] {
	const groups = new Map<string, KanbanBoardPersonGroup>();
	for (const name of assigneeNames) {
		const assignee = name.trim();
		if (assignee) ensurePersonGroup(groups, assignee);
	}

	for (const columnId of board.root.children) {
		const column = board[columnId];
		if (!column) continue;
		for (const cardId of column.children) {
			const card = board[cardId];
			if (!card || card.type !== "card") continue;
			const content = taskContent(card);
			const assignee = content?.currentAssignee?.trim() ?? "";
			const group = ensurePersonGroup(groups, assignee);
			const taskKey =
				taskKeyPrefix && card.taskNumber
					? formatKanbanTaskKey(taskKeyPrefix, card.taskNumber)
					: "";
			group.tasks.push({
				id: card.id,
				parentId: column.id,
				title: card.title || content?.title || "",
				taskKey,
				statusTitle: kanbanBoardDisplayColumnTitle(column),
				statusColor: columnColor(column),
				taskType: content?.taskType ?? KANBAN_BOARD_DEFAULT_TASK_TYPE_ID,
				relatedLinks: kanbanBoardRelatedLinksFromContent(content, {
					excludeId: card.id,
				}),
			});
		}
	}

	return [...groups.values()].sort((a, b) => {
		if (!a.assignee) return 1;
		if (!b.assignee) return -1;
		return a.title.localeCompare(b.title, "ru");
	});
}
