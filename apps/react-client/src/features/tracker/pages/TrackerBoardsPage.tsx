import type { ColDef, ICellRendererParams } from "ag-grid-community";
import {
	useCreateKanbanBoardBoard,
	useDeleteKanbanBoardBoard,
	useKanbanBoardBoards,
	useKanbanBoardProjects,
	useUpdateKanbanBoardBoard,
} from "@react-client/common/api/queries/kanban-board";
import { apiErrorMessage } from "@react-client/common/api/helpers/apiErrorMessage";
import { toast } from "@react-client/common/toasts";
import {
	TrackerProjectChips,
	TrackerRegistryChip,
	TrackerRegistryChipCell,
	trackerProjectFilterText,
} from "@react-client/features/tracker/components/TrackerRegistryChipCell";
import { TrackerRegistryPage } from "@react-client/features/tracker/components/TrackerRegistryPage";
import { trackerDateFormatter } from "@react-client/features/tracker/components/TrackerRegistryGrid";
import { useTrackerEditIdentity } from "@react-client/features/tracker/hooks/useTrackerEditIdentity";
import {
	trackerBoardFormFields,
	trackerBoardFormValues,
	trackerBoardProjectOptions,
	trackerBoardWritePayload,
} from "@react-client/features/tracker/trackerBoardForm";
import type { KanbanBoardBoardDto } from "@smart-anketa/api-contract";
import { useMemo } from "react";
import { useNavigate } from "react-router";
import {
	trackerBoardPath,
	trackerBoardHistoryPath,
} from "@react-client/features/kanban-board/kanban-task-paths";

export function TrackerBoardsPage() {
	const navigate = useNavigate();
	const { data = [], isLoading } = useKanbanBoardBoards();
	const { data: projects = [] } = useKanbanBoardProjects();
	const createBoard = useCreateKanbanBoardBoard();
	const updateBoard = useUpdateKanbanBoardBoard();
	const deleteBoard = useDeleteKanbanBoardBoard();
	const createdBy = useTrackerEditIdentity();

	const projectOptions = useMemo(
		() => trackerBoardProjectOptions(projects),
		[projects],
	);
	const formFields = useMemo(
		() => trackerBoardFormFields(projectOptions),
		[projectOptions],
	);

	const columnDefs = useMemo<ColDef<KanbanBoardBoardDto>[]>(
		() => [
			{
				colId: "project",
				headerName: "Проект",
				flex: 1.2,
				minWidth: 200,
				valueGetter: (params) =>
					trackerProjectFilterText({
						projectCode: params.data?.projectCode,
						projectName: params.data?.projectName,
					}),
				cellRenderer: (params: ICellRendererParams<KanbanBoardBoardDto>) =>
					params.data ? (
						<TrackerProjectChips
							projectCode={params.data.projectCode}
							projectName={params.data.projectName}
						/>
					) : null,
			},
			{ field: "name", headerName: "Доска", flex: 1.2, minWidth: 160 },
			{ field: "boardKey", headerName: "Ключ", width: 160 },
			{
				field: "taskCount",
				headerName: "Задач",
				width: 100,
				type: "numericColumn",
			},
			{
				field: "blockerCount",
				headerName: "Блокеры",
				width: 110,
				type: "numericColumn",
				cellRenderer: (params: ICellRendererParams<KanbanBoardBoardDto>) => {
					const count = params.data?.blockerCount ?? 0;
					if (!count) return null;
					return (
						<TrackerRegistryChipCell>
							<TrackerRegistryChip
								label={String(count)}
								color="error"
								title={`Задач с блокером: ${count}`}
							/>
						</TrackerRegistryChipCell>
					);
				},
			},
			{
				field: "description",
				headerName: "Описание",
				flex: 1.5,
				minWidth: 180,
			},
			{
				field: "createdBy",
				headerName: "Создал",
				minWidth: 140,
				width: 160,
				valueGetter: (params) => params.data?.createdBy ?? "",
			},
			{
				field: "createdAt",
				headerName: "Создано",
				minWidth: 170,
				valueFormatter: (params) => trackerDateFormatter(params.value),
			},
			{
				field: "updatedAt",
				headerName: "Обновлено",
				minWidth: 170,
				valueFormatter: (params) => trackerDateFormatter(params.value),
			},
		],
		[],
	);

	return (
		<TrackerRegistryPage
			gridStateKey="tracker.boards"
			title="доска"
			createLabel="Создать доску"
			searchPlaceholder="Поиск по проекту, названию, ключу…"
			rowData={data}
			columnDefs={columnDefs}
			loading={isLoading}
			formFields={formFields}
			getInitialFormValues={(row): Record<string, string> =>
				row ? trackerBoardFormValues(row) : { sortOrder: "0" }
			}
			onRowDoubleClick={(row) => navigate(trackerBoardPath(row.boardKey))}
			contextActions={[
				{
					label: "Открыть kanban",
					onClick: (row) => navigate(trackerBoardPath(row.boardKey)),
				},
				{
					label: "История изменений",
					onClick: (row) => navigate(trackerBoardHistoryPath(row.boardKey)),
				},
			]}
			deleteDialogTitle="Удаление досок"
			deleteDialogText={(count) =>
				`Удалить ${count} доск(и/у)? Задачи на них тоже удалятся.`
			}
			onCreate={async (values) => {
				try {
					await createBoard.mutateAsync({
						...trackerBoardWritePayload(values),
						createdBy: createdBy || null,
					});
				} catch (error) {
					toast.error(apiErrorMessage(error));
					throw error;
				}
			}}
			onUpdate={async (row, values) => {
				try {
					await updateBoard.mutateAsync({
						id: row.id,
						data: trackerBoardWritePayload(values),
					});
				} catch (error) {
					toast.error(apiErrorMessage(error));
					throw error;
				}
			}}
			onDelete={async (rows) => {
				for (const row of rows) {
					await deleteBoard.mutateAsync(row.id);
				}
			}}
		/>
	);
}
