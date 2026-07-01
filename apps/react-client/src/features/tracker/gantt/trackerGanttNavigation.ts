import { kanbanTaskEditPath } from "@react-client/features/kanban-board/kanban-task-paths";
import { isTrackerGanttSprintId } from "@react-client/features/tracker/gantt/trackerGanttIds";
import type { TrackerGanttTaskMeta } from "@react-client/features/tracker/gantt/trackerGanttModel";
import { useTrackerGanttStore } from "@react-client/features/tracker/gantt/trackerGanttStore";
import type { ITask, TID } from "@svar-ui/react-gantt";

export function resolveTrackerGanttTaskRow(
	id: TID,
): (ITask & TrackerGanttTaskMeta) | undefined {
	return useTrackerGanttStore
		.getState()
		.tasks.find((item) => item.id === id) as
		| (ITask & TrackerGanttTaskMeta)
		| undefined;
}

export function getTrackerGanttTaskEditPath(
	row: ITask & TrackerGanttTaskMeta,
): string | null {
	if (
		row.trackerKind !== "task" ||
		!row.trackerTaskKey
	) {
		return null;
	}
	return kanbanTaskEditPath(row.trackerTaskKey);
}

export function canOpenTrackerGanttTask(id: TID): boolean {
	if (isTrackerGanttSprintId(id)) return false;
	const row = resolveTrackerGanttTaskRow(id);
	return Boolean(row && getTrackerGanttTaskEditPath(row));
}
