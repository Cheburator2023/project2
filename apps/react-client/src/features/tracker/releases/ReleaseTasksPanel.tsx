import Button from "@mui/material/Button";
import type { ColDef, RowClassParams } from "ag-grid-community";
import { Flex } from "@react-client/common/primitives/Flex";
import { toast } from "@react-client/common/toasts";
import { apiErrorMessage } from "@react-client/common/api/helpers/apiErrorMessage";
import { useDetachKanbanBoardReleaseTask } from "@react-client/common/api/queries/kanban-board";
import { trackerTaskPath } from "@react-client/features/kanban-board/kanban-task-paths";
import { TrackerRegistryGrid } from "@react-client/features/tracker/components/TrackerRegistryGrid";
import { trackerTaskRowTintStyle } from "@react-client/features/tracker/components/TrackerTaskFieldChips";
import { isPlanningTaskPersistColId } from "@react-client/features/tracker/planning/planningTaskCellEdit";
import { createPlanningTaskFieldColDefs } from "@react-client/features/tracker/planning/planningTaskFieldColumns";
import { usePlanningTaskGridEdits } from "@react-client/features/tracker/planning/usePlanningTaskGridEdits";
import { useReleaseWorkspace } from "@react-client/features/tracker/releases/ReleaseWorkspaceContext";
import {
	kanbanBoardTaskHasBlocker,
	type KanbanBoardReleaseTaskDto,
} from "@smart-anketa/api-contract";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router";

export function ReleaseTasksPanel() {
	const navigate = useNavigate();
	const release = useReleaseWorkspace();
	const detachTask = useDetachKanbanBoardReleaseTask();
	const { lookups, persistTask, conflictDialog } = usePlanningTaskGridEdits();
	const [selected, setSelected] = useState<KanbanBoardReleaseTaskDto[]>([]);

	const columnDefs = useMemo<ColDef<KanbanBoardReleaseTaskDto>[]>(
		() =>
			createPlanningTaskFieldColDefs<KanbanBoardReleaseTaskDto>({
				getTask: (row) => row?.task,
				lookups,
			}),
		[lookups],
	);

	const detachRows = async (rows: KanbanBoardReleaseTaskDto[]) => {
		if (!rows.length) return;
		try {
			for (const row of rows) {
				await detachTask.mutateAsync({
					releaseId: row.releaseId,
					taskId: row.taskId,
				});
			}
		} catch (error) {
			toast.error(apiErrorMessage(error));
		}
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
					color="error"
					disabled={!selected.length || detachTask.isPending}
					onClick={() => void detachRows(selected)}
					title="Убрать выбранные задачи из релиза"
				>
					Убрать
					{selected.length ? ` (${selected.length})` : ""}
				</Button>
			</Flex>
			<Flex flexGrow={1} minHeight="0">
				<TrackerRegistryGrid<KanbanBoardReleaseTaskDto>
					gridStateKey="tracker.release.tasks"
					rowData={release.tasks}
					columnDefs={columnDefs}
					pagination={false}
					showRowTintToggle
					onSelectionChange={setSelected}
					getRowId={(params) => params.data?.taskId ?? "release-task"}
					getRowStyle={(params: RowClassParams<KanbanBoardReleaseTaskDto>) => {
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
							onClick: (row) => void detachRows([row]),
						},
					]}
					bulkContextActions={[
						{
							label: "Убрать из релиза",
							onClick: (rows) => void detachRows(rows),
						},
					]}
				/>
			</Flex>
			{conflictDialog}
		</Flex>
	);
}
