import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import type {
	ColDef,
	ICellRendererParams,
	IRowNode,
	RowDragEndEvent,
} from "ag-grid-community";
import { Flex } from "@react-client/common/primitives/Flex";
import { toast } from "@react-client/common/toasts";
import { apiErrorMessage } from "@react-client/common/api/helpers/apiErrorMessage";
import {
	useCreateKanbanBoardReleaseTheme,
	useDeleteKanbanBoardReleaseTheme,
	useDetachKanbanBoardReleaseTask,
	useReorderKanbanBoardReleaseTasks,
	useUpdateKanbanBoardReleaseTheme,
} from "@react-client/common/api/queries/kanban-board";
import { TrackerRegistryGrid } from "@react-client/features/tracker/components/TrackerRegistryGrid";
import { trackerTaskPath } from "@react-client/features/kanban-board/kanban-task-paths";
import { usePlanningWorkspace } from "@react-client/features/tracker/planning/PlanningWorkspaceContext";
import {
	buildPlanningTaskGridRows,
	groupPlanningTasksByTheme,
	kanbanBoardSubtasksProgress,
	KANBAN_BOARD_PLANNING_UNTHEMED_ID,
	nextKanbanBoardReleaseThemeColor,
	planningTaskGridRowId,
	type KanbanBoardReleaseTaskDto,
	type PlanningTaskGridRow,
	type PlanningTaskGridTaskRow,
	type PlanningTaskGridThemeRow,
} from "@smart-anketa/api-contract";
import { useMemo, useState } from "react";
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

function collectTaskRows(rows: GridRow[]): TaskRow[] {
	return rows.filter(isTaskRow);
}

function themeIdFromOverNode(node: IRowNode<GridRow> | undefined | null) {
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
	const detachTask = useDetachKanbanBoardReleaseTask();
	const reorder = useReorderKanbanBoardReleaseTasks();
	const [groupName, setGroupName] = useState("");
	const [selectedRows, setSelectedRows] = useState<GridRow[]>([]);
	const selectedTasks = collectTaskRows(selectedRows);

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
			releaseId: planning.releaseId,
			data: { items },
		});
	};

	const detachRows = async (rows: GridRow[]) => {
		const tasks = collectTaskRows(rows);
		if (!tasks.length) return;
		try {
			for (const item of tasks) {
				await detachTask.mutateAsync({
					releaseId: planning.releaseId,
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

	const columnDefs = useMemo<ColDef<GridRow>[]>(
		() => [
			{
				colId: "title",
				headerName: "Название",
				flex: 1.4,
				minWidth: 180,
				valueGetter: (params) =>
					params.data && isTaskRow(params.data) ? params.data.task.title : "",
			},
			{
				colId: "assignee",
				headerName: "Исполнитель",
				width: 150,
				valueGetter: (params) => {
					if (!params.data || !isTaskRow(params.data)) return "";
					return (
						params.data.task.currentAssigneeTitle ||
						params.data.task.assigneeTitle ||
						""
					);
				},
			},
			{
				colId: "priority",
				headerName: "Приоритет",
				width: 120,
				valueGetter: (params) =>
					params.data && isTaskRow(params.data)
						? (params.data.task.priorityTitle ?? "")
						: "",
			},
			{
				colId: "status",
				headerName: "Статус",
				width: 160,
				valueGetter: (params) =>
					params.data && isTaskRow(params.data)
						? (params.data.task.statusTitle ?? "")
						: "",
			},
			{
				colId: "progress",
				headerName: "Прогресс",
				width: 110,
				valueGetter: (params) => {
					if (!params.data || !isTaskRow(params.data)) return "";
					const progress = kanbanBoardSubtasksProgress(
						params.data.task.content,
					);
					if (!progress) return "";
					return `${progress.done}/${progress.total}`;
				},
			},
			{
				colId: "dueDate",
				headerName: "Срок",
				width: 110,
				valueGetter: (params) =>
					params.data && isTaskRow(params.data)
						? (params.data.task.dueDate ?? "")
						: "",
			},
			{
				colId: "estimate",
				headerName: "Оценка, чд",
				width: 110,
				type: "numericColumn",
				valueGetter: (params) => {
					if (!params.data || !isTaskRow(params.data)) return "";
					return (
						params.data.task.effectiveEstimatePd ??
						params.data.task.estimatePd
					);
				},
			},
		],
		[],
	);

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
					label="Новая группа"
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
								releaseId: planning.releaseId,
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
					onSelectionChange={setSelectedRows}
					getRowId={(params) =>
						params.data ? planningTaskGridRowId(params.data) : "planning-row"
					}
					isRowSelectable={(node) => Boolean(node.data && isTaskRow(node.data))}
					onRowDoubleClick={(row) => {
						if (isTaskRow(row)) navigate(trackerTaskPath(row.task.taskKey));
					}}
					onCellValueChanged={(row, field, value) => {
						if (!isThemeRow(row) || !row.themeId || field !== "groupTitle")
							return;
						const next = String(value ?? "").trim();
						const current = planning.themes.find(
							(theme) => theme.id === row.themeId,
						)?.name;
						if (!next || next === current) return;
						void updateTheme
							.mutateAsync({
								releaseId: planning.releaseId,
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
										releaseId: planning.releaseId,
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
		</Flex>
	);
}
