import type { KanbanBoardTaskRegistryDto } from "@smart-anketa/api-contract";

export function isTrackerMyTask(
	task: KanbanBoardTaskRegistryDto,
	me: string,
): boolean {
	const name = me.trim();
	if (!name) return false;
	const isAssignee =
		task.currentAssigneeTitle === name || task.assignees.includes(name);
	const isCreator = (task.createdBy ?? "").trim() === name;
	return isAssignee || isCreator;
}

export function trackerMyTaskRoles(
	task: KanbanBoardTaskRegistryDto,
	me: string,
): { asAssignee: boolean; asCreator: boolean } {
	const name = me.trim();
	return {
		asAssignee:
			Boolean(name) &&
			(task.currentAssigneeTitle === name || task.assignees.includes(name)),
		asCreator: Boolean(name) && (task.createdBy ?? "").trim() === name,
	};
}

export type TrackerMyTasksDashboard = {
	total: number;
	asAssignee: number;
	asCreator: number;
	highPriority: number;
	byBoard: Array<{ boardKey: string; boardName: string; count: number }>;
	byStatus: Array<{ statusTitle: string; count: number }>;
};

export function buildTrackerMyTasksDashboard(
	tasks: KanbanBoardTaskRegistryDto[],
	me: string,
): TrackerMyTasksDashboard {
	let asAssignee = 0;
	let asCreator = 0;
	let highPriority = 0;
	const boardCounts = new Map<string, { boardKey: string; boardName: string; count: number }>();
	const statusCounts = new Map<string, number>();

	for (const task of tasks) {
		const roles = trackerMyTaskRoles(task, me);
		if (roles.asAssignee) asAssignee += 1;
		if (roles.asCreator) asCreator += 1;
		if (task.content.priority === "high") highPriority += 1;

		const boardKey = task.boardKey || task.boardId;
		const boardEntry = boardCounts.get(boardKey) ?? {
			boardKey,
			boardName: task.boardName || boardKey,
			count: 0,
		};
		boardEntry.count += 1;
		boardCounts.set(boardKey, boardEntry);

		const status = task.statusTitle?.trim() || "Без статуса";
		statusCounts.set(status, (statusCounts.get(status) ?? 0) + 1);
	}

	return {
		total: tasks.length,
		asAssignee,
		asCreator,
		highPriority,
		byBoard: [...boardCounts.values()]
			.sort((a, b) => b.count - a.count || a.boardName.localeCompare(b.boardName, "ru"))
			.slice(0, 6),
		byStatus: [...statusCounts.entries()]
			.map(([statusTitle, count]) => ({ statusTitle, count }))
			.sort((a, b) => b.count - a.count || a.statusTitle.localeCompare(b.statusTitle, "ru"))
			.slice(0, 6),
	};
}
