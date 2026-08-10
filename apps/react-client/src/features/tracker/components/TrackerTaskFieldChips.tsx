import {
	KANBAN_BOARD_COLUMN_COLORS,
	kanbanBoardAssigneeRoleColor,
	kanbanBoardAssigneeRoleTitle,
	kanbanBoardEffectiveEstimatePd,
	kanbanBoardPriorityColor,
	kanbanBoardPriorityTitle,
	kanbanBoardStandColor,
	kanbanBoardStandTitle,
	kanbanBoardTaskAssigneeRoles,
	kanbanBoardTaskAssignees,
	kanbanBoardTaskTypeColor,
	kanbanBoardTaskTypeTitle,
	kanbanBoardWorkTypeColor,
	kanbanBoardWorkTypeTitle,
	type KanbanBoardAssigneeRoleId,
	type KanbanBoardStandId,
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

export function TrackerTaskPriorityChip({
	priority,
	priorityTitle,
}: {
	priority?: KanbanBoardTaskContent["priority"];
	priorityTitle?: string;
}) {
	const label = priorityTitle ?? kanbanBoardPriorityTitle(priority);
	if (!label) return null;
	return (
		<TrackerRegistryChipCell>
			<KanbanTaskFieldChip
				label={label}
				color={kanbanBoardPriorityColor(priority)}
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
	assigneeRole?: KanbanBoardAssigneeRoleId;
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

export function TrackerTaskAssigneeRolesChips({
	assigneeRoles,
	assigneeRoleTitles,
}: {
	assigneeRoles?: KanbanBoardAssigneeRoleId[];
	assigneeRoleTitles?: string[];
}) {
	if (!assigneeRoleTitles?.length) return null;
	return (
		<TrackerRegistryChipCell>
			{assigneeRoleTitles.map((title, index) => (
				<KanbanTaskFieldChip
					key={`${title}-${index}`}
					label={title}
					color={kanbanBoardAssigneeRoleColor(assigneeRoles?.[index])}
				/>
			))}
		</TrackerRegistryChipCell>
	);
}

export function TrackerTaskCurrentAssigneeChip({
	currentAssigneeTitle,
}: {
	currentAssigneeTitle?: string;
}) {
	if (!currentAssigneeTitle) return null;
	return (
		<TrackerRegistryChipCell>
			<KanbanTaskFieldChip
				label={currentAssigneeTitle}
				color={LIST_FIELD_COLORS.assignee}
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

export function TrackerTaskStandChip({
	stand,
	standTitle,
}: {
	stand?: KanbanBoardStandId | string;
	standTitle?: string;
}) {
	const label = standTitle || kanbanBoardStandTitle(stand);
	if (!label) return null;
	return (
		<TrackerRegistryChipCell>
			<KanbanTaskFieldChip
				label={label}
				color={kanbanBoardStandColor(stand)}
			/>
		</TrackerRegistryChipCell>
	);
}

export function KanbanTaskContentChips({
	content,
	origin,
	assigneeRoleByName,
}: {
	content?: KanbanBoardTaskContent;
	origin?: string;
	assigneeRoleByName?: ReadonlyMap<string, KanbanBoardAssigneeRoleId | null>;
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
			label: kanbanBoardPriorityTitle(content.priority),
			color: kanbanBoardPriorityColor(content.priority),
		});
	}
	for (const assignee of kanbanBoardTaskAssignees(content)) {
		if (content.currentAssignee?.trim() && assignee !== content.currentAssignee.trim()) {
			continue;
		}
		chips.push({
			value: `assignee:${assignee}`,
			label: assignee,
			color: LIST_FIELD_COLORS.assignee,
		});
	}
	if (assigneeRoleByName) {
		for (const role of kanbanBoardTaskAssigneeRoles(content, assigneeRoleByName)) {
			chips.push({
				value: `assigneeRole:${role}`,
				label: kanbanBoardAssigneeRoleTitle(role),
				color: kanbanBoardAssigneeRoleColor(role),
			});
		}
	}
	if (content.streamCustomer) {
		chips.push({
			value: "stream",
			label: content.streamCustomer,
			color: LIST_FIELD_COLORS.stream,
		});
	}
	if (content.stand) {
		chips.push({
			value: "stand",
			label: kanbanBoardStandTitle(content.stand),
			color: kanbanBoardStandColor(content.stand),
		});
	}
	if (origin) {
		chips.push({
			value: "origin",
			label: origin,
			color: LIST_FIELD_COLORS.origin,
		});
	}

	if (!chips.length && kanbanBoardEffectiveEstimatePd(content) === undefined && !content.dueDate) {
		return null;
	}

	return (
		<>
			{chips.map((chip) => (
				<KanbanTaskFieldChip key={chip.value} label={chip.label} color={chip.color} />
			))}
			{kanbanBoardEffectiveEstimatePd(content) !== undefined ? (
				<KanbanTaskFieldChip
					label={`${kanbanBoardEffectiveEstimatePd(content)} чд`}
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
