import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { apiErrorMessage } from "@react-client/common/api/helpers/apiErrorMessage";
import {
	useCreateKanbanBoardRelease,
	useDeleteKanbanBoardRelease,
	useKanbanBoardPlannings,
	useKanbanBoardReleases,
	useKanbanBoardSprints,
	useKanbanBoardSupersprints,
	useUpdateKanbanBoardRelease,
} from "@react-client/common/api/queries/kanban-board";
import { toast } from "@react-client/common/toasts";
import { Flex } from "@react-client/common/primitives/Flex";
import { TrackerRegistryChipCell } from "@react-client/features/tracker/components/TrackerRegistryChipCell";
import { TrackerReleaseStatusSelect } from "@react-client/features/tracker/components/TrackerReleaseStatusSelect";
import { TrackerRegistryPage } from "@react-client/features/tracker/components/TrackerRegistryPage";
import type { TrackerFormField } from "@react-client/features/tracker/components/TrackerFormDialog";
import { trackerDateFormatter } from "@react-client/features/tracker/components/TrackerRegistryGrid";
import { TRACKER_EMPTY_FORM_VALUES } from "@react-client/features/tracker/trackerAutoCode";
import {
	releaseImageVersionFields,
	releaseImageVersionsFromForm,
	releaseImageVersionsToForm,
} from "@react-client/features/tracker/trackerReleaseForm";
import {
	trackerPlanningPath,
	trackerReleasePath,
} from "@react-client/features/kanban-board/kanban-task-paths";
import {
	KANBAN_BOARD_RELEASE_STATUSES,
	kanbanBoardReleaseImageVersionsTitle,
	kanbanBoardReleaseStatusTitle,
	type KanbanBoardReleaseDto,
	type KanbanBoardReleaseStatusId,
} from "@smart-anketa/api-contract";
import { useMemo } from "react";
import { useNavigate } from "react-router";

export function TrackerReleasesPage() {
	const navigate = useNavigate();
	const { data: releases = [], isLoading } = useKanbanBoardReleases();
	const { data: plannings = [] } = useKanbanBoardPlannings();
	const { data: sprints = [] } = useKanbanBoardSprints();
	const { data: supersprints = [] } = useKanbanBoardSupersprints();
	const createRelease = useCreateKanbanBoardRelease();
	const updateRelease = useUpdateKanbanBoardRelease();
	const deleteRelease = useDeleteKanbanBoardRelease();

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

	const planningOptions = useMemo(
		() => [
			{ value: "", label: "— Без планирования —" },
			...plannings.map((item) => ({
				value: item.id,
				label: `${item.code} — ${item.name}`,
			})),
		],
		[plannings],
	);

	const statusOptions = useMemo(
		() =>
			KANBAN_BOARD_RELEASE_STATUSES.map((item) => ({
				value: item.id,
				label: item.title,
			})),
		[],
	);

	const columnDefs = useMemo<ColDef<KanbanBoardReleaseDto>[]>(
		() => [
			{ field: "code", headerName: "Код", flex: 1, minWidth: 110 },
			{ field: "name", headerName: "Название", flex: 1.2, minWidth: 160 },
			{
				colId: "status",
				headerName: "Статус",
				width: 200,
				valueGetter: (params) =>
					kanbanBoardReleaseStatusTitle(params.data?.status),
				cellRenderer: (params: ICellRendererParams<KanbanBoardReleaseDto>) =>
					params.data ? (
						<TrackerRegistryChipCell>
							<Flex
								width="100%"
								minWidth={0}
								onClick={(event) => event.stopPropagation()}
								onDoubleClick={(event) => event.stopPropagation()}
								onMouseDown={(event) => event.stopPropagation()}
							>
								<TrackerReleaseStatusSelect
									value={params.data.status}
									disabled={updateRelease.isPending}
									onChange={(status) => {
										const row = params.data;
										if (!row || status === row.status) return;
										void updateRelease
											.mutateAsync({ id: row.id, data: { status } })
											.catch((error) => toast.error(apiErrorMessage(error)));
									}}
								/>
							</Flex>
						</TrackerRegistryChipCell>
					) : null,
			},
			{
				colId: "planning",
				headerName: "Планирование",
				flex: 1.2,
				minWidth: 160,
				valueGetter: (params) =>
					params.data?.planningId
						? `${params.data.planningCode} — ${params.data.planningName}`
						: "",
			},
			{
				colId: "imageVersions",
				headerName: "Образы",
				flex: 1.2,
				minWidth: 160,
				valueGetter: (params) =>
					kanbanBoardReleaseImageVersionsTitle(params.data?.imageVersions),
			},
			{
				field: "taskCount",
				headerName: "Задач",
				width: 90,
				type: "numericColumn",
			},
			{
				field: "updatedAt",
				headerName: "Обновлено",
				minWidth: 170,
				valueFormatter: (params) => trackerDateFormatter(params.value),
			},
		],
		[updateRelease],
	);

	const formFields = useMemo<TrackerFormField[]>(
		() => [
			{
				name: "code",
				label: "Код релиза",
				required: true,
				autoGenerate: "rel",
				helperText: "Генерируется автоматически, можно изменить",
			},
			{ name: "name", label: "Название релиза", required: true },
			{ name: "description", label: "Описание", type: "multiline" },
			{
				name: "status",
				label: "Статус",
				type: "select",
				options: statusOptions,
			},
			{
				name: "planningId",
				label: "Планирование",
				type: "select",
				options: planningOptions,
			},
			{
				name: "supersprintId",
				label: "Суперспринт",
				type: "select",
				options: supersprintOptions,
			},
			{
				name: "sprintId",
				label: "Спринт",
				type: "select",
				options: sprintOptions,
			},
			{ name: "startDate", label: "Дата начала", type: "date" },
			{ name: "endDate", label: "Дата окончания", type: "date" },
			...releaseImageVersionFields(),
		],
		[planningOptions, sprintOptions, statusOptions, supersprintOptions],
	);

	return (
		<TrackerRegistryPage
			gridStateKey="tracker.releases"
			title="релиз"
			createLabel="Создать релиз"
			searchPlaceholder="Поиск по коду, названию, планированию…"
			rowData={releases}
			columnDefs={columnDefs}
			loading={isLoading}
			formFields={formFields}
			getInitialFormValues={(row) =>
				row
					? {
							code: row.code,
							name: row.name,
							description: row.description ?? "",
							status: row.status,
							planningId: row.planningId ?? "",
							supersprintId: row.supersprintId ?? "",
							sprintId: row.sprintId ?? "",
							startDate: row.startDate ?? "",
							endDate: row.endDate ?? "",
							...releaseImageVersionsToForm(row.imageVersions),
						}
					: {
							...TRACKER_EMPTY_FORM_VALUES,
							status: "draft",
						}
			}
			onRowDoubleClick={(row) => navigate(trackerReleasePath(row.id))}
			contextActions={[
				{
					label: "Открыть планирование",
					disabled: (row) => !row.planningId,
					onClick: (row) => {
						if (row.planningId) {
							navigate(trackerPlanningPath(row.planningId));
						}
					},
				},
			]}
			deleteDialogTitle="Удаление релизов"
			deleteDialogText={(count) =>
				`Удалить ${count} релиз(ов)? Задачи открепятся от этих релизов.`
			}
			onCreate={async (values) => {
				const created = await createRelease.mutateAsync({
					code: values.code,
					name: values.name,
					description: values.description || null,
					status: values.status as KanbanBoardReleaseStatusId,
					planningId: values.planningId || null,
					supersprintId: values.supersprintId || null,
					sprintId: values.sprintId || null,
					startDate: values.startDate || null,
					endDate: values.endDate || null,
					imageVersions: releaseImageVersionsFromForm(values),
				});
				navigate(trackerReleasePath(created.id));
			}}
			onUpdate={async (row, values) => {
				await updateRelease.mutateAsync({
					id: row.id,
					data: {
						code: values.code,
						name: values.name,
						description: values.description || null,
						status: values.status as KanbanBoardReleaseStatusId,
						planningId: values.planningId || null,
						supersprintId: values.supersprintId || null,
						sprintId: values.sprintId || null,
						startDate: values.startDate || null,
						endDate: values.endDate || null,
						imageVersions: releaseImageVersionsFromForm(values),
					},
				});
			}}
			onDelete={async (rows) => {
				for (const row of rows) {
					await deleteRelease.mutateAsync(row.id);
				}
			}}
		/>
	);
}
