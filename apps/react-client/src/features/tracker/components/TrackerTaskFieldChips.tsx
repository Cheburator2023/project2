import {
	KANBAN_BOARD_COLUMN_COLORS,
	kanbanBoardAssigneeRoleColor,
	kanbanBoardAssigneeRoleTitle,
	kanbanBoardPriorityColor,
	kanbanBoardTaskAssignees,
	kanbanBoardTaskTypeColor,
	kanbanBoardTaskTypeTitle,
	kanbanBoardWorkTypeColor,
	kanbanBoardWorkTypeTitle,
	type KanbanBoardStatusId,
	type KanbanBoardTaskContent,
} from "@smart-anketa/api-contract";
import {
	KanbanTaskFieldChip,
	type KanbanTaskChipOption,
} from "@react-client/features/kanban-board/components/KanbanTaskSelectField";
import { TrackerRegistryChipCell } from "@react-client/features/tracker/components/TrackerRegistryChipCell";

const LIST_FIELD_COLORS = {
	assignee: "#2563eb",
	sprint: "#0891b2",
	stream: "#7c3aed",
	origin: "#0284c7",
	board: "#6366f1",
} as const;

export function kanbanBoardStatusColor(statusId?: string): string {
	if (!statusId) return "#64748b";
	return (
		KANBAN_BOARD_COLUMN_COLORS[statusId as KanbanBoardStatusId] ?? "#64748b"
	);
}

export function TrackerTaskStatusChip({
	statusId,
	statusTitle,
}: {
	statusId?: string;
	statusTitle?: string;
}) {
	if (!statusTitle) return null;
	return (
		<TrackerRegistryChipCell>
			<KanbanTaskFieldChip
				label={statusTitle}
				color={kanbanBoardStatusColor(statusId)}
			/>
		</TrackerRegistryChipCell>
	);
}

export function TrackerTaskTypeChip({
	taskType,
	taskTypeTitle,
}: {
	taskType?: KanbanBoardTaskContent["taskType"];
	taskTypeTitle?: string;
}) {
	if (!taskTypeTitle) return null;
	return (
		<TrackerRegistryChipCell>
			<KanbanTaskFieldChip
				label={taskTypeTitle}
				color={kanbanBoardTaskTypeColor(taskType)}
			/>
		</TrackerRegistryChipCell>
	);
}

export function TrackerTaskWorkTypeChip({
	workType,
	workTypeTitle,
}: {
	workType?: KanbanBoardTaskContent["workType"];
	workTypeTitle?: string;
}) {
	if (!workTypeTitle) return null;
	return (
		<TrackerRegistryChipCell>
			<KanbanTaskFieldChip
				label={workTypeTitle}
				color={kanbanBoardWorkTypeColor(workType)}
			/>
		</TrackerRegistryChipCell>
	);
}

export function TrackerTaskAssigneeChip({ assigneeTitle }: { assigneeTitle?: string }) {
	if (!assigneeTitle) return null;
	return (
		<TrackerRegistryChipCell>
			<KanbanTaskFieldChip label={assigneeTitle} color={LIST_FIELD_COLORS.assignee} />
		</TrackerRegistryChipCell>
	);
}

export function TrackerTaskAssigneesChips({ assignees }: { assignees?: string[] }) {
	if (!assignees?.length) return null;
	return (
		<TrackerRegistryChipCell>
			{assignees.map((assignee) => (
				<KanbanTaskFieldChip
					key={assignee}
					label={assignee}
					color={LIST_FIELD_COLORS.assignee}
				/>
			))}
		</TrackerRegistryChipCell>
	);
}

export function TrackerTaskAssigneeRoleChip({
	assigneeRole,
	assigneeRoleTitle,
}: {
	assigneeRole?: KanbanBoardTaskContent["assigneeRole"];
	assigneeRoleTitle?: string;
}) {
	if (!assigneeRoleTitle) return null;
	return (
		<TrackerRegistryChipCell>
			<KanbanTaskFieldChip
				label={assigneeRoleTitle}
				color={kanbanBoardAssigneeRoleColor(assigneeRole)}
			/>
		</TrackerRegistryChipCell>
	);
}

export function TrackerTaskSprintChip({ sprintTitle }: { sprintTitle?: string }) {
	if (!sprintTitle) return null;
	return (
		<TrackerRegistryChipCell>
			<KanbanTaskFieldChip label={sprintTitle} color={LIST_FIELD_COLORS.sprint} />
		</TrackerRegistryChipCell>
	);
}

export function TrackerTaskStreamChip({ streamCustomer }: { streamCustomer?: string }) {
	if (!streamCustomer) return null;
	return (
		<TrackerRegistryChipCell>
			<KanbanTaskFieldChip label={streamCustomer} color={LIST_FIELD_COLORS.stream} />
		</TrackerRegistryChipCell>
	);
}

export function TrackerTaskOriginChip({ origin }: { origin?: string }) {
	if (!origin) return null;
	return (
		<TrackerRegistryChipCell>
			<KanbanTaskFieldChip label={origin} color={LIST_FIELD_COLORS.origin} outlined />
		</TrackerRegistryChipCell>
	);
}

export function KanbanTaskContentChips({
	content,
	origin,
}: {
	content?: KanbanBoardTaskContent;
	origin?: string;
}) {
	if (!content) return null;

	const chips: KanbanTaskChipOption[] = [];
	if (content.taskType) {
		chips.push({
			value: "taskType",
			label: kanbanBoardTaskTypeTitle(content.taskType),
			color: kanbanBoardTaskTypeColor(content.taskType),
		});
	}
	if (content.workType) {
		chips.push({
			value: "workType",
			label: kanbanBoardWorkTypeTitle(content.workType),
			color: kanbanBoardWorkTypeColor(content.workType),
		});
	}
	if (content.priority) {
		chips.push({
			value: "priority",
			label: content.priority,
			color: kanbanBoardPriorityColor(content.priority),
		});
	}
	for (const assignee of kanbanBoardTaskAssignees(content)) {
		chips.push({
			value: `assignee:${assignee}`,
			label: assignee,
			color: LIST_FIELD_COLORS.assignee,
		});
	}
	if (content.assigneeRole) {
		chips.push({
			value: "assigneeRole",
			label: kanbanBoardAssigneeRoleTitle(content.assigneeRole),
			color: kanbanBoardAssigneeRoleColor(content.assigneeRole),
		});
	}
	if (content.streamCustomer) {
		chips.push({
			value: "stream",
			label: content.streamCustomer,
			color: LIST_FIELD_COLORS.stream,
		});
	}
	if (origin) {
		chips.push({
			value: "origin",
			label: origin,
			color: LIST_FIELD_COLORS.origin,
		});
	}

	if (!chips.length && content.estimatePd === undefined && !content.dueDate) {
		return null;
	}

	return (
		<>
			{chips.map((chip) => (
				<KanbanTaskFieldChip key={chip.value} label={chip.label} color={chip.color} />
			))}
			{content.estimatePd !== undefined ? (
				<KanbanTaskFieldChip
					label={`${content.estimatePd} чд`}
					color="#64748b"
					outlined
				/>
			) : null}
			{content.dueDate ? (
				<KanbanTaskFieldChip label={content.dueDate} color="#64748b" outlined />
			) : null}
		</>
	);
}
