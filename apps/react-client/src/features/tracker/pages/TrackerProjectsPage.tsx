import type { ColDef, ICellRendererParams } from "ag-grid-community";
import {
	useCreateKanbanBoardProject,
	useDeleteKanbanBoardProject,
	useKanbanBoardProjects,
	useUpdateKanbanBoardProject,
} from "@react-client/common/api/queries/kanban-board";
import {
	TrackerRegistryChip,
	TrackerRegistryChipCell,
} from "@react-client/features/tracker/components/TrackerRegistryChipCell";
import { TrackerRegistryPage } from "@react-client/features/tracker/components/TrackerRegistryPage";
import { trackerDateFormatter } from "@react-client/features/tracker/components/TrackerRegistryGrid";
import type { KanbanBoardProjectDto } from "@smart-anketa/api-contract";
import { useMemo } from "react";

export function TrackerProjectsPage() {
	const { data = [], isLoading } = useKanbanBoardProjects();
	const createProject = useCreateKanbanBoardProject();
	const updateProject = useUpdateKanbanBoardProject();
	const deleteProject = useDeleteKanbanBoardProject();

	const columnDefs = useMemo<ColDef<KanbanBoardProjectDto>[]>(
		() => [
			{ field: "code", headerName: "Код", flex: 1, minWidth: 120 },
			{ field: "name", headerName: "Название", flex: 1.2, minWidth: 160 },
			{
				field: "boardCount",
				headerName: "Досок",
				width: 100,
				type: "numericColumn",
			},
			{
				colId: "flags",
				headerName: "Статус",
				width: 130,
				sortable: false,
				filter: false,
				cellRenderer: (params: ICellRendererParams<KanbanBoardProjectDto>) =>
					params.data?.isStock ? (
						<TrackerRegistryChipCell>
							<TrackerRegistryChip
								label="Стоковый"
								color="info"
								title="Стоковый проект"
							/>
						</TrackerRegistryChipCell>
					) : null,
			},
			{
				field: "description",
				headerName: "Описание",
				flex: 1.5,
				minWidth: 180,
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
			title="проект"
			createLabel="Создать проект"
			searchPlaceholder="Поиск по коду, названию, описанию…"
			rowData={data}
			columnDefs={columnDefs}
			loading={isLoading}
			formFields={[
				{
					name: "code",
					label: "Код",
					required: true,
					autoGenerate: "prj",
					helperText: "Генерируется автоматически, можно изменить",
				},
				{ name: "name", label: "Название", required: true },
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
			canDelete={(row) => !row.isStock}
			deleteDialogTitle="Удаление проектов"
			deleteDialogText={(count) =>
				`Удалить ${count} проект(ов)? Стоковые проекты удалить нельзя.`
			}
			onCreate={async (values) => {
				await createProject.mutateAsync({
					code: values.code,
					name: values.name,
					description: values.description || null,
				});
			}}
			onUpdate={async (row, values) => {
				await updateProject.mutateAsync({
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
					await deleteProject.mutateAsync(row.id);
				}
			}}
		/>
	);
}
