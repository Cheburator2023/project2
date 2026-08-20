import type { ColDef, ICellRendererParams } from "ag-grid-community";
import {
	useCreateKanbanBoardPlanning,
	useDeleteKanbanBoardPlanning,
	useKanbanBoardPlannings,
	useKanbanBoardReleases,
	useKanbanBoardSprints,
	useKanbanBoardSupersprints,
	useUpdateKanbanBoardPlanning,
} from "@react-client/common/api/queries/kanban-board";
import {
	TrackerRegistryChip,
	TrackerRegistryChipCell,
} from "@react-client/features/tracker/components/TrackerRegistryChipCell";
import { TrackerRegistryPage } from "@react-client/features/tracker/components/TrackerRegistryPage";
import { trackerDateFormatter } from "@react-client/features/tracker/components/TrackerRegistryGrid";
import { TRACKER_EMPTY_FORM_VALUES } from "@react-client/features/tracker/trackerAutoCode";
import { trackerPlanningPath } from "@react-client/features/kanban-board/kanban-task-paths";
import {
	kanbanBoardReleaseStatusTitle,
	type KanbanBoardPlanningDto,
} from "@smart-anketa/api-contract";
import { useMemo } from "react";
import { useNavigate } from "react-router";

export function TrackerPlanningsPage() {
	const navigate = useNavigate();
	const { data = [], isLoading } = useKanbanBoardPlannings();
	const { data: availableReleases = [] } = useKanbanBoardReleases(true);
	const { data: sprints = [] } = useKanbanBoardSprints();
	const { data: supersprints = [] } = useKanbanBoardSupersprints();
	const createPlanning = useCreateKanbanBoardPlanning();
	const updatePlanning = useUpdateKanbanBoardPlanning();
	const deletePlanning = useDeleteKanbanBoardPlanning();

	const releaseOptions = useMemo(
		() => [
			{ value: "", label: "— Новый релиз —" },
			...availableReleases.map((item) => ({
				value: item.id,
				label: `${item.code} — ${item.name}`,
			})),
		],
		[availableReleases],
	);

	const sprintOptions = useMemo(
		() => [
			{ value: "", label: "—" },
			...sprints.map((item) => ({
				value: item.id,
				label: `${item.code} — ${item.name}`,
			})),
		],
		[sprints],
	);

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

	const columnDefs = useMemo<ColDef<KanbanBoardPlanningDto>[]>(
		() => [
			{ field: "code", headerName: "Код", flex: 1, minWidth: 120 },
			{ field: "name", headerName: "Название", flex: 1.2, minWidth: 180 },
			{
				colId: "release",
				headerName: "Релиз",
				flex: 1.2,
				minWidth: 180,
				valueGetter: (params) =>
					params.data
						? `${params.data.releaseCode} — ${params.data.releaseName}`
						: "",
			},
			{
				colId: "releaseStatus",
				headerName: "Статус релиза",
				width: 150,
				valueGetter: (params) =>
					kanbanBoardReleaseStatusTitle(params.data?.releaseStatus),
				cellRenderer: (params: ICellRendererParams<KanbanBoardPlanningDto>) =>
					params.data ? (
						<TrackerRegistryChipCell>
							<TrackerRegistryChip
								label={kanbanBoardReleaseStatusTitle(params.data.releaseStatus)}
							/>
						</TrackerRegistryChipCell>
					) : null,
			},
			{
				field: "sprintTitle",
				headerName: "Спринт",
				flex: 1,
				minWidth: 160,
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

	const formFields = useMemo(
		() => [
			{
				name: "code",
				label: "Код планирования",
				required: true,
				autoGenerate: "pln",
				helperText: "Генерируется автоматически, можно изменить",
			},
			{ name: "name", label: "Название планирования", required: true },
			{ name: "description", label: "Описание", type: "multiline" as const },
			{
				name: "releaseId",
				label: "Релиз",
				type: "select" as const,
				options: releaseOptions,
			},
			{
				name: "releaseCode",
				label: "Код нового релиза",
				autoGenerate: "rel",
			},
			{ name: "releaseName", label: "Название нового релиза" },
			{
				name: "supersprintId",
				label: "Суперспринт",
				type: "select" as const,
				options: supersprintOptions,
			},
			{
				name: "sprintId",
				label: "Спринт",
				type: "select" as const,
				options: sprintOptions,
			},
			{ name: "startDate", label: "Дата начала", type: "date" as const },
			{ name: "endDate", label: "Дата окончания", type: "date" as const },
		],
		[releaseOptions, sprintOptions, supersprintOptions],
	);

	return (
		<TrackerRegistryPage
			gridStateKey="tracker.plannings"
			title="планирование"
			createLabel="Создать планирование"
			searchPlaceholder="Поиск по коду, названию, релизу…"
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
							releaseId: "",
							releaseCode: "",
							releaseName: "",
							supersprintId: "",
							sprintId: "",
							startDate: "",
							endDate: "",
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
					releaseId: values.releaseId || null,
					releaseCode: values.releaseCode || undefined,
					releaseName: values.releaseName || undefined,
					supersprintId: values.supersprintId || null,
					sprintId: values.sprintId || null,
					startDate: values.startDate || null,
					endDate: values.endDate || null,
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
