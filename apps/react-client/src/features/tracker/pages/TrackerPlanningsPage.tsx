import type { ColDef } from "ag-grid-community";
import {
	useCreateKanbanBoardPlanning,
	useDeleteKanbanBoardPlanning,
	useKanbanBoardPlannings,
	useUpdateKanbanBoardPlanning,
} from "@react-client/common/api/queries/kanban-board";
import { TrackerRegistryPage } from "@react-client/features/tracker/components/TrackerRegistryPage";
import type { TrackerFormField } from "@react-client/features/tracker/components/TrackerFormDialog";
import { trackerDateFormatter } from "@react-client/features/tracker/components/TrackerRegistryGrid";
import { TRACKER_EMPTY_FORM_VALUES } from "@react-client/features/tracker/trackerAutoCode";
import { trackerPlanningPath } from "@react-client/features/kanban-board/kanban-task-paths";
import type { KanbanBoardPlanningDto } from "@smart-anketa/api-contract";
import { useMemo } from "react";
import { useNavigate } from "react-router";

export function TrackerPlanningsPage() {
	const navigate = useNavigate();
	const { data: plannings = [], isLoading } = useKanbanBoardPlannings();
	const createPlanning = useCreateKanbanBoardPlanning();
	const updatePlanning = useUpdateKanbanBoardPlanning();
	const deletePlanning = useDeleteKanbanBoardPlanning();

	const columnDefs = useMemo<ColDef<KanbanBoardPlanningDto>[]>(
		() => [
			{ field: "code", headerName: "Код", flex: 1, minWidth: 120 },
			{ field: "name", headerName: "Название", flex: 1.2, minWidth: 180 },
			{
				field: "releaseTitle",
				headerName: "Релизы",
				flex: 1.4,
				minWidth: 180,
			},
			{
				field: "releaseCount",
				headerName: "Релизов",
				width: 110,
				type: "numericColumn",
			},
			{
				field: "taskCount",
				headerName: "Задач",
				width: 100,
				type: "numericColumn",
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

	const formFields = useMemo<TrackerFormField[]>(
		() => [
			{
				name: "code",
				label: "Код планирования",
				required: true,
				autoGenerate: "pln",
				helperText: "Генерируется автоматически, можно изменить",
			},
			{ name: "name", label: "Название планирования", required: true },
			{ name: "description", label: "Описание", type: "multiline" },
		],
		[],
	);

	return (
		<TrackerRegistryPage
			gridStateKey="tracker.plannings"
			title="планирование"
			createLabel="Создать планирование"
			searchPlaceholder="Поиск по коду, названию, релизам…"
			rowData={plannings}
			columnDefs={columnDefs}
			loading={isLoading}
			formFields={formFields}
			getInitialFormValues={(row) =>
				row
					? {
							code: row.code,
							name: row.name,
							description: row.description ?? "",
						}
					: TRACKER_EMPTY_FORM_VALUES
			}
			onRowDoubleClick={(row) => navigate(trackerPlanningPath(row.id))}
			deleteDialogTitle="Удаление планирований"
			deleteDialogText={(count) =>
				`Удалить ${count} планирование(й)? Релизы останутся.`
			}
			onCreate={async (values) => {
				const created = await createPlanning.mutateAsync({
					code: values.code,
					name: values.name,
					description: values.description || null,
				});
				navigate(trackerPlanningPath(created.id));
			}}
			onUpdate={async (row, values) => {
				await updatePlanning.mutateAsync({
					id: row.id,
					data: {
						code: values.code,
						name: values.name,
						description: values.description || null,
					},
				});
			}}
			onDelete={async (rows) => {
				for (const row of rows) {
					await deletePlanning.mutateAsync(row.id);
				}
			}}
		/>
	);
}
