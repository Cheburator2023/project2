import type { ColDef, ICellRendererParams } from "ag-grid-community";
import {
	useCreateKanbanBoardBoard,
	useDeleteKanbanBoardBoard,
	useKanbanBoardBoards,
	useKanbanBoardProjects,
	useUpdateKanbanBoardBoard,
} from "@react-client/common/api/queries/kanban-board";
import {
	TrackerProjectChips,
	trackerProjectFilterText,
} from "@react-client/features/tracker/components/TrackerRegistryChipCell";
import { TrackerRegistryPage } from "@react-client/features/tracker/components/TrackerRegistryPage";
import { trackerDateFormatter } from "@react-client/features/tracker/components/TrackerRegistryGrid";
import type { KanbanBoardBoardDto } from "@smart-anketa/api-contract";
import { useMemo } from "react";
import { useNavigate } from "react-router";
import { trackerBoardPath } from "@react-client/features/kanban-board/kanban-task-paths";

export function TrackerBoardsPage() {
	const navigate = useNavigate();
	const { data = [], isLoading } = useKanbanBoardBoards();
	const { data: projects = [] } = useKanbanBoardProjects();
	const createBoard = useCreateKanbanBoardBoard();
	const updateBoard = useUpdateKanbanBoardBoard();
	const deleteBoard = useDeleteKanbanBoardBoard();

	const projectOptions = useMemo(
		() =>
			projects.map((project) => ({
				value: project.id,
				label: `${project.code} — ${project.name}`,
			})),
		[projects],
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
			{ field: "boardKey", headerName: "Ключ", width: 140 },
			{ field: "slug", headerName: "Slug", width: 120 },
			{
				field: "taskCount",
				headerName: "Задач",
				width: 100,
				type: "numericColumn",
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
			gridStateKey="tracker.boards"
			title="доска"
			createLabel="Создать доску"
			searchPlaceholder="Поиск по проекту, названию, slug…"
			rowData={data}
			columnDefs={columnDefs}
			loading={isLoading}
			formFields={[
				{
					name: "projectId",
					label: "Проект",
					type: "select",
					required: true,
					options: projectOptions,
				},
				{ name: "name", label: "Название", required: true },
				{
					name: "slug",
					label: "Slug",
					required: true,
					autoGenerate: "brd",
					helperText: "Генерируется автоматически, можно изменить",
				},
				{ name: "description", label: "Описание", type: "multiline" },
				{ name: "sortOrder", label: "Порядок", type: "number" },
			]}
			getInitialFormValues={(row): any =>
				row
					? {
							projectId: row.projectId,
							name: row.name,
							slug: row.slug,
							description: row.description ?? "",
							sortOrder: String(row.sortOrder),
						}
					: { sortOrder: "0" }
			}
			onRowDoubleClick={(row) => navigate(trackerBoardPath(row.boardKey))}
			contextActions={[
				{
					label: "Открыть kanban",
					onClick: (row) => navigate(trackerBoardPath(row.boardKey)),
				},
			]}
			deleteDialogTitle="Удаление досок"
			deleteDialogText={(count) =>
				`Удалить ${count} доск(и/у)? Задачи на них тоже удалятся.`
			}
			onCreate={async (values) => {
				await createBoard.mutateAsync({
					projectId: values.projectId,
					name: values.name,
					slug: values.slug,
					description: values.description || null,
					sortOrder: Number(values.sortOrder || 0),
				});
			}}
			onUpdate={async (row, values) => {
				await updateBoard.mutateAsync({
					id: row.id,
					data: {
						projectId: values.projectId,
						name: values.name,
						slug: values.slug,
						description: values.description || null,
						sortOrder: Number(values.sortOrder || 0),
					},
				});
			}}
			onDelete={async (rows) => {
				for (const row of rows) {
					await deleteBoard.mutateAsync(row.id);
				}
			}}
		/>
	);
}
