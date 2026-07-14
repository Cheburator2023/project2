import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import { useColorScheme } from "@mui/material/styles";
import {
	useKanbanBoardSprints,
	useKanbanBoardTasksRegistry,
	useUpdateKanbanBoardTask,
} from "@react-client/common/api/queries/kanban-board";
import { TrackerTaskConflictDialog } from "@react-client/features/tracker/components/TrackerTaskConflictDialog";
import { useTrackerEditIdentity } from "@react-client/features/tracker/hooks/useTrackerEditIdentity";
import { isTrackerGanttSprintId } from "@react-client/features/tracker/gantt/trackerGanttIds";
import {
	buildTrackerGanttTasks,
	estimatePdFromGanttBar,
	formatTrackerDueDate,
	resolveTrackerGanttTimelineBounds,
	type TrackerGanttFilters,
	type TrackerGanttTaskMeta,
} from "@react-client/features/tracker/gantt/trackerGanttModel";
import { TRACKER_GANTT_BORDER_RADIUS, TRACKER_GANTT_GRID_WIDTH } from "@react-client/features/tracker/gantt/trackerGanttConfig";
import {
	canOpenTrackerGanttTask,
	getTrackerGanttTaskEditPath,
	resolveTrackerGanttTaskRow,
} from "@react-client/features/tracker/gantt/trackerGanttNavigation";
import {
	resolveTrackerGanttScalePreset,
	type TrackerGanttScalePresetId,
} from "@react-client/features/tracker/gantt/trackerGanttScalePresets";
import { TRACKER_GANTT_TOOLBAR_ITEMS } from "@react-client/features/tracker/gantt/trackerGanttToolbar";
import { useTrackerGanttStore } from "@react-client/features/tracker/gantt/trackerGanttStore";
import "@react-client/features/tracker/gantt/trackerGantt.css";
import {
	Gantt,
	Toolbar,
	Willow,
	WillowDark,
	type IApi,
	type ITask,
	type TID,
} from "@svar-ui/react-gantt";
import "@svar-ui/react-gantt/all.css";
import {
	parseKanbanBoardTaskEditBlockedError,
	type KanbanBoardTaskEditBlockedErrorDto,
	type KanbanBoardTaskRegistryDto,
} from "@smart-anketa/api-contract";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";

type Props = {
	filters: TrackerGanttFilters;
	scalePresetId: TrackerGanttScalePresetId;
};

type PendingGanttUpdate = {
	taskId: string;
	boardId: string;
	content: KanbanBoardTaskRegistryDto["content"];
	expectedUpdatedAt?: string;
};

export function TrackerGanttChart({ filters, scalePresetId }: Props) {
	const navigate = useNavigate();
	const { mode } = useColorScheme();
	const editLabel = useTrackerEditIdentity();
	const [editBlocked, setEditBlocked] =
		useState<KanbanBoardTaskEditBlockedErrorDto | null>(null);
	const pendingUpdateRef = useRef<PendingGanttUpdate | null>(null);
	const [api, setApi] = useState<IApi | undefined>();
	const isInteractingRef = useRef(false);
	const registryRef = useRef<
		ReturnType<typeof useKanbanBoardTasksRegistry>["data"]
	>([]);
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

	const rebuildGanttFromServer = useCallback(() => {
		setTasks(
			buildTrackerGanttTasks({
				tasks: tasksQuery.data ?? [],
				sprints: sprintsQuery.data ?? [],
				filters: filtersRef.current,
			}),
		);
	}, [setTasks, sprintsQuery.data, tasksQuery.data]);

	const applyGanttUpdate = useCallback(
		async (
			row: ITask & TrackerGanttTaskMeta,
			registryTask: KanbanBoardTaskRegistryDto,
			forceOverwrite?: boolean,
		) => {
			if (
				row.trackerKind !== "task" ||
				!row.trackerTaskId ||
				!row.trackerBoardId ||
				!row.start ||
				!row.end
			) {
				return;
			}

			const nextContent = {
				...registryTask.content,
				dueDate: formatTrackerDueDate(row.end),
				estimatePd: estimatePdFromGanttBar(row.start, row.end),
			};
			pendingUpdateRef.current = {
				taskId: row.trackerTaskId,
				boardId: row.trackerBoardId,
				content: nextContent,
				expectedUpdatedAt: registryTask.updatedAt,
			};

			try {
				await updateTask.mutateAsync({
					id: row.trackerTaskId,
					data: {
						boardId: row.trackerBoardId,
						content: nextContent,
						expectedUpdatedAt: registryTask.updatedAt,
						forceOverwrite,
						lockHolderLabel: editLabel || undefined,
					},
				});
				setEditBlocked(null);
				pendingUpdateRef.current = null;
			} catch (error) {
				const blocked = parseKanbanBoardTaskEditBlockedError(error);
				if (blocked) {
					setEditBlocked(blocked);
				}
				rebuildGanttFromServer();
				throw error;
			}
		},
		[editLabel, rebuildGanttFromServer, updateTask],
	);

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

		const openTaskUi = (id: TID) => {
			if (!canOpenTrackerGanttTask(id)) return;
			const row = resolveTrackerGanttTaskRow(id);
			if (!row) return;
			const path = getTrackerGanttTaskEditPath(row);
			if (path) navigate(path);
		};

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
				...(resolveTrackerGanttTaskRow(ev.id) ?? {}),
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

			void applyGanttUpdate(row, registryTask);
		};

		api.intercept("add-task", () => false);
		api.intercept("delete-task", () => false);
		api.intercept("copy-task", () => false);
		api.intercept("cut-task", () => false);
		api.intercept("paste-task", () => false);
		api.intercept("show-editor", (ev) => {
			openTaskUi(ev.id);
			return false;
		});
		api.intercept("update-task", (ev) => !isTrackerGanttSprintId(ev.id));
		api.on("select-task", onSelect);
		api.on("update-task", onUpdate);

		return () => {
			api.detach("select-task");
			api.detach("update-task");
		};
	}, [api, applyGanttUpdate, clearSelection, navigate, taskSelected]);

	const selectedRow = tasks.find((item) => item.id === selectedTaskId) as
		| (ITask & TrackerGanttTaskMeta)
		| undefined;

	const timeline = useMemo(
		() => resolveTrackerGanttTimelineBounds(tasks),
		[tasks],
	);

	const openSelectedTask = () => {
		if (!selectedRow) return;
		const path = getTrackerGanttTaskEditPath(selectedRow);
		if (path) navigate(path);
	};

	const loading = tasksQuery.isLoading || sprintsQuery.isLoading;
	const ThemeShell = mode === "dark" ? WillowDark : Willow;

	if (loading) {
		return (
			<Box
				className="tracker-gantt-shell"
				display="flex"
				alignItems="center"
				justifyContent="center"
				height="100%"
				sx={{
					"--tracker-gantt-shell-bg": (theme) =>
						theme.palette.background.paper,
				}}
			>
				<CircularProgress size={32} />
			</Box>
		);
	}

	if (!tasks.length) {
		return (
			<Box
				className="tracker-gantt-shell"
				display="flex"
				alignItems="center"
				justifyContent="center"
				height="100%"
				color="text.secondary"
				sx={{
					"--tracker-gantt-shell-bg": (theme) =>
						theme.palette.background.paper,
				}}
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
			sx={{
				"--tracker-gantt-shell-bg": (theme) => theme.palette.background.paper,
				borderRadius: `${TRACKER_GANTT_BORDER_RADIUS}px`,
			}}
		>
			<Box
				className="tracker-gantt-body"
				sx={{
					flex: 1,
					minHeight: 0,
					minWidth: 0,
				}}
			>
				<Box className="tracker-gantt-body-inner">
					<ThemeShell fonts={false}>
						<Box className="tracker-gantt-toolbar" sx={{ borderBottom: 1, borderColor: "divider" }}>
							<Toolbar api={api} items={TRACKER_GANTT_TOOLBAR_ITEMS} />
						</Box>
						<Box
							className="tracker-gantt-viewport"
							sx={{ borderRadius: `${TRACKER_GANTT_BORDER_RADIUS}px` }}
						>
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
					</ThemeShell>
				</Box>
			</Box>
			<Box
				className="tracker-gantt-footer"
				display="flex"
				alignItems="center"
				justifyContent="flex-end"
				gap={2}
				flexWrap="wrap"
				sx={{
					px: 1,
					py: 0.75,
					borderTop: 1,
					borderColor: "divider",
				}}
			>
				<Button
					size="small"
					variant="outlined"
					disabled={!canOpenTrackerGanttTask(selectedTaskId ?? "")}
					onClick={openSelectedTask}
					title="Открыть карточку задачи"
				>
					Открыть задачу
				</Button>
			</Box>
			<TrackerTaskConflictDialog
				open={Boolean(editBlocked)}
				error={editBlocked}
				onClose={() => {
					setEditBlocked(null);
					pendingUpdateRef.current = null;
				}}
				onRefresh={() => {
					setEditBlocked(null);
					pendingUpdateRef.current = null;
					void tasksQuery.refetch().then(() => rebuildGanttFromServer());
				}}
				onForceOverwrite={() => {
					const pending = pendingUpdateRef.current;
					setEditBlocked(null);
					if (!pending) return;
					void updateTask
						.mutateAsync({
							id: pending.taskId,
							data: {
								boardId: pending.boardId,
								content: pending.content,
								expectedUpdatedAt: pending.expectedUpdatedAt,
								forceOverwrite: true,
								lockHolderLabel: editLabel || undefined,
							},
						})
						.then(() => {
							pendingUpdateRef.current = null;
						});
				}}
			/>
		</Box>
	);
}
