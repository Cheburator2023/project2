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
import {
	TrackerTaskAssigneesChips,
	TrackerTaskAssigneeRolesChips,
	TrackerTaskCurrentAssigneeChip,
	TrackerTaskOriginChip,
	TrackerTaskPriorityChip,
	TrackerTaskSprintChip,
	TrackerTaskStatusChip,
	TrackerTaskStreamChip,
	TrackerTaskTypeChip,
	TrackerTaskWorkTypeChip,
} from "@react-client/features/tracker/components/TrackerTaskFieldChips";
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
			{
				field: "backlogNumber",
				headerName: "№",
				width: 64,
				type: "numericColumn",
			},
			{ field: "title", headerName: "Заголовок", flex: 1.2, minWidth: 180 },
			{
				colId: "priority",
				headerName: "Приоритет",
				width: 110,
				valueGetter: (params) => params.data?.priorityTitle ?? "",
				cellRenderer: (params: ICellRendererParams<KanbanBoardTaskRegistryDto>) =>
					params.data ? (
						<TrackerTaskPriorityChip
							priority={params.data.content.priority}
							priorityTitle={params.data.priorityTitle}
						/>
					) : null,
			},
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
			{
				colId: "status",
				headerName: "Статус",
				width: 130,
				valueGetter: (params) => params.data?.statusTitle ?? "",
				cellRenderer: (params: ICellRendererParams<KanbanBoardTaskRegistryDto>) =>
					params.data ? (
						<TrackerTaskStatusChip
							statusId={params.data.parentId}
							statusTitle={params.data.statusTitle}
						/>
					) : null,
			},
			{
				colId: "taskType",
				headerName: "Тип",
				width: 110,
				valueGetter: (params) => params.data?.taskTypeTitle ?? "",
				cellRenderer: (params: ICellRendererParams<KanbanBoardTaskRegistryDto>) =>
					params.data ? (
						<TrackerTaskTypeChip
							taskType={params.data.content.taskType}
							taskTypeTitle={params.data.taskTypeTitle}
						/>
					) : null,
			},
			{
				colId: "workType",
				headerName: "Тип работ",
				minWidth: 180,
				flex: 1,
				valueGetter: (params) => params.data?.workTypeTitle ?? "",
				cellRenderer: (params: ICellRendererParams<KanbanBoardTaskRegistryDto>) =>
					params.data ? (
						<TrackerTaskWorkTypeChip
							workType={params.data.content.workType}
							workTypeTitle={params.data.workTypeTitle}
						/>
					) : null,
			},
			{
				colId: "assignee",
				headerName: "Исполнители",
				minWidth: 160,
				flex: 0.9,
				valueGetter: (params) => params.data?.assigneeTitle ?? "",
				cellRenderer: (params: ICellRendererParams<KanbanBoardTaskRegistryDto>) =>
					params.data ? (
						<TrackerTaskAssigneesChips assignees={params.data.assignees} />
					) : null,
			},
			{
				colId: "currentAssignee",
				headerName: "Текущий исполнитель",
				minWidth: 150,
				flex: 0.8,
				valueGetter: (params) => params.data?.currentAssigneeTitle ?? "",
				cellRenderer: (params: ICellRendererParams<KanbanBoardTaskRegistryDto>) =>
					params.data ? (
						<TrackerTaskCurrentAssigneeChip
							currentAssigneeTitle={params.data.currentAssigneeTitle}
						/>
					) : null,
			},
			{
				colId: "assigneeRole",
				headerName: "Роли",
				minWidth: 140,
				flex: 0.8,
				valueGetter: (params) => params.data?.assigneeRoleTitle ?? "",
				cellRenderer: (params: ICellRendererParams<KanbanBoardTaskRegistryDto>) =>
					params.data ? (
						<TrackerTaskAssigneeRolesChips
							assigneeRoles={params.data.assigneeRoles}
							assigneeRoleTitles={params.data.assigneeRoleTitles}
						/>
					) : null,
			},
			{
				field: "customer",
				headerName: "Заказчик",
				minWidth: 100,
				width: 110,
			},
			{
				field: "sprintOutcome",
				headerName: "Результат спринта",
				minWidth: 160,
				flex: 0.9,
			},
			{
				field: "effectiveEstimatePd",
				headerName: "Итого, чд",
				width: 100,
				type: "numericColumn",
				valueGetter: (params) =>
					params.data?.effectiveEstimatePd ?? params.data?.estimatePd,
			},
			{ field: "dueDate", headerName: "Срок", width: 130 },
			{ field: "parentTask", headerName: "Родитель", minWidth: 140, flex: 0.8 },
			{
				colId: "sprint",
				headerName: "Спринт",
				minWidth: 140,
				flex: 0.8,
				valueGetter: (params) => params.data?.sprintTitle ?? "",
				cellRenderer: (params: ICellRendererParams<KanbanBoardTaskRegistryDto>) =>
					params.data ? (
						<TrackerTaskSprintChip sprintTitle={params.data.sprintTitle} />
					) : null,
			},
			{
				colId: "stream",
				headerName: "Стрим",
				minWidth: 140,
				flex: 0.8,
				valueGetter: (params) => params.data?.streamCustomer ?? "",
				cellRenderer: (params: ICellRendererParams<KanbanBoardTaskRegistryDto>) =>
					params.data ? (
						<TrackerTaskStreamChip streamCustomer={params.data.streamCustomer} />
					) : null,
			},
			{
				colId: "origin",
				headerName: "Стенд",
				width: 120,
				valueGetter: (params) => params.data?.origin ?? "",
				cellRenderer: (params: ICellRendererParams<KanbanBoardTaskRegistryDto>) =>
					params.data ? <TrackerTaskOriginChip origin={params.data.origin} /> : null,
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
