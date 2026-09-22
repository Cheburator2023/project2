import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import type {
	ColDef,
	ICellRendererParams,
	IRowNode,
	RowClassParams,
	RowDragEndEvent,
} from "ag-grid-community";
import { Flex } from "@react-client/common/primitives/Flex";
import { toast } from "@react-client/common/toasts";
import { apiErrorMessage } from "@react-client/common/api/helpers/apiErrorMessage";
import {
	useCreateKanbanBoardReleaseTheme,
	useDeleteKanbanBoardReleaseTheme,
	useDetachKanbanBoardPlanningTask,
	useMoveKanbanBoardReleaseTask,
	useReorderKanbanBoardPlanningTasks,
	useUpdateKanbanBoardReleaseTheme,
} from "@react-client/common/api/queries/kanban-board";
import { KanbanTaskFieldChip } from "@react-client/features/kanban-board/components/KanbanTaskSelectField";
import { trackerTaskPath } from "@react-client/features/kanban-board/kanban-task-paths";
import { TrackerRegistryChipCell } from "@react-client/features/tracker/components/TrackerRegistryChipCell";
import { TrackerRegistryGrid } from "@react-client/features/tracker/components/TrackerRegistryGrid";
import { trackerTaskRowTintStyle } from "@react-client/features/tracker/components/TrackerTaskFieldChips";
import { isPlanningTaskPersistColId } from "@react-client/features/tracker/planning/planningTaskCellEdit";
import { createPlanningTaskFieldColDefs } from "@react-client/features/tracker/planning/planningTaskFieldColumns";
import { usePlanningWorkspace } from "@react-client/features/tracker/planning/PlanningWorkspaceContext";
import { usePlanningTaskGridEdits } from "@react-client/features/tracker/planning/usePlanningTaskGridEdits";
import {
	buildPlanningTaskGridRows,
	groupPlanningTasksByTheme,
	kanbanBoardTaskReleaseLabel,
	KANBAN_BOARD_PLANNING_UNTHEMED_ID,
	KANBAN_BOARD_RELEASE_CHIP_COLOR,
	KANBAN_BOARD_RELEASE_THEME_COLORS,
	nextKanbanBoardReleaseThemeColor,
	planningTaskGridRowId,
	kanbanBoardTaskHasBlocker,
	type KanbanBoardReleaseTaskDto,
	type PlanningTaskGridRow,
	type PlanningTaskGridTaskRow,
	type PlanningTaskGridThemeRow,
} from "@smart-anketa/api-contract";
import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router";

type GridRow = PlanningTaskGridRow<KanbanBoardReleaseTaskDto>;
type ThemeRow = PlanningTaskGridThemeRow<KanbanBoardReleaseTaskDto>;
type TaskRow = PlanningTaskGridTaskRow<KanbanBoardReleaseTaskDto>;

function isTaskRow(row: GridRow): row is TaskRow {
	return row.rowKind === "task";
}

function isThemeRow(row: GridRow): row is ThemeRow {
	return row.rowKind === "theme";
}

const PLANNING_RELEASE_CHIP_COLORS = [
	KANBAN_BOARD_RELEASE_CHIP_COLOR,
	...KANBAN_BOARD_RELEASE_THEME_COLORS,
] as const;

function planningReleaseChipColor(index: number): string {
	return (
		PLANNING_RELEASE_CHIP_COLORS[index % PLANNING_RELEASE_CHIP_COLORS.length] ??
		KANBAN_BOARD_RELEASE_CHIP_COLOR
	);
}

function collectTaskRows(rows: GridRow[]): TaskRow[] {
	return rows.filter(isTaskRow);
}

function taskReleaseIds(row: TaskRow): string[] {
	if (row.releaseIds?.length) return row.releaseIds;
	return row.releaseId ? [row.releaseId] : [];
}

function themeIdFromOverNode(
	node: IRowNode<GridRow> | undefined | null,
): string | null | undefined {
	const data = node?.data;
	if (!data) return undefined;
	return data.themeId;
}

function GroupTitleRenderer(params: ICellRendererParams<GridRow>) {
	const row = params.data;
	const label =
		(typeof params.value === "string" && params.value) ||
		(row && isThemeRow(row) ? row.title : row?.task.taskKey) ||
		"";
	if (!row || !isThemeRow(row)) return label;
	return (
		<span
			style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
			title={row.title}
		>
			<span
				style={{
					width: 8,
					height: 8,
					borderRadius: 99,
					background: row.color,
					flexShrink: 0,
				}}
			/>
			{label}
		</span>
	);
}

export function PlanningTasksPanel() {
	const navigate = useNavigate();
	const { planning } = usePlanningWorkspace();
	const createTheme = useCreateKanbanBoardReleaseTheme();
	const updateTheme = useUpdateKanbanBoardReleaseTheme();
	const deleteTheme = useDeleteKanbanBoardReleaseTheme();
	const detachTask = useDetachKanbanBoardPlanningTask();
	const reorder = useReorderKanbanBoardPlanningTasks();
	const moveTask = useMoveKanbanBoardReleaseTask();
	const { lookups, persistTask, conflictDialog } = usePlanningTaskGridEdits();
	const [groupName, setGroupName] = useState("");
	const [selectedRows, setSelectedRows] = useState<GridRow[]>([]);
	const selectedTasks = collectTaskRows(selectedRows);

	const releaseById = useMemo(
		() => new Map(planning.releases.map((item) => [item.id, item])),
		[planning.releases],
	);
	const releaseLabels = useMemo(
		() => planning.releases.map((item) => kanbanBoardTaskReleaseLabel(item)),
		[planning.releases],
	);
	const releaseColorById = useMemo(
		() =>
			new Map(
				planning.releases.map((item, index) => [
					item.id,
					planningReleaseChipColor(index),
				]),
			),
		[planning.releases],
	);
	const resolveReleaseId = useCallback(
		(value: unknown) => {
			const raw = String(value ?? "").trim();
			if (!raw) return "";
			if (releaseById.has(raw)) return raw;
			const match = planning.releases.find(
				(item) => kanbanBoardTaskReleaseLabel(item) === raw,
			);
			return match?.id ?? "";
		},
		[planning.releases, releaseById],
	);

	const rowData = useMemo(
		() => buildPlanningTaskGridRows(planning.tasks, planning.themes),
		[planning.tasks, planning.themes],
	);

	const persistTheme = async (taskId: string, themeId: string | null) => {
		const next = planning.tasks.map((item) =>
			item.taskId === taskId ? { ...item, themeId } : item,
		);
		const grouped = groupPlanningTasksByTheme(next, planning.themes);
		const items = grouped.flatMap((column) =>
			column.items.map((item, position) => ({
				taskId: item.taskId,
				themeId:
					column.id === KANBAN_BOARD_PLANNING_UNTHEMED_ID ? null : column.id,
				position,
			})),
		);
		await reorder.mutateAsync({
			planningId: planning.id,
			data: { items },
		});
	};

	const detachRows = async (rows: GridRow[]) => {
		const tasks = collectTaskRows(rows);
		if (!tasks.length) return;
		try {
			for (const item of tasks) {
				await detachTask.mutateAsync({
					planningId: planning.id,
					taskId: item.taskId,
				});
			}
		} catch (error) {
			toast.error(apiErrorMessage(error));
		}
	};

	const autoGroupColumnDef = useMemo<ColDef<GridRow>>(
		() => ({
			colId: "groupTitle",
			headerName: "Группа",
			minWidth: 220,
			flex: 1.2,
			sortable: false,
			rowDrag: (params) => Boolean(params.data && isTaskRow(params.data)),
			editable: (params) =>
				Boolean(params.data && isThemeRow(params.data) && params.data.themeId),
			valueGetter: (params) => {
				const row = params.data;
				if (!row) return "";
				return isThemeRow(row) ? row.title : row.task.taskKey;
			},
			valueSetter: (params) => {
				const row = params.data;
				if (!row || !isThemeRow(row) || !row.themeId) return false;
				row.title = String(params.newValue ?? "").trim();
				return true;
			},
			cellRendererParams: {
				innerRenderer: GroupTitleRenderer,
			},
		}),
		[],
	);

	const columnDefs = useMemo<ColDef<GridRow>[]>(() => {
		const releaseCol: ColDef<GridRow> = {
			colId: "releaseId",
			headerName: "Релиз",
			flex: 1.1,
			minWidth: 160,
			editable: (params) =>
				Boolean(
					params.data &&
						isTaskRow(params.data) &&
						taskReleaseIds(params.data).length === 1 &&
						releaseLabels.length,
				),
			cellEditor: "agSelectCellEditor",
			cellEditorParams: { values: releaseLabels },
			valueGetter: (params) => {
				if (!params.data || !isTaskRow(params.data)) return "";
				const ids = taskReleaseIds(params.data);
				return ids.length === 1 ? ids[0] : "";
			},
			valueSetter: (params) => {
				const row = params.data;
				if (!row || !isTaskRow(row) || taskReleaseIds(row).length !== 1) {
					return false;
				}
				const nextId = resolveReleaseId(params.newValue);
				if (!nextId) return false;
				row.releaseId = nextId;
				row.releaseIds = [nextId];
				return true;
			},
			valueFormatter: (params) => {
				if (!params.data || !isTaskRow(params.data)) return "";
				return taskReleaseIds(params.data)
					.map((id) => {
						const release = releaseById.get(id);
						return release ? kanbanBoardTaskReleaseLabel(release) : "";
					})
					.filter(Boolean)
					.join(", ");
			},
			cellRenderer: (params: ICellRendererParams<GridRow>) => {
				if (!params.data || !isTaskRow(params.data)) return null;
				const releases = taskReleaseIds(params.data)
					.map((id) => releaseById.get(id))
					.filter((release) => Boolean(release));
				if (!releases.length) return null;
				return (
					<TrackerRegistryChipCell>
						{releases.map((release) => {
							if (!release) return null;
							const label = kanbanBoardTaskReleaseLabel(release);
							return (
								<span key={release.id} title={label}>
									<KanbanTaskFieldChip
										label={label}
										color={
											releaseColorById.get(release.id) ??
											KANBAN_BOARD_RELEASE_CHIP_COLOR
										}
									/>
								</span>
							);
						})}
					</TrackerRegistryChipCell>
				);
			},
		};
		const taskCols = createPlanningTaskFieldColDefs<GridRow>({
			getTask: (row) => (row && isTaskRow(row) ? row.task : undefined),
			lookups,
		});
		const titleIndex = taskCols.findIndex((col) => col.colId === "title");
		if (titleIndex < 0) return [releaseCol, ...taskCols];
		return [
			...taskCols.slice(0, titleIndex + 1),
			releaseCol,
			...taskCols.slice(titleIndex + 1),
		];
	}, [
		lookups,
		planning.releases,
		releaseById,
		releaseColorById,
		releaseLabels,
		resolveReleaseId,
	]);

	return (
		<Flex
			flexDirection="column"
			height="100%"
			minHeight="0"
			padding="8px"
			gap={8}
		>
			<Flex gap={8} alignItems="center">
				<TextField
					size="small"
					placeholder="Новая группа"
					value={groupName}
					onChange={(event) => setGroupName(event.target.value)}
					fullWidth
				/>
				<Button
					variant="outlined"
					disabled={createTheme.isPending}
					onClick={async () => {
						const name =
							groupName.trim() || `Группа ${planning.themes.length + 1}`;
						try {
							await createTheme.mutateAsync({
								planningId: planning.id,
								data: {
									name,
									color: nextKanbanBoardReleaseThemeColor(
										planning.themes.length,
									),
								},
							});
							setGroupName("");
						} catch (error) {
							toast.error(apiErrorMessage(error));
						}
					}}
					title="Добавить группу в планирование"
				>
					Добавить
				</Button>
				<Button
					variant="outlined"
					color="error"
					disabled={!selectedTasks.length || detachTask.isPending}
					onClick={() => void detachRows(selectedTasks)}
					title="Убрать выбранные задачи из планирования"
				>
					Убрать
					{selectedTasks.length ? ` (${selectedTasks.length})` : ""}
				</Button>
			</Flex>
			<Flex flexGrow={1} minHeight="0">
				<TrackerRegistryGrid<GridRow>
					gridStateKey="tracker.planning.tasks"
					rowData={rowData}
					columnDefs={columnDefs}
					autoGroupColumnDef={autoGroupColumnDef}
					treeData
					treeDataChildrenField="children"
					pagination={false}
					showRowTintToggle
					onSelectionChange={setSelectedRows}
					getRowId={(params) =>
						params.data ? planningTaskGridRowId(params.data) : "planning-row"
					}
					isRowSelectable={(node) => Boolean(node.data && isTaskRow(node.data))}
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
					onRowDoubleClick={(row) => {
						if (isTaskRow(row)) navigate(trackerTaskPath(row.task.taskKey));
					}}
					onCellValueChanged={(row, field, value, oldValue) => {
						if (isTaskRow(row) && field === "releaseId") {
							const nextReleaseId = row.releaseId || resolveReleaseId(value);
							const fromReleaseId = resolveReleaseId(oldValue);
							if (
								!nextReleaseId ||
								!fromReleaseId ||
								nextReleaseId === fromReleaseId
							)
								return;
							void moveTask
								.mutateAsync({
									releaseId: fromReleaseId,
									taskId: row.taskId,
									data: {
										targetReleaseId: nextReleaseId,
										themeId: row.themeId,
									},
								})
								.catch((error) => toast.error(apiErrorMessage(error)));
							return;
						}
						if (isTaskRow(row) && field && isPlanningTaskPersistColId(field)) {
							void persistTask(row.task);
							return;
						}
						if (!isThemeRow(row) || !row.themeId || field !== "groupTitle")
							return;
						const next = String(value ?? "").trim();
						const current = planning.themes.find(
							(theme) => theme.id === row.themeId,
						)?.name;
						if (!next || next === current) return;
						void updateTheme
							.mutateAsync({
								planningId: planning.id,
								themeId: row.themeId,
								data: { name: next },
							})
							.catch((error) => toast.error(apiErrorMessage(error)));
					}}
					onRowDragEnd={(event: RowDragEndEvent<GridRow>) => {
						const dragged = event.node.data;
						if (!dragged || !isTaskRow(dragged)) return;
						const nextThemeId = themeIdFromOverNode(event.overNode);
						if (nextThemeId === undefined) return;
						if (dragged.themeId === nextThemeId) return;
						void persistTheme(dragged.taskId, nextThemeId).catch((error) =>
							toast.error(apiErrorMessage(error)),
						);
					}}
					contextActions={[
						{
							label: "Удалить группу",
							disabled: (row) => !isThemeRow(row) || !row.themeId,
							onClick: (row) => {
								if (!isThemeRow(row) || !row.themeId) return;
								void deleteTheme
									.mutateAsync({
										planningId: planning.id,
										themeId: row.themeId,
									})
									.catch((error) => toast.error(apiErrorMessage(error)));
							},
						},
					]}
					bulkContextActions={[
						{
							label: "Убрать из планирования",
							disabled: (rows) => collectTaskRows(rows).length === 0,
							onClick: (rows) => {
								void detachRows(rows);
							},
						},
					]}
				/>
			</Flex>
			{conflictDialog}
		</Flex>
	);
}
