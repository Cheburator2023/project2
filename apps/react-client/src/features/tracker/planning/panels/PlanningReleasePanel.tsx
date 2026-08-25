import Button from "@mui/material/Button";
import type {
	ColDef,
	ICellRendererParams,
	RowClassParams,
} from "ag-grid-community";
import { Flex } from "@react-client/common/primitives/Flex";
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
import { trackerTaskPath } from "@react-client/features/kanban-board/kanban-task-paths";
import { TrackerRegistryGrid } from "@react-client/features/tracker/components/TrackerRegistryGrid";
import { trackerTaskRowTintStyle } from "@react-client/features/tracker/components/TrackerTaskFieldChips";
import { isPlanningTaskPersistColId } from "@react-client/features/tracker/planning/planningTaskCellEdit";
import { createPlanningTaskFieldColDefs } from "@react-client/features/tracker/planning/planningTaskFieldColumns";
import { usePlanningWorkspace } from "@react-client/features/tracker/planning/PlanningWorkspaceContext";
import { usePlanningTaskGridEdits } from "@react-client/features/tracker/planning/usePlanningTaskGridEdits";
import {
	PlanningReleaseAttachDialog,
	PlanningReleaseCreateDialog,
	PlanningReleaseSettingsDialog,
} from "@react-client/features/tracker/planning/panels/PlanningReleaseModals";
import {
	buildPlanningReleaseTaskGridRows,
	kanbanBoardTaskHasBlocker,
	kanbanBoardTaskReleaseLabel,
	planningReleaseGridRowId,
	type KanbanBoardReleaseTaskDto,
	type PlanningReleaseGridRow,
	type PlanningReleaseGridReleaseRow,
	type PlanningReleaseGridTaskRow,
} from "@smart-anketa/api-contract";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router";

type GridRow = PlanningReleaseGridRow<KanbanBoardReleaseTaskDto>;
type ReleaseRow = PlanningReleaseGridReleaseRow<KanbanBoardReleaseTaskDto>;
type TaskRow = PlanningReleaseGridTaskRow<KanbanBoardReleaseTaskDto>;

function isTaskRow(row: GridRow): row is TaskRow {
	return row.rowKind === "task";
}

function isReleaseRow(row: GridRow): row is ReleaseRow {
	return row.rowKind === "release";
}

function releaseIdFromRow(row: GridRow | undefined): string | null {
	if (!row) return null;
	return row.releaseId || null;
}

function GroupTitleRenderer(params: ICellRendererParams<GridRow>) {
	const row = params.data;
	if (row && isReleaseRow(row)) {
		const count = row.children.length;
		const label = `${row.title}${count ? ` (${count})` : ""}`;
		return <span title={label}>{label}</span>;
	}
	if (row && isTaskRow(row)) return row.task.taskKey;
	return typeof params.value === "string" ? params.value : "";
}

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
	const [createOpen, setCreateOpen] = useState(false);
	const [attachOpen, setAttachOpen] = useState(false);
	const [settingsOpen, setSettingsOpen] = useState(false);

	const attachOptions = useMemo(
		() =>
			availableReleases.filter(
				(item) =>
					!planning.releases.some((attached) => attached.id === item.id),
			),
		[availableReleases, planning.releases],
	);

	const rowData = useMemo(
		() => buildPlanningReleaseTaskGridRows(planning.tasks, planning.releases),
		[planning.releases, planning.tasks],
	);

	const themeById = useMemo(
		() => new Map(planning.themes.map((theme) => [theme.id, theme])),
		[planning.themes],
	);

	const autoGroupColumnDef = useMemo<ColDef<GridRow>>(
		() => ({
			colId: "groupTitle",
			headerName: "Релиз",
			minWidth: 220,
			flex: 1.2,
			sortable: false,
			editable: false,
			valueGetter: (params) => {
				const row = params.data;
				if (!row) return "";
				return isReleaseRow(row) ? row.title : row.task.taskKey;
			},
			cellRendererParams: {
				innerRenderer: GroupTitleRenderer,
			},
		}),
		[],
	);

	const columnDefs = useMemo<ColDef<GridRow>[]>(() => {
		const themeCol: ColDef<GridRow> = {
			colId: "theme",
			headerName: "Группа",
			flex: 1,
			minWidth: 120,
			valueGetter: (params) => {
				if (!params.data || !isTaskRow(params.data)) return "";
				const themeId = params.data.themeId;
				if (!themeId) return "Без группы";
				return themeById.get(themeId)?.name ?? "Без группы";
			},
		};
		const taskCols = createPlanningTaskFieldColDefs<GridRow>({
			getTask: (row) => (row && isTaskRow(row) ? row.task : undefined),
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

	const openSettings = (releaseId: string) => {
		if (!releaseId) return;
		setActiveReleaseId(releaseId);
		setSettingsOpen(true);
	};

	return (
		<Flex
			flexDirection="column"
			height="100%"
			minHeight="0"
			padding="8px"
			gap={8}
		>
			<Flex gap={8} alignItems="center">
				<Button
					variant="outlined"
					onClick={() => setCreateOpen(true)}
					title="Создать новый релиз и прикрепить к планированию"
				>
					Создать
				</Button>
				<Button
					variant="outlined"
					onClick={() => setAttachOpen(true)}
					title="Прикрепить существующий релиз к планированию"
				>
					Прикрепить
				</Button>
				<Button
					variant="outlined"
					disabled={!release}
					onClick={() => {
						if (release) setSettingsOpen(true);
					}}
					title={
						release
							? `Настройки: ${kanbanBoardTaskReleaseLabel(release)}`
							: "Сначала создайте или прикрепите релиз"
					}
				>
					Настройки
				</Button>
			</Flex>
			<Flex flexGrow={1} minHeight="0">
				<TrackerRegistryGrid<GridRow>
					gridStateKey="tracker.planning.release-tasks"
					rowData={rowData}
					columnDefs={columnDefs}
					autoGroupColumnDef={autoGroupColumnDef}
					treeData
					treeDataChildrenField="children"
					pagination={false}
					showRowTintToggle
					getRowId={(params) =>
						params.data
							? planningReleaseGridRowId(params.data)
							: "planning-release-row"
					}
					isRowSelectable={(node) => {
						const row = node.data;
						if (!row) return false;
						if (isReleaseRow(row)) return Boolean(row.releaseId);
						return isTaskRow(row);
					}}
					getRowStyle={(params: RowClassParams<GridRow>) => {
						const row = params.data;
						if (!row || !isTaskRow(row)) return undefined;
						return trackerTaskRowTintStyle({
							statusId: row.task.parentId,
							hasBlocker:
								kanbanBoardTaskHasBlocker(row.task.content) ||
								row.task.hasBlocker,
						});
					}}
					onSelectionChange={(rows) => {
						const nextId = releaseIdFromRow(rows[0]);
						if (nextId) setActiveReleaseId(nextId);
					}}
					onRowDoubleClick={(row) => {
						if (isTaskRow(row)) {
							navigate(trackerTaskPath(row.task.taskKey));
							return;
						}
						if (isReleaseRow(row) && row.releaseId) {
							openSettings(row.releaseId);
						}
					}}
					onCellValueChanged={(row, field) => {
						if (isTaskRow(row) && field && isPlanningTaskPersistColId(field)) {
							void persistTask(row.task);
						}
					}}
					contextActions={[
						{
							label: "Настройки релиза",
							disabled: (row) => !releaseIdFromRow(row),
							onClick: (row) => {
								const releaseId = releaseIdFromRow(row);
								if (releaseId) openSettings(releaseId);
							},
						},
						{
							label: "Открепить релиз",
							disabled: (row) =>
								!isReleaseRow(row) || !row.releaseId || removeRelease.isPending,
							onClick: (row) => {
								if (!isReleaseRow(row) || !row.releaseId) return;
								void removeRelease
									.mutateAsync({
										planningId: planning.id,
										releaseId: row.releaseId,
									})
									.then(() => toast.success("Релиз откреплён от планирования"))
									.catch((error) => toast.error(apiErrorMessage(error)));
							},
						},
						{
							label: "Убрать из релиза",
							disabled: (row) => !isTaskRow(row) || detachTask.isPending,
							onClick: (row) => {
								if (!isTaskRow(row)) return;
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
			</Flex>
			<PlanningReleaseCreateDialog
				open={createOpen}
				isSubmitting={addRelease.isPending}
				onClose={() => setCreateOpen(false)}
				onCreate={async ({ code, name }) => {
					try {
						const detail = await addRelease.mutateAsync({
							planningId: planning.id,
							data: { code, name },
						});
						const previous = new Set(planning.releases.map((item) => item.id));
						const created = detail.releases.find(
							(item) => !previous.has(item.id),
						);
						if (created) setActiveReleaseId(created.id);
						setCreateOpen(false);
						toast.success("Релиз создан");
					} catch (error) {
						toast.error(apiErrorMessage(error));
					}
				}}
			/>
			<PlanningReleaseAttachDialog
				open={attachOpen}
				options={attachOptions}
				isSubmitting={addRelease.isPending}
				onClose={() => setAttachOpen(false)}
				onAttach={async (releaseId) => {
					try {
						await addRelease.mutateAsync({
							planningId: planning.id,
							data: { releaseId },
						});
						setActiveReleaseId(releaseId);
						setAttachOpen(false);
						toast.success("Релиз прикреплён");
					} catch (error) {
						toast.error(apiErrorMessage(error));
					}
				}}
			/>
			<PlanningReleaseSettingsDialog
				open={settingsOpen}
				release={release ?? null}
				sprints={sprints}
				supersprints={supersprints}
				isSaving={updateRelease.isPending}
				isUnlinking={removeRelease.isPending}
				onClose={() => setSettingsOpen(false)}
				onSave={async (input) => {
					if (!release) return;
					try {
						await updateRelease.mutateAsync({
							id: release.id,
							data: {
								name: input.name,
								status: input.status,
								startDate: input.startDate || null,
								endDate: input.endDate || null,
								supersprintId: input.supersprintId || null,
								sprintId: input.sprintId || null,
								imageVersions: input.imageVersions,
							},
						});
						setSettingsOpen(false);
						toast.success("Релиз сохранён");
					} catch (error) {
						toast.error(apiErrorMessage(error));
					}
				}}
				onUnlink={async () => {
					if (!release) return;
					try {
						await removeRelease.mutateAsync({
							planningId: planning.id,
							releaseId: release.id,
						});
						setSettingsOpen(false);
						toast.success("Релиз откреплён от планирования");
					} catch (error) {
						toast.error(apiErrorMessage(error));
					}
				}}
			/>
			{conflictDialog}
		</Flex>
	);
}
