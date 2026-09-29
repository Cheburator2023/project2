import {
	formatKanbanTaskKey,
	kanbanBoardAssigneeHandoffTitle,
	kanbanBoardDisplayColumnTitle,
	kanbanBoardEffectiveEstimatePd,
	kanbanBoardPriorityColor,
	kanbanBoardPriorityTitle,
	kanbanBoardRelatedLinksFromContent,
	kanbanBoardStandColor,
	kanbanBoardStandTitle,
	kanbanBoardSystemColor,
	kanbanBoardSystemTitle,
	kanbanBoardTaskHasAssigneeHandoff,
	kanbanBoardTaskHasBlocker,
	kanbanBoardTaskReleaseLabel,
	kanbanBoardTaskStands,
	kanbanBoardTaskSystems,
	kanbanBoardTaskTypeColor,
	kanbanBoardTaskTypeTitle,
	kanbanBoardWorkTypeColor,
	kanbanBoardWorkTypeTitle,
	KANBAN_BOARD_BLOCKER_COLOR,
	KANBAN_BOARD_DEFAULT_TASK_TYPE_ID,
	KANBAN_BOARD_HANDOFF_COLOR,
	KANBAN_BOARD_RELEASE_CHIP_COLOR,
	type KanbanBoardData,
	type KanbanBoardItem,
	type KanbanBoardPriorityId,
	type KanbanBoardRelatedTaskLink,
	type KanbanBoardTaskContent,
	type KanbanBoardTaskReleaseRefDto,
	type KanbanBoardTaskTypeId,
} from "@smart-anketa/api-contract";
import { differenceInCalendarDays, format, isValid, parseISO } from "date-fns";
import { ru } from "date-fns/locale";

export const KANBAN_BOARD_UNASSIGNED_PERSON_TITLE = "Без исполнителя";

export type KanbanBoardPersonTaskChip = {
	label: string;
	color: string;
	title?: string;
};

export type KanbanBoardPersonTaskMeta = {
	createdLabel: string | null;
	ageDays: number | null;
	dueLabel: string | null;
	estimatePd?: number;
	commentCount: number;
	attachmentCount: number;
};

export type KanbanBoardPersonTask = {
	id: string;
	parentId: string;
	title: string;
	taskKey: string;
	statusTitle: string;
	statusColor: string;
	taskType: KanbanBoardTaskTypeId;
	priority?: KanbanBoardPriorityId;
	chips: KanbanBoardPersonTaskChip[];
	meta: KanbanBoardPersonTaskMeta;
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

/** Те же метки, что на карточке доски: приоритет, блокер, тип, стенд, система, релиз. */
export function buildKanbanBoardPersonTaskChips(
	content: KanbanBoardTaskContent | undefined,
	releases: readonly KanbanBoardTaskReleaseRefDto[] = [],
): KanbanBoardPersonTaskChip[] {
	const chips: KanbanBoardPersonTaskChip[] = [];
	if (content?.priority) {
		chips.push({
			label: kanbanBoardPriorityTitle(content.priority),
			color: kanbanBoardPriorityColor(content.priority),
			title: `Приоритет: ${kanbanBoardPriorityTitle(content.priority)}`,
		});
	}
	if (kanbanBoardTaskHasAssigneeHandoff(content)) {
		chips.push({
			label: "Передано",
			color: KANBAN_BOARD_HANDOFF_COLOR,
			title: kanbanBoardAssigneeHandoffTitle(content),
		});
	}
	if (kanbanBoardTaskHasBlocker(content)) {
		chips.push({
			label: "Блокер",
			color: KANBAN_BOARD_BLOCKER_COLOR,
		});
	}
	const taskType = content?.taskType ?? KANBAN_BOARD_DEFAULT_TASK_TYPE_ID;
	chips.push({
		label: kanbanBoardTaskTypeTitle(taskType),
		color: kanbanBoardTaskTypeColor(taskType),
	});
	if (content?.workType) {
		chips.push({
			label: kanbanBoardWorkTypeTitle(content.workType),
			color: kanbanBoardWorkTypeColor(content.workType),
		});
	}
	for (const standId of kanbanBoardTaskStands(content ?? {})) {
		chips.push({
			label: kanbanBoardStandTitle(standId),
			color: kanbanBoardStandColor(standId),
		});
	}
	for (const systemId of kanbanBoardTaskSystems(content ?? {})) {
		chips.push({
			label: kanbanBoardSystemTitle(systemId),
			color: kanbanBoardSystemColor(systemId),
		});
	}
	for (const release of releases) {
		chips.push({
			label: kanbanBoardTaskReleaseLabel(release),
			color: KANBAN_BOARD_RELEASE_CHIP_COLOR,
		});
	}
	return chips;
}

function parseCardDate(value?: string): Date | null {
	if (!value?.trim()) return null;
	const parsed = parseISO(value.trim());
	if (!isValid(parsed)) return null;
	return parsed;
}

function formatCardDate(value?: string): string | null {
	const parsed = parseCardDate(value);
	if (!parsed) return null;
	return format(parsed, "d MMM yyyy", { locale: ru });
}

function hangingDays(createdAt?: string, fallback?: string): number | null {
	const parsed = parseCardDate(createdAt) ?? parseCardDate(fallback);
	if (!parsed) return null;
	return Math.max(0, differenceInCalendarDays(new Date(), parsed));
}

export function buildKanbanBoardPersonTaskMeta(
	card: Pick<KanbanBoardItem, "createdAt" | "updatedAt" | "commentCount">,
	content: KanbanBoardTaskContent | undefined,
): KanbanBoardPersonTaskMeta {
	const imageCount = content?.images?.length ?? 0;
	const fileCount = content?.files?.length ?? 0;
	return {
		createdLabel: formatCardDate(card.createdAt),
		ageDays: hangingDays(card.createdAt, card.updatedAt),
		dueLabel: formatCardDate(content?.dueDate),
		estimatePd: content ? kanbanBoardEffectiveEstimatePd(content) : undefined,
		commentCount: card.commentCount ?? 0,
		attachmentCount: imageCount + fileCount,
	};
}

const PRIORITY_RANK: Record<string, number> = {
	high: 0,
	medium: 1,
	low: 2,
	hold: 3,
};

function priorityRank(priority: KanbanBoardPriorityId | undefined): number {
	if (!priority) return PRIORITY_RANK.medium ?? 1;
	return PRIORITY_RANK[priority] ?? 1;
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

/** Группы по текущему исполнителю. Внутри спойлера — по приоритету (выше выше). Без исполнителя в конце. */
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
				priority: content?.priority,
				chips: buildKanbanBoardPersonTaskChips(content, card.releases ?? []),
				meta: buildKanbanBoardPersonTaskMeta(card, content),
				relatedLinks: kanbanBoardRelatedLinksFromContent(content, {
					excludeId: card.id,
				}),
			});
		}
	}

	for (const group of groups.values()) {
		group.tasks.sort(
			(a, b) =>
				priorityRank(a.priority) - priorityRank(b.priority) ||
				a.taskKey.localeCompare(b.taskKey, "ru") ||
				a.title.localeCompare(b.title, "ru"),
		);
	}

	return [...groups.values()].sort((a, b) => {
		if (!a.assignee) return 1;
		if (!b.assignee) return -1;
		return a.title.localeCompare(b.title, "ru");
	});
}
