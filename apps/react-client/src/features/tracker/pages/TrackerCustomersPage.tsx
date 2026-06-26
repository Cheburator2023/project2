import type { ColDef } from "ag-grid-community";
import {
	useCreateKanbanBoardCustomer,
	useDeleteKanbanBoardCustomer,
	useKanbanBoardCustomers,
	useUpdateKanbanBoardCustomer,
} from "@react-client/common/api/queries/kanban-board";
import { TrackerRegistryPage } from "@react-client/features/tracker/components/TrackerRegistryPage";
import { trackerDateFormatter } from "@react-client/features/tracker/components/TrackerRegistryGrid";
import type { KanbanBoardCustomerDto } from "@smart-anketa/api-contract";
import { useMemo } from "react";

export function TrackerCustomersPage() {
	const { data = [], isLoading } = useKanbanBoardCustomers();
	const createCustomer = useCreateKanbanBoardCustomer();
	const updateCustomer = useUpdateKanbanBoardCustomer();
	const deleteCustomer = useDeleteKanbanBoardCustomer();

	const columnDefs = useMemo<ColDef<KanbanBoardCustomerDto>[]>(
		() => [
			{ field: "code", headerName: "Код", flex: 1, minWidth: 120 },
			{ field: "name", headerName: "Заказчик", flex: 1.2, minWidth: 160 },
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
			gridStateKey="tracker.customers"
			title="заказчик"
			createLabel="Создать заказчика"
			searchPlaceholder="Поиск по коду, названию…"
			rowData={data}
			columnDefs={columnDefs}
			loading={isLoading}
			formFields={[
				{
					name: "code",
					label: "Код",
					required: true,
					autoGenerate: "cus",
					helperText: "Генерируется автоматически, можно изменить",
				},
				{ name: "name", label: "Заказчик", required: true },
				{ name: "description", label: "Описание", type: "multiline" },
			]}
			getInitialFormValues={(row) =>
				row
					? {
							code: row.code,
							name: row.name,
							description: row.description ?? "",
						}
					: {}
			}
			canDelete={(row) => row.taskCount === 0}
			deleteDialogTitle="Удаление заказчиков"
			deleteDialogText={(count) =>
				`Удалить ${count} заказчик(а/ов)? Заказчиков, указанных в задачах, удалить нельзя.`
			}
			onCreate={async (values) => {
				await createCustomer.mutateAsync({
					code: values.code,
					name: values.name,
					description: values.description || null,
				});
			}}
			onUpdate={async (row, values) => {
				await updateCustomer.mutateAsync({
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
					await deleteCustomer.mutateAsync(row.id);
				}
			}}
		/>
	);
}
