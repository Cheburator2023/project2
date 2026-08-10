import type { ColDef, ICellRendererParams } from "ag-grid-community";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import TextField from "@mui/material/TextField";
import {
	useKanbanBoardTasksTrash,
	usePurgeKanbanBoardTask,
	useRestoreKanbanBoardTask,
} from "@react-client/common/api/queries/kanban-board";
import { Flex } from "@react-client/common/primitives/Flex";
import { Spacer } from "@react-client/common/primitives/Spacer";
import { Header } from "@react-client/common/navigation/organisms/Header";
import {
	TrackerBoardChips,
	TrackerProjectChips,
	trackerBoardFilterText,
	trackerProjectFilterText,
} from "@react-client/features/tracker/components/TrackerRegistryChipCell";
import {
	TrackerRegistryGrid,
	trackerDateFormatter,
	type TrackerRegistryBulkContextAction,
	type TrackerRegistryContextAction,
} from "@react-client/features/tracker/components/TrackerRegistryGrid";
import {
	TrackerTaskPriorityChip,
	TrackerTaskStatusChip,
} from "@react-client/features/tracker/components/TrackerTaskFieldChips";
import { V2AdminButton } from "@react-client/features/v2/admin/atoms/V2AdminButton";
import type { KanbanBoardTaskRegistryDto } from "@smart-anketa/api-contract";
import { useCallback, useMemo, useState } from "react";

export function TrackerTrashPage() {
	const { data = [], isLoading } = useKanbanBoardTasksTrash();
	const purgeTask = usePurgeKanbanBoardTask();
	const restoreTask = useRestoreKanbanBoardTask();
	const [quickFilter, setQuickFilter] = useState("");
	const [selected, setSelected] = useState<KanbanBoardTaskRegistryDto[]>([]);
	const [pendingPurge, setPendingPurge] = useState<
		KanbanBoardTaskRegistryDto[] | null
	>(null);
	const [isBusy, setIsBusy] = useState(false);

	const columnDefs = useMemo<ColDef<KanbanBoardTaskRegistryDto>[]>(
		() => [
			{ field: "taskKey", headerName: "Ключ", width: 120 },
			{ field: "title", headerName: "Заголовок", flex: 1.2, minWidth: 180 },
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
				minWidth: 180,
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
				minWidth: 160,
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
				headerName: "Была в колонке",
				minWidth: 140,
				valueGetter: (params) => params.data?.statusTitle ?? "",
				cellRenderer: (
					params: ICellRendererParams<KanbanBoardTaskRegistryDto>,
				) =>
					params.data ? (
						<TrackerTaskStatusChip statusTitle={params.data.statusTitle} />
					) : null,
			},
			{
				field: "deletedAt",
				headerName: "В корзине с",
				minWidth: 170,
				valueFormatter: (params) => trackerDateFormatter(params.value),
			},
		],
		[],
	);

	const restoreRows = useCallback(
		async (rows: KanbanBoardTaskRegistryDto[]) => {
			setIsBusy(true);
			try {
				for (const row of rows) {
					await restoreTask.mutateAsync(row.id);
				}
				setSelected([]);
			} finally {
				setIsBusy(false);
			}
		},
		[restoreTask],
	);

	const confirmPurge = useCallback(async () => {
		if (!pendingPurge?.length) return;
		setIsBusy(true);
		try {
			for (const row of pendingPurge) {
				await purgeTask.mutateAsync(row.id);
			}
			setPendingPurge(null);
			setSelected([]);
		} finally {
			setIsBusy(false);
		}
	}, [pendingPurge, purgeTask]);

	const contextActions = useMemo<
		TrackerRegistryContextAction<KanbanBoardTaskRegistryDto>[]
	>(
		() => [
			{
				label: "Восстановить",
				onClick: (row) => void restoreRows([row]),
			},
			{
				label: "Удалить навсегда",
				onClick: (row) => setPendingPurge([row]),
			},
		],
		[restoreRows],
	);

	const bulkContextActions = useMemo<
		TrackerRegistryBulkContextAction<KanbanBoardTaskRegistryDto>[]
	>(
		() => [
			{
				label: "Восстановить",
				disabled: (rows) => !rows.length,
				onClick: (rows) => void restoreRows(rows),
			},
			{
				label: "Удалить навсегда",
				disabled: (rows) => !rows.length,
				onClick: (rows) => setPendingPurge(rows),
			},
		],
		[restoreRows],
	);

	return (
		<>
			<Flex flexDirection="column" flexGrow={1} minHeight="0">
				<Header>
					<Flex gap={6} wrap="wrap" alignItems="center">
						<TextField
							size="small"
							placeholder="Поиск по корзине…"
							value={quickFilter}
							onChange={(event) => setQuickFilter(event.target.value)}
							sx={{
								width: { xs: "100%", sm: 320 },
								maxWidth: 420,
								flexShrink: 0,
							}}
						/>
						<Spacer />
						{selected.length ? (
							<>
								<V2AdminButton
									variant="outlined"
									disabled={isBusy}
									onClick={() => void restoreRows(selected)}
								>
									Восстановить ({selected.length})
								</V2AdminButton>
								<V2AdminButton
									variant="outlined"
									color="error"
									disabled={isBusy}
									onClick={() => setPendingPurge(selected)}
								>
									Удалить навсегда ({selected.length})
								</V2AdminButton>
							</>
						) : null}
					</Flex>
				</Header>
				<TrackerRegistryGrid
					gridStateKey="tracker.trash"
					rowData={data}
					columnDefs={columnDefs}
					loading={isLoading || isBusy}
					quickFilter={quickFilter}
					contextActions={contextActions}
					bulkContextActions={bulkContextActions}
					onSelectionChange={setSelected}
				/>
			</Flex>

			<Dialog
				open={Boolean(pendingPurge?.length)}
				onClose={() => setPendingPurge(null)}
				maxWidth="xs"
				fullWidth
			>
				<DialogTitle>Удалить навсегда?</DialogTitle>
				<DialogContent>
					<DialogContentText>
						Удалить {pendingPurge?.length ?? 0} задач(и) без возможности
						восстановления?
					</DialogContentText>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setPendingPurge(null)}>Отмена</Button>
					<Button
						variant="contained"
						color="error"
						disabled={isBusy}
						onClick={() => void confirmPurge()}
					>
						Удалить навсегда
					</Button>
				</DialogActions>
			</Dialog>
		</>
	);
}
