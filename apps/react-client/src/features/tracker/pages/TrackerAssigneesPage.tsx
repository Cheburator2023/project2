import type { ColDef } from "ag-grid-community";
import {
	useCreateKanbanBoardAssignee,
	useDeleteKanbanBoardAssignee,
	useKanbanBoardAssignees,
	useUpdateKanbanBoardAssignee,
} from "@react-client/common/api/queries/kanban-board";
import { TrackerRegistryPage } from "@react-client/features/tracker/components/TrackerRegistryPage";
import { trackerDateFormatter } from "@react-client/features/tracker/components/TrackerRegistryGrid";
import type { KanbanBoardAssigneeDto } from "@smart-anketa/api-contract";
import { useMemo } from "react";

export function TrackerAssigneesPage() {
	const { data = [], isLoading } = useKanbanBoardAssignees();
	const createAssignee = useCreateKanbanBoardAssignee();
	const updateAssignee = useUpdateKanbanBoardAssignee();
	const deleteAssignee = useDeleteKanbanBoardAssignee();

	const columnDefs = useMemo<ColDef<KanbanBoardAssigneeDto>[]>(
		() => [
			{ field: "code", headerName: "Код", flex: 1, minWidth: 120 },
			{ field: "name", headerName: "Имя", flex: 1.2, minWidth: 160 },
			{ field: "email", headerName: "Email", flex: 1.2, minWidth: 180 },
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
			title="исполнитель"
			createLabel="Создать исполнителя"
			searchPlaceholder="Поиск по коду, имени, email…"
			rowData={data}
			columnDefs={columnDefs}
			loading={isLoading}
			formFields={[
				{
					name: "code",
					label: "Код",
					required: true,
					autoGenerate: "usr",
					helperText: "Генерируется автоматически, можно изменить",
				},
				{ name: "name", label: "Имя", required: true },
				{ name: "email", label: "Email" },
			]}
			getInitialFormValues={(row) =>
				row
					? {
							code: row.code,
							name: row.name,
							email: row.email ?? "",
						}
					: {}
			}
			canDelete={(row) => row.taskCount === 0}
			deleteDialogTitle="Удаление исполнителей"
			deleteDialogText={(count) =>
				`Удалить ${count} исполнител(я/ей)? Исполнителей с задачами удалить нельзя.`
			}
			onCreate={async (values) => {
				await createAssignee.mutateAsync({
					code: values.code,
					name: values.name,
					email: values.email || null,
				});
			}}
			onUpdate={async (row, values) => {
				await updateAssignee.mutateAsync({
					id: row.id,
					data: {
						code: values.code,
						name: values.name,
						email: values.email || null,
					},
				});
			}}
			onDelete={async (rows) => {
				for (const row of rows) {
					await deleteAssignee.mutateAsync(row.id);
				}
			}}
		/>
	);
}
