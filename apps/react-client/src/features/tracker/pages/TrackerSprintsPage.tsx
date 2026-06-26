import type { ColDef } from "ag-grid-community";
import {
	useCreateKanbanBoardSprint,
	useDeleteKanbanBoardSprint,
	useKanbanBoardSprints,
	useKanbanBoardSupersprints,
	useUpdateKanbanBoardSprint,
} from "@react-client/common/api/queries/kanban-board";
import { TrackerRegistryPage } from "@react-client/features/tracker/components/TrackerRegistryPage";
import { TrackerRegistryExportButton } from "@react-client/features/tracker/components/TrackerRegistryExportButton";
import { trackerDateFormatter } from "@react-client/features/tracker/components/TrackerRegistryGrid";
import type { KanbanBoardSprintDto } from "@smart-anketa/api-contract";
import { useMemo } from "react";

export function TrackerSprintsPage() {
	const { data = [], isLoading } = useKanbanBoardSprints();
	const { data: supersprints = [] } = useKanbanBoardSupersprints();
	const createSprint = useCreateKanbanBoardSprint();
	const updateSprint = useUpdateKanbanBoardSprint();
	const deleteSprint = useDeleteKanbanBoardSprint();

	const supersprintOptions = useMemo(
		() => [
			{ value: "", label: "—" },
			...supersprints.map((item) => ({
				value: item.id,
				label: `${item.code} — ${item.name}`,
			})),
		],
		[supersprints],
	);

	const columnDefs = useMemo<ColDef<KanbanBoardSprintDto>[]>(
		() => [
			{ field: "code", headerName: "Код", flex: 1, minWidth: 120 },
			{ field: "name", headerName: "Название", flex: 1.2, minWidth: 180 },
			{
				colId: "supersprint",
				headerName: "Суперспринт",
				flex: 1.1,
				minWidth: 180,
				valueGetter: (params) =>
					params.data?.supersprintName
						? `${params.data.supersprintCode} — ${params.data.supersprintName}`
						: "",
			},
			{ field: "startDate", headerName: "Начало", width: 120 },
			{ field: "endDate", headerName: "Окончание", width: 120 },
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

	const formFields = useMemo(
		() => [
			{
				name: "supersprintId",
				label: "Суперспринт",
				type: "select" as const,
				options: supersprintOptions,
			},
			{
				name: "code",
				label: "Код",
				required: true,
				autoGenerate: "sp",
				helperText: "Генерируется автоматически, можно изменить",
			},
			{ name: "name", label: "Название", required: true },
			{ name: "description", label: "Описание", type: "multiline" as const },
			{ name: "startDate", label: "Дата начала", type: "date" as const, required: true },
			{ name: "endDate", label: "Дата окончания", type: "date" as const },
		],
		[supersprintOptions],
	);

	return (
		<TrackerRegistryPage
			gridStateKey="tracker.sprints"
			title="спринт"
			createLabel="Создать спринт"
			searchPlaceholder="Поиск по коду, названию, суперспринту…"
			rowData={data}
			columnDefs={columnDefs}
			loading={isLoading}
			formFields={formFields}
			getInitialFormValues={(row) =>
				row
					? {
							supersprintId: row.supersprintId ?? "",
							code: row.code,
							name: row.name,
							description: row.description ?? "",
							startDate: row.startDate,
							endDate: row.endDate ?? "",
						}
					: {}
			}
			canDelete={(row) => row.taskCount === 0}
			deleteDialogTitle="Удаление спринтов"
			deleteDialogText={(count) =>
				`Удалить ${count} спринт(а/ов)? Спринты с задачами удалить нельзя.`
			}
			onCreate={async (values) => {
				await createSprint.mutateAsync({
					supersprintId: values.supersprintId || null,
					code: values.code,
					name: values.name,
					description: values.description || null,
					startDate: values.startDate,
					endDate: values.endDate || null,
				});
			}}
			onUpdate={async (row, values) => {
				await updateSprint.mutateAsync({
					id: row.id,
					data: {
						supersprintId: values.supersprintId || null,
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
					await deleteSprint.mutateAsync(row.id);
				}
			}}
			extraActions={<TrackerRegistryExportButton kind="sprints" />}
		/>
	);
}
