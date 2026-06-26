import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";
import { useColorScheme } from "@mui/material/styles";
import {
	useKanbanBoardSprints,
	useKanbanBoardTasksRegistry,
	useUpdateKanbanBoardTask,
} from "@react-client/common/api/queries/kanban-board";
import { kanbanTaskEditPath } from "@react-client/features/kanban-board/kanban-task-paths";
import { isTrackerGanttSprintId } from "@react-client/features/tracker/gantt/trackerGanttIds";
import {
	buildTrackerGanttTasks,
	estimatePdFromGanttBar,
	formatTrackerDueDate,
	resolveTrackerGanttTimelineBounds,
	type TrackerGanttFilters,
	type TrackerGanttTaskMeta,
} from "@react-client/features/tracker/gantt/trackerGanttModel";
import { TRACKER_GANTT_GRID_WIDTH } from "@react-client/features/tracker/gantt/trackerGanttConfig";
import {
	resolveTrackerGanttScalePreset,
	type TrackerGanttScalePresetId,
} from "@react-client/features/tracker/gantt/trackerGanttScalePresets";
import { useTrackerGanttStore } from "@react-client/features/tracker/gantt/trackerGanttStore";
import "@react-client/features/tracker/gantt/trackerGantt.css";
import {
	Editor,
	Gantt,
	Toolbar,
	Willow,
	WillowDark,
	type IApi,
	type ITask,
	type TID,
} from "@svar-ui/react-gantt";
import "@svar-ui/react-gantt/all.css";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";

type Props = {
	filters: TrackerGanttFilters;
	scalePresetId: TrackerGanttScalePresetId;
};

export function TrackerGanttChart({ filters, scalePresetId }: Props) {
	const navigate = useNavigate();
	const { mode } = useColorScheme();
	const [api, setApi] = useState<IApi | undefined>();
	const isInteractingRef = useRef(false);
	const registryRef = useRef<ReturnType<typeof useKanbanBoardTasksRegistry>["data"]>(
		[],
	);
	const filtersRef = useRef(filters);
	filtersRef.current = filters;

	const tasksQuery = useKanbanBoardTasksRegistry();
	const sprintsQuery = useKanbanBoardSprints();
	const updateTask = useUpdateKanbanBoardTask();

	const tasks = useTrackerGanttStore((state) => state.tasks);
	const columns = useTrackerGanttStore((state) => state.columns);
	const selectedTaskId = useTrackerGanttStore((state) => state.selectedTaskId);
	const setTasks = useTrackerGanttStore((state) => state.setTasks);
	const taskSelected = useTrackerGanttStore((state) => state.taskSelected);
	const clearSelection = useTrackerGanttStore((state) => state.clearSelection);

	const scalePreset = useMemo(
		() => resolveTrackerGanttScalePreset(scalePresetId),
		[scalePresetId],
	);

	registryRef.current = tasksQuery.data ?? [];

	useEffect(() => {
		if (isInteractingRef.current) return;
		if (tasksQuery.isLoading || sprintsQuery.isLoading) return;

		setTasks(
			buildTrackerGanttTasks({
				tasks: tasksQuery.data ?? [],
				sprints: sprintsQuery.data ?? [],
				filters: filtersRef.current,
			}),
		);
	}, [
		filters,
		setTasks,
		sprintsQuery.data,
		sprintsQuery.isLoading,
		tasksQuery.data,
		tasksQuery.isLoading,
	]);

	useEffect(() => {
		if (!api) return;

		const onSelect = (ev: { id: TID }) => {
			if (isTrackerGanttSprintId(ev.id)) {
				clearSelection();
				return;
			}
			taskSelected(ev);
		};

		const onUpdate = (ev: {
			id: TID;
			task: Partial<ITask>;
			inProgress?: boolean;
		}) => {
			if (isTrackerGanttSprintId(ev.id)) return;
			isInteractingRef.current = Boolean(ev.inProgress);
			if (ev.inProgress) return;

			const row = {
				...(useTrackerGanttStore
					.getState()
					.tasks.find((item) => item.id === ev.id) as
					| (ITask & TrackerGanttTaskMeta)
					| undefined),
				...ev.task,
			} as ITask & TrackerGanttTaskMeta;

			if (
				row.trackerKind !== "task" ||
				!row.trackerTaskId ||
				!row.trackerBoardId ||
				!row.start ||
				!row.end
			) {
				return;
			}

			const registryTask = (registryRef.current ?? []).find(
				(item) => item.id === row.trackerTaskId,
			);
			if (!registryTask) return;

			void updateTask.mutateAsync({
				id: row.trackerTaskId,
				data: {
					boardId: row.trackerBoardId,
					content: {
						...registryTask.content,
						dueDate: formatTrackerDueDate(row.end),
						estimatePd: estimatePdFromGanttBar(row.start, row.end),
					},
				},
			});
		};

		api.intercept("update-task", (ev) => !isTrackerGanttSprintId(ev.id));
		api.intercept("delete-task", (ev) => !isTrackerGanttSprintId(ev.id));
		api.on("select-task", onSelect);
		api.on("update-task", onUpdate);

		return () => {
			api.detach("select-task");
			api.detach("update-task");
		};
	}, [api, clearSelection, taskSelected, updateTask]);

	const selectedRow = tasks.find((item) => item.id === selectedTaskId) as
		| (ITask & TrackerGanttTaskMeta)
		| undefined;

	const timeline = useMemo(
		() => resolveTrackerGanttTimelineBounds(tasks),
		[tasks],
	);

	const openSelectedTask = () => {
		if (!selectedRow?.trackerTaskId || !selectedRow.trackerBoardId) return;
		navigate(kanbanTaskEditPath(selectedRow.trackerBoardId, selectedRow.trackerTaskId));
	};

	const loading = tasksQuery.isLoading || sprintsQuery.isLoading;
	const ThemeShell = mode === "dark" ? WillowDark : Willow;

	if (loading) {
		return (
			<Box
				display="flex"
				alignItems="center"
				justifyContent="center"
				height="100%"
				minHeight={320}
			>
				<CircularProgress size={32} />
			</Box>
		);
	}

	if (!tasks.length) {
		return (
			<Box
				display="flex"
				alignItems="center"
				justifyContent="center"
				height="100%"
				minHeight={320}
				color="text.secondary"
			>
				Нет задач для отображения на диаграмме
			</Box>
		);
	}

	return (
		<Box
			height="100%"
			minHeight="0"
			width="100%"
			maxWidth="100%"
			display="flex"
			flexDirection="column"
			className="tracker-gantt-shell"
		>
			<Box
				className="tracker-gantt-body"
				sx={{
					flex: 1,
					minHeight: 0,
					minWidth: 0,
					display: "flex",
					flexDirection: "column",
					overflow: "hidden",
				}}
			>
				<ThemeShell fonts={false}>
					<Box
						sx={{
							flexShrink: 0,
							borderBottom: 1,
							borderColor: "divider",
							minWidth: 0,
							overflow: "hidden",
						}}
					>
						<Toolbar api={api} />
					</Box>
					<Box className="tracker-gantt-viewport">
						<Gantt
							key={scalePreset.id}
							tasks={tasks}
							scales={scalePreset.scales}
							columns={columns}
							start={timeline.start}
							end={timeline.end}
							cellWidth={scalePreset.cellWidth}
							gridWidth={TRACKER_GANTT_GRID_WIDTH}
							autoScale={false}
							init={setApi}
						/>
					</Box>
					{api ? <Editor api={api} /> : null}
				</ThemeShell>
			</Box>
			<Box
				display="flex"
				alignItems="center"
				justifyContent="space-between"
				gap={2}
				flexWrap="wrap"
				sx={{
					flexShrink: 0,
					px: 1,
					py: 0.75,
					borderTop: 1,
					borderColor: "divider",
				}}
			>
				<Typography variant="body2" color="text.secondary">
					{selectedRow?.trackerTaskId
						? `Выбрано: ${selectedRow.text ?? "задача"}`
						: "Выберите задачу на диаграмме"}
				</Typography>
				<Button
					size="small"
					variant="outlined"
					disabled={!selectedRow?.trackerTaskId}
					onClick={openSelectedTask}
					title="Открыть карточку задачи"
				>
					Открыть задачу
				</Button>
			</Box>
		</Box>
	);
}
