import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import {
	useCreateKanbanBoardPlanning,
	useCreateKanbanBoardRelease,
	useDeleteKanbanBoardPlanning,
	useDeleteKanbanBoardRelease,
	useKanbanBoardPlannings,
	useKanbanBoardReleases,
	useKanbanBoardSprints,
	useKanbanBoardSupersprints,
	useUpdateKanbanBoardPlanning,
	useUpdateKanbanBoardRelease,
} from "@react-client/common/api/queries/kanban-board";
import { Header } from "@react-client/common/navigation/organisms/Header";
import { Card } from "@react-client/common/muiCustom/Card";
import { Flex } from "@react-client/common/primitives/Flex";
import {
	TrackerRegistryChip,
	TrackerRegistryChipCell,
} from "@react-client/features/tracker/components/TrackerRegistryChipCell";
import { TrackerRegistryPage } from "@react-client/features/tracker/components/TrackerRegistryPage";
import type { TrackerFormField } from "@react-client/features/tracker/components/TrackerFormDialog";
import { trackerDateFormatter } from "@react-client/features/tracker/components/TrackerRegistryGrid";
import { TRACKER_EMPTY_FORM_VALUES } from "@react-client/features/tracker/trackerAutoCode";
import { trackerPlanningPath } from "@react-client/features/kanban-board/kanban-task-paths";
import {
	KANBAN_BOARD_RELEASE_IMAGE_TARGETS,
	KANBAN_BOARD_RELEASE_STATUSES,
	kanbanBoardReleaseImageVersionsTitle,
	kanbanBoardReleaseStatusTitle,
	normalizeKanbanBoardReleaseImageVersions,
	type KanbanBoardPlanningDto,
	type KanbanBoardReleaseDto,
	type KanbanBoardReleaseImageVersions,
	type KanbanBoardReleaseStatusId,
} from "@smart-anketa/api-contract";
import { useMemo } from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { useNavigate } from "react-router";

function imageVersionFieldName(targetId: string) {
	return `image:${targetId}`;
}

function imageVersionFields(): TrackerFormField[] {
	return KANBAN_BOARD_RELEASE_IMAGE_TARGETS.map((target) => ({
		name: imageVersionFieldName(target.id),
		label: `Образ ${target.label}`,
	}));
}

function imageVersionsFromForm(
	values: Record<string, string>,
): KanbanBoardReleaseImageVersions {
	return normalizeKanbanBoardReleaseImageVersions(
		Object.fromEntries(
			KANBAN_BOARD_RELEASE_IMAGE_TARGETS.map((target) => [
				target.id,
				values[imageVersionFieldName(target.id)] ?? "",
			]),
		),
	);
}

function imageVersionsToForm(
	versions?: KanbanBoardReleaseImageVersions | null,
): Record<string, string> {
	return Object.fromEntries(
		KANBAN_BOARD_RELEASE_IMAGE_TARGETS.map((target) => [
			imageVersionFieldName(target.id),
			versions?.[target.id] ?? "",
		]),
	);
}

export function TrackerPlanningsPage() {
	const navigate = useNavigate();
	const { data: plannings = [], isLoading: planningsLoading } =
		useKanbanBoardPlannings();
	const { data: releases = [], isLoading: releasesLoading } =
		useKanbanBoardReleases();
	const { data: sprints = [] } = useKanbanBoardSprints();
	const { data: supersprints = [] } = useKanbanBoardSupersprints();
	const createPlanning = useCreateKanbanBoardPlanning();
	const updatePlanning = useUpdateKanbanBoardPlanning();
	const deletePlanning = useDeleteKanbanBoardPlanning();
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

	const planningColumnDefs = useMemo<ColDef<KanbanBoardPlanningDto>[]>(
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

	const releaseColumnDefs = useMemo<ColDef<KanbanBoardReleaseDto>[]>(
		() => [
			{ field: "code", headerName: "Код", flex: 1, minWidth: 110 },
			{ field: "name", headerName: "Название", flex: 1.2, minWidth: 160 },
			{
				colId: "status",
				headerName: "Статус",
				width: 140,
				valueGetter: (params) =>
					kanbanBoardReleaseStatusTitle(params.data?.status),
				cellRenderer: (params: ICellRendererParams<KanbanBoardReleaseDto>) =>
					params.data ? (
						<TrackerRegistryChipCell>
							<TrackerRegistryChip
								label={kanbanBoardReleaseStatusTitle(params.data.status)}
							/>
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
		[],
	);

	const planningFormFields = useMemo<TrackerFormField[]>(
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

	const releaseFormFields = useMemo<TrackerFormField[]>(
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
			...imageVersionFields(),
		],
		[planningOptions, sprintOptions, statusOptions, supersprintOptions],
	);

	return (
		<Flex flexDirection="column" flexGrow={1} minHeight="0" height="100%">
			<Header />
			<Flex flexGrow={1} minHeight="0">
				<PanelGroup
					direction="horizontal"
					autoSaveId="tracker-plannings-releases"
					style={{ height: "100%", width: "100%" }}
				>
					<Panel defaultSize={55} minSize={28}>
						<Card padding="0" height="100%" overflow="hidden">
							<TrackerRegistryPage
								embedded
								toolbarLabel="Планирования"
								gridStateKey="tracker.plannings"
								title="планирование"
								createLabel="Создать планирование"
								searchPlaceholder="Поиск по коду, названию, релизам…"
								rowData={plannings}
								columnDefs={planningColumnDefs}
								loading={planningsLoading}
								formFields={planningFormFields}
								getInitialFormValues={(row) =>
									row
										? {
												code: row.code,
												name: row.name,
												description: row.description ?? "",
											}
										: TRACKER_EMPTY_FORM_VALUES
								}
								onRowDoubleClick={(row) =>
									navigate(trackerPlanningPath(row.id))
								}
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
						</Card>
					</Panel>
					<PanelResizeHandle
						style={{
							width: 10,
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							cursor: "col-resize",
							flexShrink: 0,
						}}
					>
						<span title="Изменить ширину панелей">
							<DragIndicatorIcon fontSize="small" />
						</span>
					</PanelResizeHandle>
					<Panel defaultSize={45} minSize={24}>
						<Card padding="0" height="100%" overflow="hidden">
							<TrackerRegistryPage
								embedded
								toolbarLabel="Релизы"
								gridStateKey="tracker.releases"
								title="релиз"
								createLabel="Создать релиз"
								searchPlaceholder="Поиск по коду, названию, планированию…"
								rowData={releases}
								columnDefs={releaseColumnDefs}
								loading={releasesLoading}
								formFields={releaseFormFields}
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
												...imageVersionsToForm(row.imageVersions),
											}
										: {
												...TRACKER_EMPTY_FORM_VALUES,
												status: "draft",
											}
								}
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
									await createRelease.mutateAsync({
										code: values.code,
										name: values.name,
										description: values.description || null,
										status: values.status as KanbanBoardReleaseStatusId,
										planningId: values.planningId || null,
										supersprintId: values.supersprintId || null,
										sprintId: values.sprintId || null,
										startDate: values.startDate || null,
										endDate: values.endDate || null,
										imageVersions: imageVersionsFromForm(values),
									});
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
											imageVersions: imageVersionsFromForm(values),
										},
									});
								}}
								onDelete={async (rows) => {
									for (const row of rows) {
										await deleteRelease.mutateAsync(row.id);
									}
								}}
							/>
						</Card>
					</Panel>
				</PanelGroup>
			</Flex>
		</Flex>
	);
}
