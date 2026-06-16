import {
	type KanbanBoardData,
	TASK_STATUSES,
	type TaskContent,
	type TaskRecord,
} from "./task-tracker.types";

export function toBoardData(rows: TaskRecord[]): KanbanBoardData {
	const byStatus = new Map<string, TaskRecord[]>();
	for (const status of TASK_STATUSES) {
		byStatus.set(status.id, []);
	}
	for (const task of rows) {
		(byStatus.get(task.parentId) ?? []).push(task);
	}
	for (const tasks of byStatus.values()) {
		tasks.sort((a, b) => a.position - b.position);
	}

	const board: KanbanBoardData = {
		root: {
			id: "root",
			title: "Root",
			parentId: null,
			children: TASK_STATUSES.map((status) => status.id),
			totalChildrenCount: TASK_STATUSES.length,
		},
	};

	for (const status of TASK_STATUSES) {
		const tasks = byStatus.get(status.id) ?? [];
		board[status.id] = {
			id: status.id,
			title: status.title,
			parentId: "root",
			children: tasks.map((task) => task.id),
			totalChildrenCount: tasks.length,
		};
		for (const task of tasks) {
			board[task.id] = {
				id: task.id,
				title: task.content.title,
				parentId: status.id,
				children: [],
				totalChildrenCount: 0,
				type: "card",
				content: task.content,
				origin: task.origin,
			};
		}
	}

	return board;
}

export function fromBoardData(
	board: KanbanBoardData,
	stand: string,
	now: string,
): TaskRecord[] {
	const out: TaskRecord[] = [];
	for (const status of TASK_STATUSES) {
		const column = board[status.id];
		if (!column) continue;
		column.children.forEach((cardId, position) => {
			const node = board[cardId];
			if (!node) return;
			out.push({
				id: node.id,
				parentId: status.id,
				position,
				content: node.content as TaskContent,
				origin: node.origin ?? stand,
				updatedAt: now,
			});
		});
	}
	return out;
}

export function boardsEquivalent(
	left: KanbanBoardData,
	right: KanbanBoardData,
): boolean {
	const leftRows = fromBoardData(left, "stand", "1970-01-01T00:00:00.000Z");
	const rightRows = fromBoardData(right, "stand", "1970-01-01T00:00:00.000Z");
	if (leftRows.length !== rightRows.length) return false;

	const sortKey = (row: TaskRecord) =>
		`${row.id}:${row.parentId}:${row.position}:${row.content.title}:${row.content.description ?? ""}:${row.content.priority ?? ""}:${row.content.assignee ?? ""}`;
	const leftKeys = leftRows.map(sortKey).sort();
	const rightKeys = rightRows.map(sortKey).sort();
	return leftKeys.every((key, index) => key === rightKeys[index]);
}
