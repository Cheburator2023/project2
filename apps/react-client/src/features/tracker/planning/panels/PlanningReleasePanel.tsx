import Button from "@mui/material/Button";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import type { ColDef, RowClassParams } from "ag-grid-community";
import { Card } from "@react-client/common/muiCustom/Card";
import { Flex } from "@react-client/common/primitives/Flex";
import { Spacer } from "@react-client/common/primitives/Spacer";
import { toast } from "@react-client/common/toasts";
import { apiErrorMessage } from "@react-client/common/api/helpers/apiErrorMessage";
import {
	useAddKanbanBoardPlanningRelease,
	useDetachKanbanBoardReleaseTask,
	useKanbanBoardReleases,
	useKanbanBoardSprints,
	useKanbanBoardSupersprints,
	useRemoveKanbanBoardPlanningRelease,
	useUpdateKanbanBoardRelease,
} from "@react-client/common/api/queries/kanban-board";
import { TrackerRegistryGrid } from "@react-client/features/tracker/components/TrackerRegistryGrid";
import { trackerTaskRowTintStyle } from "@react-client/features/tracker/components/TrackerTaskFieldChips";
import { trackerTaskPath } from "@react-client/features/kanban-board/kanban-task-paths";
import { generateTrackerAutoCode } from "@react-client/features/tracker/trackerAutoCode";
import { isPlanningTaskPersistColId } from "@react-client/features/tracker/planning/planningTaskCellEdit";
import { createPlanningTaskFieldColDefs } from "@react-client/features/tracker/planning/planningTaskFieldColumns";
import { usePlanningWorkspace } from "@react-client/features/tracker/planning/PlanningWorkspaceContext";
import { usePlanningTaskGridEdits } from "@react-client/features/tracker/planning/usePlanningTaskGridEdits";
import {
	KANBAN_BOARD_RELEASE_IMAGE_TARGETS,
	KANBAN_BOARD_RELEASE_STATUSES,
	kanbanBoardTaskReleaseLabel,
	kanbanBoardTaskHasBlocker,
	normalizeKanbanBoardReleaseImageVersions,
	type KanbanBoardReleaseImageVersions,
	type KanbanBoardReleaseStatusId,
	type KanbanBoardReleaseTaskDto,
} from "@smart-anketa/api-contract";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";

export function PlanningReleasePanel() {
	const navigate = useNavigate();
	const { planning, activeReleaseId, setActiveReleaseId } =
		usePlanningWorkspace();
	const release = planning.releases.find((item) => item.id === activeReleaseId);
	const { data: sprints = [] } = useKanbanBoardSprints();
	const { data: supersprints = [] } = useKanbanBoardSupersprints();
	const { data: availableReleases = [] } = useKanbanBoardReleases(true);
	const updateRelease = useUpdateKanbanBoardRelease();
	const addRelease = useAddKanbanBoardPlanningRelease();
	const removeRelease = useRemoveKanbanBoardPlanningRelease();
	const detachTask = useDetachKanbanBoardReleaseTask();
	const { lookups, persistTask, conflictDialog } = usePlanningTaskGridEdits();

	const [newCode, setNewCode] = useState(() => generateTrackerAutoCode("rel"));
	const [newName, setNewName] = useState("");
	const [attachReleaseId, setAttachReleaseId] = useState("");

	const [name, setName] = useState(release?.name ?? "");
	const [status, setStatus] = useState<KanbanBoardReleaseStatusId>(
		release?.status ?? "draft",
	);
	const [startDate, setStartDate] = useState(release?.startDate ?? "");
	const [endDate, setEndDate] = useState(release?.endDate ?? "");
	const [supersprintId, setSupersprintId] = useState(
		release?.supersprintId ?? "",
	);
	const [sprintId, setSprintId] = useState(release?.sprintId ?? "");
	const [imageVersions, setImageVersions] =
		useState<KanbanBoardReleaseImageVersions>(release?.imageVersions ?? {});

	useEffect(() => {
		setName(release?.name ?? "");
		setStatus(release?.status ?? "draft");
		setStartDate(release?.startDate ?? "");
		setEndDate(release?.endDate ?? "");
		setSupersprintId(release?.supersprintId ?? "");
		setSprintId(release?.sprintId ?? "");
		setImageVersions(release?.imageVersions ?? {});
	}, [release]);

	const saveRelease = async () => {
		if (!release) return;
		try {
			await updateRelease.mutateAsync({
				id: release.id,
				data: {
					name,
					status,
					startDate: startDate || null,
					endDate: endDate || null,
					supersprintId: supersprintId || null,
					sprintId: sprintId || null,
					imageVersions:
						normalizeKanbanBoardReleaseImageVersions(imageVersions),
				},
			});
			toast.success("Релиз сохранён");
		} catch (error) {
			toast.error(apiErrorMessage(error));
		}
	};

	const createRelease = async () => {
		const code = newCode.trim();
		const nextName = newName.trim();
		if (!code || !nextName) {
			toast.error("Укажите код и название релиза");
			return;
		}
		try {
			const detail = await addRelease.mutateAsync({
				planningId: planning.id,
				data: { code, name: nextName },
			});
			const previous = new Set(planning.releases.map((item) => item.id));
			const created = detail.releases.find((item) => !previous.has(item.id));
			if (created) setActiveReleaseId(created.id);
			setNewCode(generateTrackerAutoCode("rel"));
			setNewName("");
			toast.success("Релиз создан");
		} catch (error) {
			toast.error(apiErrorMessage(error));
		}
	};

	const attachExisting = async () => {
		if (!attachReleaseId) return;
		try {
			await addRelease.mutateAsync({
				planningId: planning.id,
				data: { releaseId: attachReleaseId },
			});
			setActiveReleaseId(attachReleaseId);
			setAttachReleaseId("");
			toast.success("Релиз прикреплён");
		} catch (error) {
			toast.error(apiErrorMessage(error));
		}
	};

	const unlinkRelease = async () => {
		if (!release) return;
		try {
			await removeRelease.mutateAsync({
				planningId: planning.id,
				releaseId: release.id,
			});
			toast.success("Релиз откреплён от планирования");
		} catch (error) {
			toast.error(apiErrorMessage(error));
		}
	};

	const imageFields = useMemo(() => KANBAN_BOARD_RELEASE_IMAGE_TARGETS, []);
	const releaseTasks = useMemo(
		() => planning.tasks.filter((item) => item.releaseId === activeReleaseId),
		[activeReleaseId, planning.tasks],
	);
	const themeById = useMemo(
		() => new Map(planning.themes.map((theme) => [theme.id, theme])),
		[planning.themes],
	);
	const releaseTaskColumns = useMemo<
		ColDef<KanbanBoardReleaseTaskDto>[]
	>(() => {
		const themeCol: ColDef<KanbanBoardReleaseTaskDto> = {
			colId: "theme",
			headerName: "Группа",
			flex: 1,
			minWidth: 120,
			valueGetter: (params) => {
				const themeId = params.data?.themeId;
				if (!themeId) return "Без группы";
				return themeById.get(themeId)?.name ?? "Без группы";
			},
		};
		const taskCols = createPlanningTaskFieldColDefs<KanbanBoardReleaseTaskDto>({
			getTask: (row) => row?.task,
			lookups,
		});
		const titleIndex = taskCols.findIndex((col) => col.colId === "title");
		if (titleIndex < 0) return [themeCol, ...taskCols];
		return [
			...taskCols.slice(0, titleIndex + 1),
			themeCol,
			...taskCols.slice(titleIndex + 1),
		];
	}, [lookups, themeById]);

	return (
		<Flex
			flexDirection="column"
			height="100%"
			minHeight="0"
			padding="12px"
			style={{ overflow: "auto" }}
		>
			<Typography variant="subtitle2">Релизы планирования</Typography>
			<Spacer space={8} />
			<Flex gap={8} wrap="wrap">
				{planning.releases.map((item) => (
					<Button
						key={item.id}
						size="small"
						variant={item.id === activeReleaseId ? "contained" : "outlined"}
						onClick={() => setActiveReleaseId(item.id)}
						title={kanbanBoardTaskReleaseLabel(item)}
					>
						{kanbanBoardTaskReleaseLabel(item)}
					</Button>
				))}
			</Flex>
			<Spacer space={12} />
			<TextField
				size="small"
				label="Код нового релиза"
				value={newCode}
				onChange={(event) => setNewCode(event.target.value)}
			/>
			<Spacer space={8} />
			<TextField
				size="small"
				label="Название нового релиза"
				value={newName}
				onChange={(event) => setNewName(event.target.value)}
			/>
			<Spacer space={8} />
			<Button
				variant="outlined"
				disabled={addRelease.isPending}
				onClick={() => void createRelease()}
			>
				Создать релиз
			</Button>
			<Spacer space={12} />
			<TextField
				size="small"
				select
				label="Существующий релиз"
				value={attachReleaseId}
				onChange={(event) => setAttachReleaseId(event.target.value)}
			>
				<MenuItem value="">—</MenuItem>
				{availableReleases.map((item) => (
					<MenuItem key={item.id} value={item.id}>
						{kanbanBoardTaskReleaseLabel(item)}
					</MenuItem>
				))}
			</TextField>
			<Spacer space={8} />
			<Button
				variant="outlined"
				disabled={!attachReleaseId || addRelease.isPending}
				onClick={() => void attachExisting()}
			>
				Прикрепить к планированию
			</Button>
			{!release ? (
				<>
					<Spacer space={12} />
					<Typography variant="body2" color="text.secondary">
						Создайте или прикрепите релиз, чтобы распределять задачи и задавать
						версии образов.
					</Typography>
				</>
			) : (
				<>
					<Spacer space={16} />
					<Typography variant="subtitle2">
						{kanbanBoardTaskReleaseLabel(release)}
					</Typography>
					<Spacer space={8} />
					<TextField
						size="small"
						label="Название"
						value={name}
						onChange={(event) => setName(event.target.value)}
					/>
					<Spacer space={8} />
					<TextField
						size="small"
						select
						label="Статус"
						value={status}
						onChange={(event) =>
							setStatus(event.target.value as KanbanBoardReleaseStatusId)
						}
					>
						{KANBAN_BOARD_RELEASE_STATUSES.map((item) => (
							<MenuItem key={item.id} value={item.id}>
								{item.title}
							</MenuItem>
						))}
					</TextField>
					<Spacer space={8} />
					<Flex gap={8}>
						<TextField
							size="small"
							type="date"
							label="Начало"
							InputLabelProps={{ shrink: true }}
							value={startDate}
							onChange={(event) => setStartDate(event.target.value)}
						/>
						<TextField
							size="small"
							type="date"
							label="Окончание"
							InputLabelProps={{ shrink: true }}
							value={endDate}
							onChange={(event) => setEndDate(event.target.value)}
						/>
					</Flex>
					<Spacer space={8} />
					<TextField
						size="small"
						select
						label="Суперспринт"
						value={supersprintId}
						onChange={(event) => setSupersprintId(event.target.value)}
					>
						<MenuItem value="">—</MenuItem>
						{supersprints.map((item) => (
							<MenuItem key={item.id} value={item.id}>
								{item.code} — {item.name}
							</MenuItem>
						))}
					</TextField>
					<Spacer space={8} />
					<TextField
						size="small"
						select
						label="Спринт"
						value={sprintId}
						onChange={(event) => setSprintId(event.target.value)}
					>
						<MenuItem value="">—</MenuItem>
						{sprints.map((item) => (
							<MenuItem key={item.id} value={item.id}>
								{item.code} — {item.name}
							</MenuItem>
						))}
					</TextField>
					<Spacer space={12} />
					<Typography variant="subtitle2">Версии образов</Typography>
					<Spacer space={8} />
					{imageFields.map((target) => (
						<Flex key={target.id} flexDirection="column">
							<TextField
								size="small"
								label={target.label}
								value={imageVersions[target.id] ?? ""}
								onChange={(event) =>
									setImageVersions((prev) => ({
										...prev,
										[target.id]: event.target.value,
									}))
								}
							/>
							<Spacer space={8} />
						</Flex>
					))}
					<Button variant="contained" onClick={() => void saveRelease()}>
						Сохранить релиз
					</Button>
					<Spacer space={8} />
					<Button
						color="warning"
						variant="outlined"
						disabled={removeRelease.isPending}
						onClick={() => void unlinkRelease()}
						title="Релиз останется в реестре, но выйдет из этого планирования"
					>
						Открепить от планирования
					</Button>
					<Spacer space={16} />
					<Typography variant="subtitle2">
						Задачи релиза ({releaseTasks.length})
					</Typography>
					<Spacer space={8} />
					<Card padding="0" height="420px" overflow="hidden">
						<TrackerRegistryGrid<KanbanBoardReleaseTaskDto>
							gridStateKey="tracker.planning.release-tasks"
							rowData={releaseTasks}
							columnDefs={releaseTaskColumns}
							pagination={false}
							showRowTintToggle
							getRowId={(params) =>
								params.data ? `task:${params.data.taskId}` : "release-task"
							}
							getRowStyle={(
								params: RowClassParams<KanbanBoardReleaseTaskDto>,
							) => {
								const task = params.data?.task;
								if (!task) return undefined;
								return trackerTaskRowTintStyle({
									statusId: task.parentId,
									hasBlocker:
										kanbanBoardTaskHasBlocker(task.content) || task.hasBlocker,
								});
							}}
							onRowDoubleClick={(row) =>
								navigate(trackerTaskPath(row.task.taskKey))
							}
							onCellValueChanged={(row, field) => {
								if (field && isPlanningTaskPersistColId(field)) {
									void persistTask(row.task);
								}
							}}
							contextActions={[
								{
									label: "Убрать из релиза",
									onClick: (row) => {
										void detachTask
											.mutateAsync({
												releaseId: row.releaseId,
												taskId: row.taskId,
											})
											.catch((error) => toast.error(apiErrorMessage(error)));
									},
								},
							]}
						/>
					</Card>
				</>
			)}
			{conflictDialog}
		</Flex>
	);
}
