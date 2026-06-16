import type { ColDef, ICellRendererParams } from "ag-grid-community";
import {
	useDeleteKanbanBoardTask,
	useKanbanBoardTasksRegistry,
} from "@react-client/common/api/queries/kanban-board";
import {
	TrackerBoardChips,
	TrackerProjectChips,
	trackerBoardFilterText,
	trackerProjectFilterText,
} from "@react-client/features/tracker/components/TrackerRegistryChipCell";
import { TrackerRegistryPage } from "@react-client/features/tracker/components/TrackerRegistryPage";
import { TrackerRegistryExportButton } from "@react-client/features/tracker/components/TrackerRegistryExportButton";
import { trackerDateFormatter } from "@react-client/features/tracker/components/TrackerRegistryGrid";
import { kanbanTaskEditPath } from "@react-client/features/kanban-board/kanban-task-paths";
import type { KanbanBoardTaskRegistryDto } from "@smart-anketa/api-contract";
import { useMemo } from "react";
import { useNavigate } from "react-router";

export function TrackerTasksPage() {
	const navigate = useNavigate();
	const { data = [], isLoading } = useKanbanBoardTasksRegistry();
	const deleteTask = useDeleteKanbanBoardTask();

	const openTask = (row: KanbanBoardTaskRegistryDto) => {
		navigate(kanbanTaskEditPath(row.boardId, row.id));
	};

	const columnDefs = useMemo<ColDef<KanbanBoardTaskRegistryDto>[]>(
		() => [
			{ field: "title", headerName: "Заголовок", flex: 1.2, minWidth: 180 },
			{
				colId: "project",
				headerName: "Проект",
				flex: 1.1,
				minWidth: 200,
				valueGetter: (params) =>
					trackerProjectFilterText({
						projectCode: params.data?.projectCode,
						projectName: params.data?.projectName,
					}),
				cellRenderer: (params: ICellRendererParams<KanbanBoardTaskRegistryDto>) =>
					params.data ? (
						<TrackerProjectChips
							projectCode={params.data.projectCode}
							projectName={params.data.projectName}
						/>
					) : null,
			},
			{
				colId: "board",
				headerName: "Доска",
				flex: 1,
				minWidth: 180,
				valueGetter: (params) =>
					trackerBoardFilterText({
						boardSlug: params.data?.boardSlug,
						boardName: params.data?.boardName,
					}),
				cellRenderer: (params: ICellRendererParams<KanbanBoardTaskRegistryDto>) =>
					params.data ? (
						<TrackerBoardChips
							boardSlug={params.data.boardSlug}
							boardName={params.data.boardName}
						/>
					) : null,
			},
			{ field: "statusTitle", headerName: "Статус", width: 130 },
			{ field: "taskTypeTitle", headerName: "Тип", width: 110 },
			{ field: "workTypeTitle", headerName: "Тип работ", minWidth: 180, flex: 1 },
			{
				field: "estimatePd",
				headerName: "Оценка, чд",
				width: 110,
				type: "numericColumn",
			},
			{ field: "dueDate", headerName: "Срок", width: 120 },
			{ field: "parentTask", headerName: "Родитель", minWidth: 140, flex: 0.8 },
			{ field: "sprintTitle", headerName: "Спринт", minWidth: 140, flex: 0.8 },
			{ field: "streamCustomer", headerName: "Стрим", minWidth: 140, flex: 0.8 },
			{ field: "origin", headerName: "Стенд", width: 120 },
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
			title="задача"
			createLabel="Создать задачу"
			searchPlaceholder="Поиск по заголовку, проекту, доске…"
			rowData={data}
			columnDefs={columnDefs}
			loading={isLoading}
			onCreateClick={() => navigate("/tracker/tasks/new")}
			onEditClick={openTask}
			onRowDoubleClick={openTask}
			deleteDialogTitle="Удаление задач"
			deleteDialogText={(count) => `Удалить ${count} задач(и)?`}
			onDelete={async (rows) => {
				for (const row of rows) {
					await deleteTask.mutateAsync(row.id);
				}
			}}
			extraActions={<TrackerRegistryExportButton kind="tasks" />}
		/>
	);
}
