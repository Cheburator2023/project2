import type { ColDef, ICellRendererParams } from "ag-grid-community";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import {
	useDeleteKanbanBoardTask,
	useKanbanBoardTasksRegistry,
} from "@react-client/common/api/queries/kanban-board";
import { Flex } from "@react-client/common/primitives/Flex";
import { Card } from "@react-client/common/muiCustom/Card";
import {
	TrackerBoardChips,
	TrackerProjectChips,
	trackerBoardFilterText,
	trackerProjectFilterText,
} from "@react-client/features/tracker/components/TrackerRegistryChipCell";
import { TrackerRegistryPage } from "@react-client/features/tracker/components/TrackerRegistryPage";
import { trackerDateFormatter } from "@react-client/features/tracker/components/TrackerRegistryGrid";
import {
	TrackerTaskCurrentAssigneeChip,
	TrackerTaskPriorityChip,
	TrackerTaskStatusChip,
} from "@react-client/features/tracker/components/TrackerTaskFieldChips";
import { useTrackerEditIdentity } from "@react-client/features/tracker/hooks/useTrackerEditIdentity";
import {
	buildTrackerMyTasksDashboard,
	isTrackerMyTask,
	trackerMyTaskRoles,
} from "@react-client/features/tracker/tracker-my-tasks";
import { KanbanPageStatus } from "@react-client/features/kanban-board/components/KanbanPageStatus";
import {
	kanbanTaskEditPath,
	trackerStandaloneTaskCreatePath,
} from "@react-client/features/kanban-board/kanban-task-paths";
import { commonRoutes } from "@react-client/routing/common/routes";
import type { KanbanBoardTaskRegistryDto } from "@smart-anketa/api-contract";
import { useMemo } from "react";
import { useNavigate } from "react-router";

function StatCard({
	label,
	value,
	hint,
	accent = "#2563eb",
}: {
	label: string;
	value: number;
	hint?: string;
	accent?: string;
}) {
	return (
		<Card
			padding="12px 14px"
			sx={{
				minWidth: 140,
				flex: "1 1 140px",
				border: "1px solid",
				borderColor: "divider",
				bgcolor: (theme) => alpha(accent, theme.palette.mode === "dark" ? 0.12 : 0.06),
			}}
		>
			<Typography variant="caption" color="text.secondary" fontWeight={600}>
				{label}
			</Typography>
			<Typography variant="h5" fontWeight={800} sx={{ color: accent, lineHeight: 1.2 }}>
				{value}
			</Typography>
			{hint ? (
				<Typography variant="caption" color="text.secondary">
					{hint}
				</Typography>
			) : null}
		</Card>
	);
}

export function TrackerMyTasksPage() {
	const navigate = useNavigate();
	const me = useTrackerEditIdentity();
	const { data = [], isLoading } = useKanbanBoardTasksRegistry();
	const deleteTask = useDeleteKanbanBoardTask();

	const myTasks = useMemo(
		() => data.filter((task) => isTrackerMyTask(task, me)),
		[data, me],
	);
	const dashboard = useMemo(
		() => buildTrackerMyTasksDashboard(myTasks, me),
		[myTasks, me],
	);

	const openTask = (row: KanbanBoardTaskRegistryDto) => {
		navigate(kanbanTaskEditPath(row.taskKey));
	};

	const columnDefs = useMemo<ColDef<KanbanBoardTaskRegistryDto>[]>(
		() => [
			{ field: "taskKey", headerName: "Ключ", width: 120 },
			{ field: "title", headerName: "Заголовок", flex: 1.3, minWidth: 180 },
			{
				colId: "myRole",
				headerName: "Моя роль",
				minWidth: 160,
				valueGetter: (params) => {
					if (!params.data) return "";
					const roles = trackerMyTaskRoles(params.data, me);
					return [
						roles.asAssignee ? "Исполнитель" : "",
						roles.asCreator ? "Назначил" : "",
					]
						.filter(Boolean)
						.join(", ");
				},
				cellRenderer: (
					params: ICellRendererParams<KanbanBoardTaskRegistryDto>,
				) => {
					if (!params.data) return null;
					const roles = trackerMyTaskRoles(params.data, me);
					return (
						<Flex gap={4} wrap="wrap" alignItems="center">
							{roles.asAssignee ? (
								<Chip size="small" label="Исполнитель" color="primary" variant="outlined" />
							) : null}
							{roles.asCreator ? (
								<Chip size="small" label="Назначил" color="secondary" variant="outlined" />
							) : null}
						</Flex>
					);
				},
			},
			{
				colId: "priority",
				headerName: "Приоритет",
				width: 110,
				valueGetter: (params) => params.data?.priorityTitle ?? "",
				cellRenderer: (
					params: ICellRendererParams<KanbanBoardTaskRegistryDto>,
				) =>
					params.data ? (
						<TrackerTaskPriorityChip
							priority={params.data.content.priority}
							priorityTitle={params.data.priorityTitle}
						/>
					) : null,
			},
			{
				colId: "project",
				headerName: "Проект",
				flex: 1,
				minWidth: 160,
				valueGetter: (params) =>
					trackerProjectFilterText({
						projectCode: params.data?.projectCode,
						projectName: params.data?.projectName,
					}),
				cellRenderer: (
					params: ICellRendererParams<KanbanBoardTaskRegistryDto>,
				) =>
					params.data ? (
						<TrackerProjectChips
							projectCode={params.data.projectCode}
							projectName={params.data.projectName}
						/>
					) : null,
			},
			{
				colId: "board",
				headerName: "Доска",
				flex: 1,
				minWidth: 150,
				valueGetter: (params) =>
					trackerBoardFilterText({
						boardSlug: params.data?.boardSlug,
						boardName: params.data?.boardName,
					}),
				cellRenderer: (
					params: ICellRendererParams<KanbanBoardTaskRegistryDto>,
				) =>
					params.data ? (
						<TrackerBoardChips
							boardSlug={params.data.boardSlug}
							boardName={params.data.boardName}
						/>
					) : null,
			},
			{
				colId: "status",
				headerName: "Статус",
				width: 130,
				valueGetter: (params) => params.data?.statusTitle ?? "",
				cellRenderer: (
					params: ICellRendererParams<KanbanBoardTaskRegistryDto>,
				) =>
					params.data ? (
						<TrackerTaskStatusChip
							statusId={params.data.parentId}
							statusTitle={params.data.statusTitle}
						/>
					) : null,
			},
			{
				colId: "currentAssignee",
				headerName: "Текущий исполнитель",
				minWidth: 150,
				valueGetter: (params) => params.data?.currentAssigneeTitle ?? "",
				cellRenderer: (
					params: ICellRendererParams<KanbanBoardTaskRegistryDto>,
				) =>
					params.data ? (
						<TrackerTaskCurrentAssigneeChip
							currentAssigneeTitle={params.data.currentAssigneeTitle}
						/>
					) : null,
			},
			{
				field: "createdBy",
				headerName: "Назначил",
				minWidth: 140,
				valueGetter: (params) => params.data?.createdBy ?? "",
			},
			{ field: "dueDate", headerName: "Срок", width: 130 },
			{
				field: "updatedAt",
				headerName: "Обновлено",
				minWidth: 170,
				valueFormatter: (params) => trackerDateFormatter(params.value),
			},
		],
		[me],
	);

	if (!me) {
		return (
			<KanbanPageStatus
				title="Не выбран текущий пользователь"
				description="Укажите «Я — исполнитель» в настройках трекера — тогда здесь появятся ваши задачи по всем доскам."
				action={
					<Button
						variant="contained"
						onClick={() => navigate(commonRoutes.trackerSettings.rootPath)}
					>
						Открыть настройки
					</Button>
				}
			/>
		);
	}

	return (
		<Flex flexDirection="column" flexGrow={1} minHeight="0" gap={10}>
			<Flex
				flexDirection="column"
				gap={10}
				sx={{ px: { xs: 1.5, md: 2 }, pt: 1.5, flexShrink: 0 }}
			>
				<Flex alignItems="baseline" gap={8} wrap="wrap">
					<Typography variant="h6" fontWeight={800}>
						Мои задачи
					</Typography>
					<Typography variant="body2" color="text.secondary">
						{me} · по всем доскам
					</Typography>
				</Flex>

				<Flex gap={10} wrap="wrap">
					<StatCard label="Всего" value={dashboard.total} accent="#2563eb" />
					<StatCard
						label="Как исполнитель"
						value={dashboard.asAssignee}
						accent="#0891b2"
					/>
					<StatCard
						label="Как назначивший"
						value={dashboard.asCreator}
						accent="#7c3aed"
					/>
					<StatCard
						label="Высокий приоритет"
						value={dashboard.highPriority}
						accent="#dc2626"
					/>
				</Flex>

				{(dashboard.byBoard.length > 0 || dashboard.byStatus.length > 0) && (
					<Flex gap={10} wrap="wrap">
						{dashboard.byBoard.length ? (
							<Card padding="12px 14px" sx={{ flex: "1 1 260px", minWidth: 240 }}>
								<Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
									По доскам
								</Typography>
								<Flex gap={6} wrap="wrap">
									{dashboard.byBoard.map((item) => (
										<Chip
											key={item.boardKey}
											size="small"
											label={`${item.boardName}: ${item.count}`}
											variant="outlined"
										/>
									))}
								</Flex>
							</Card>
						) : null}
						{dashboard.byStatus.length ? (
							<Card padding="12px 14px" sx={{ flex: "1 1 260px", minWidth: 240 }}>
								<Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
									По статусам
								</Typography>
								<Flex gap={6} wrap="wrap">
									{dashboard.byStatus.map((item) => (
										<Chip
											key={item.statusTitle}
											size="small"
											label={`${item.statusTitle}: ${item.count}`}
											variant="outlined"
										/>
									))}
								</Flex>
							</Card>
						) : null}
					</Flex>
				)}

				{!isLoading && myTasks.length === 0 ? (
					<Alert severity="info">
						Нет задач, где вы исполнитель или назначивший. Создайте задачу или
						дождитесь назначения.
					</Alert>
				) : null}
			</Flex>

			<TrackerRegistryPage
				gridStateKey="tracker.my-tasks"
				title="задача"
				createLabel="Создать задачу"
				searchPlaceholder="Поиск по моим задачам…"
				rowData={myTasks}
				columnDefs={columnDefs}
				loading={isLoading}
				onCreateClick={() => navigate(trackerStandaloneTaskCreatePath())}
				onEditClick={openTask}
				onRowDoubleClick={openTask}
				deleteDialogTitle="В корзину"
				deleteDialogText={(count) =>
					`Переместить ${count} задач(и) в корзину?`
				}
				onDelete={async (rows) => {
					for (const row of rows) {
						await deleteTask.mutateAsync(row.id);
					}
				}}
			/>
		</Flex>
	);
}
