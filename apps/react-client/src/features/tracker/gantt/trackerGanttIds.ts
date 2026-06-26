export const TRACKER_GANTT_SPRINT_PREFIX = "sprint:";
export const TRACKER_GANTT_UNASSIGNED_SPRINT_ID = `${TRACKER_GANTT_SPRINT_PREFIX}unassigned`;

export function trackerGanttSprintId(sprintId: string) {
	return `${TRACKER_GANTT_SPRINT_PREFIX}${sprintId}`;
}

export function isTrackerGanttSprintId(id: string | number | undefined) {
	return String(id ?? "").startsWith(TRACKER_GANTT_SPRINT_PREFIX);
}
