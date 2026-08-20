import { Flex } from "@react-client/common/primitives/Flex";
import { TrackerGanttChart } from "@react-client/features/tracker/gantt/TrackerGanttChart";
import "@react-client/features/tracker/gantt/trackerGantt.css";
import { TRACKER_GANTT_SCALE_PRESET_DEFAULT } from "@react-client/features/tracker/gantt/trackerGanttScalePresets";
import { usePlanningWorkspace } from "@react-client/features/tracker/planning/PlanningWorkspaceContext";
import { useMemo } from "react";

export function PlanningTimelinePanel() {
	const { planning } = usePlanningWorkspace();
	const filters = useMemo(() => {
		const barColorByTaskId: Record<string, string> = {};
		for (const item of planning.tasks) {
			const theme = planning.themes.find((row) => row.id === item.themeId);
			if (theme?.color) barColorByTaskId[item.taskId] = theme.color;
		}
		return {
			taskIds: planning.tasks.map((item) => item.taskId),
			hideSprintRows: true,
			barColorByTaskId,
		};
	}, [planning.tasks, planning.themes]);

	return (
		<Flex
			flexDirection="column"
			flexGrow={1}
			height="100%"
			minHeight="0"
			width="100%"
		>
			<TrackerGanttChart
				filters={filters}
				scalePresetId={TRACKER_GANTT_SCALE_PRESET_DEFAULT}
			/>
		</Flex>
	);
}
