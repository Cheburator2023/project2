import type { ColDef } from "ag-grid-community";
import {
	useCreateKanbanBoardStream,
	useDeleteKanbanBoardStream,
	useKanbanBoardStreams,
	useUpdateKanbanBoardStream,
} from "@react-client/common/api/queries/kanban-board";
import { TrackerRegistryPage } from "@react-client/features/tracker/components/TrackerRegistryPage";
import { trackerDateFormatter } from "@react-client/features/tracker/components/TrackerRegistryGrid";
import { TRACKER_EMPTY_FORM_VALUES } from "@react-client/features/tracker/trackerAutoCode";
import type { KanbanBoardStreamDto } from "@smart-anketa/api-contract";
import { useMemo } from "react";

export function TrackerStreamsPage() {
	const { data = [], isLoading } = useKanbanBoardStreams();
	const createStream = useCreateKanbanBoardStream();
	const updateStream = useUpdateKanbanBoardStream();
	const deleteStream = useDeleteKanbanBoardStream();

	const columnDefs = useMemo<ColDef<KanbanBoardStreamDto>[]>(
		() => [
			{ field: "code", headerName: "Код", flex: 1, minWidth: 120 },
			{ field: "name", headerName: "Стрим-заказчик", flex: 1.2, minWidth: 180 },
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

	return (
		<TrackerRegistryPage
			gridStateKey="tracker.streams"
			title="стрим"
			createLabel="Создать стрим"
			searchPlaceholder="Поиск по коду, названию…"
			rowData={data}
			columnDefs={columnDefs}
			loading={isLoading}
			formFields={[
				{
					name: "code",
					label: "Код",
					required: true,
					autoGenerate: "str",
					helperText: "Генерируется автоматически, можно изменить",
				},
				{ name: "name", label: "Стрим-заказчик", required: true },
				{ name: "description", label: "Описание", type: "multiline" },
			]}
			getInitialFormValues={(row) =>
				row
					? {
							code: row.code,
							name: row.name,
							description: row.description ?? "",
						}
					: TRACKER_EMPTY_FORM_VALUES
			}
			canDelete={(row) => row.taskCount === 0}
			deleteDialogTitle="Удаление стримов"
			deleteDialogText={(count) =>
				`Удалить ${count} стрим(а/ов)? Стримы, указанные в задачах, удалить нельзя.`
			}
			onCreate={async (values) => {
				await createStream.mutateAsync({
					code: values.code,
					name: values.name,
					description: values.description || null,
				});
			}}
			onUpdate={async (row, values) => {
				await updateStream.mutateAsync({
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
					await deleteStream.mutateAsync(row.id);
				}
			}}
		/>
	);
}
