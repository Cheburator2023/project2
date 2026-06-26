import type { ColDef } from "ag-grid-community";
import {
	useCreateKanbanBoardSupersprint,
	useDeleteKanbanBoardSupersprint,
	useKanbanBoardSupersprints,
	useUpdateKanbanBoardSupersprint,
} from "@react-client/common/api/queries/kanban-board";
import { TrackerRegistryPage } from "@react-client/features/tracker/components/TrackerRegistryPage";
import { TrackerRegistryExportButton } from "@react-client/features/tracker/components/TrackerRegistryExportButton";
import { trackerDateFormatter } from "@react-client/features/tracker/components/TrackerRegistryGrid";
import { TRACKER_EMPTY_FORM_VALUES } from "@react-client/features/tracker/trackerAutoCode";
import type { KanbanBoardSupersprintDto } from "@smart-anketa/api-contract";
import { useMemo } from "react";

export function TrackerSupersprintsPage() {
	const { data = [], isLoading } = useKanbanBoardSupersprints();
	const createSupersprint = useCreateKanbanBoardSupersprint();
	const updateSupersprint = useUpdateKanbanBoardSupersprint();
	const deleteSupersprint = useDeleteKanbanBoardSupersprint();

	const columnDefs = useMemo<ColDef<KanbanBoardSupersprintDto>[]>(
		() => [
			{ field: "code", headerName: "Код", flex: 1, minWidth: 120 },
			{ field: "name", headerName: "Название", flex: 1.2, minWidth: 180 },
			{ field: "startDate", headerName: "Начало", width: 120 },
			{ field: "endDate", headerName: "Окончание", width: 120 },
			{
				field: "sprintCount",
				headerName: "Спринтов",
				width: 110,
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

	const formFields = useMemo(
		() => [
			{
				name: "code",
				label: "Код",
				required: true,
				autoGenerate: "ss",
				helperText: "Генерируется автоматически, можно изменить",
			},
			{ name: "name", label: "Название", required: true },
			{ name: "description", label: "Описание", type: "multiline" as const },
			{ name: "startDate", label: "Дата начала", type: "date" as const, required: true },
			{ name: "endDate", label: "Дата окончания", type: "date" as const },
		],
		[],
	);

	return (
		<TrackerRegistryPage
			gridStateKey="tracker.supersprints"
			title="суперспринт"
			createLabel="Создать суперспринт"
			searchPlaceholder="Поиск по коду, названию…"
			rowData={data}
			columnDefs={columnDefs}
			loading={isLoading}
			formFields={formFields}
			getInitialFormValues={(row) =>
				row
					? {
							code: row.code,
							name: row.name,
							description: row.description ?? "",
							startDate: row.startDate,
							endDate: row.endDate ?? "",
						}
					: TRACKER_EMPTY_FORM_VALUES
			}
			canDelete={(row) => row.sprintCount === 0}
			deleteDialogTitle="Удаление суперспринтов"
			deleteDialogText={(count) =>
				`Удалить ${count} суперспринт(а/ов)? Суперспринты со спринтами удалить нельзя.`
			}
			onCreate={async (values) => {
				await createSupersprint.mutateAsync({
					code: values.code,
					name: values.name,
					description: values.description || null,
					startDate: values.startDate,
					endDate: values.endDate || null,
				});
			}}
			onUpdate={async (row, values) => {
				await updateSupersprint.mutateAsync({
					id: row.id,
					data: {
						code: values.code,
						name: values.name,
						description: values.description || null,
						startDate: values.startDate,
						endDate: values.endDate || null,
					},
				});
			}}
			onDelete={async (rows) => {
				for (const row of rows) {
					await deleteSupersprint.mutateAsync(row.id);
				}
			}}
			extraActions={<TrackerRegistryExportButton kind="supersprints" />}
		/>
	);
}
