import AddIcon from "@mui/icons-material/Add";
import DownloadIcon from "@mui/icons-material/Download";
import FilterListIcon from "@mui/icons-material/FilterList";
import HistoryIcon from "@mui/icons-material/History";
import PublishIcon from "@mui/icons-material/Publish";
import SearchIcon from "@mui/icons-material/Search";
import Alert from "@mui/material/Alert";
import Backdrop from "@mui/material/Backdrop";
import Badge from "@mui/material/Badge";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Collapse from "@mui/material/Collapse";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	fromBoardData,
	normalizeKanbanBoardData,
	toBoardData,
	type KanbanBoardColumnDto,
	type KanbanBoardData,
	type KanbanBoardTaskContent,
	type KanbanBoardTaskRecord,
	formatKanbanTaskKey,
	normalizeTrackerCode,
	collectKanbanBoardExpectedVersions,
	parseKanbanBoardTaskEditBlockedError,
	type KanbanBoardTaskEditBlockedErrorDto,
	type KanbanBoardItem,
} from "@smart-anketa/api-contract";
import { Kanban, dropHandler } from "react-kanban-kit";
import type { BoardData, BoardItem } from "react-kanban-kit";
import {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
	type MouseEvent,
} from "react";
import { useNavigate, useParams } from "react-router";
import { Card } from "@react-client/common/muiCustom/Card";
import { Flex } from "@react-client/common/primitives/Flex";
import { Spacer } from "@react-client/common/primitives/Spacer";
import { Header } from "@react-client/common/navigation/organisms/Header";
import { apiErrorMessage } from "@react-client/common/api/helpers/apiErrorMessage";
import {
	downloadBlob,
	kanbanBoardExportBoardSnapshot,
	kanbanBoardGetBoardTasks,
	kanbanBoardImportBoardSnapshot,
	kanbanBoardSaveBoardTasks,
	useKanbanBoardAssignees,
	useKanbanBoardBoards,
	useKanbanBoardColumns,
	useKanbanBoardConfig,
	useCreateKanbanBoardColumn,
	useDeleteKanbanBoardColumn,
	useTrashKanbanBoardColumnTasks,
	useUpdateKanbanBoardColumn,
	type KanbanBoardImportResult,
} from "@react-client/common/api/queries/kanban-board";
import {
	KanbanColumnAdder,
	KanbanColumnHeader,
	getKanbanColumnColor,
} from "@react-client/features/kanban-board/components/KanbanBoardColumnChrome";
import { KanbanBoardFilterPanel } from "@react-client/features/kanban-board/components/KanbanBoardFilterPanel";
import { KanbanTaskBoardCard } from "@react-client/features/kanban-board/components/KanbanTaskBoardCard";
import {
	kanbanTaskCreatePath,
	kanbanTaskEditPath,
	trackerBoardHistoryPath,
} from "@react-client/features/kanban-board/kanban-task-paths";
import {
	EMPTY_KANBAN_BOARD_TASK_FILTERS,
	countKanbanBoardCards,
	filterKanbanBoardData,
	kanbanBoardTaskFiltersActive,
	kanbanBoardTaskMatchesFilters,
	kanbanBoardTaskMatchesSearch,
	type KanbanBoardTaskFilters,
} from "@react-client/features/kanban-board/kanban-board-task-filter";
import { TrackerTaskConflictDialog } from "@react-client/features/tracker/components/TrackerTaskConflictDialog";
import { useTrackerBoardSync } from "@react-client/features/tracker/hooks/useTrackerBoardSync";
import { useTrackerEditIdentity } from "@react-client/features/tracker/hooks/useTrackerEditIdentity";
import { useDebouncedValue } from "@react-client/features/v2/admin_constructor/hooks/useDebouncedValue";

const KANBAN_BOARD_COLUMN_WIDTH_PX = 320;
const SEARCH_DEBOUNCE_MS = 300;

const buildBoardData = (
	tasks: Parameters<typeof toBoardData>[0],
	columns: KanbanBoardColumnDto[],
): KanbanBoardData => toBoardData(tasks, columns);

export function KanbanBoardPage() {
	const { boardKey = "" } = useParams<{ boardKey: string }>();
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [board, setBoard] = useState<KanbanBoardData | null>(null);
	const [importError, setImportError] = useState<string | null>(null);
	const [editBlocked, setEditBlocked] =
		useState<KanbanBoardTaskEditBlockedErrorDto | null>(null);
	const [pendingBoard, setPendingBoard] = useState<KanbanBoardData | null>(null);
	const [remoteStale, setRemoteStale] = useState(false);
	const [openingTaskLabel, setOpeningTaskLabel] = useState<string | null>(null);
	const [searchQuery, setSearchQuery] = useState("");
	const [filtersOpen, setFiltersOpen] = useState(false);
	const [filters, setFilters] = useState<KanbanBoardTaskFilters>(
		EMPTY_KANBAN_BOARD_TASK_FILTERS,
	);
	const debouncedSearch = useDebouncedValue(searchQuery, SEARCH_DEBOUNCE_MS);
	const editLabel = useTrackerEditIdentity();
	const [boardContextMenu, setBoardContextMenu] = useState<{
		mouseX: number;
		mouseY: number;
	} | null>(null);

	const configQuery = useKanbanBoardConfig();
	const boardsQuery = useKanbanBoardBoards();
	const assigneesQuery = useKanbanBoardAssignees();
	const boardMeta = boardsQuery.data?.find(
		(item) =>
			item.boardKey === normalizeTrackerCode(boardKey) ||
			item.id === boardKey,
	);
	const boardApiRef = boardMeta?.boardKey ?? normalizeTrackerCode(boardKey);
	const columnsQuery = useKanbanBoardColumns(boardApiRef);
	const createColumn = useCreateKanbanBoardColumn();
	const updateColumn = useUpdateKanbanBoardColumn();
	const deleteColumn = useDeleteKanbanBoardColumn();
	const trashColumnTasks = useTrashKanbanBoardColumnTasks();
	const [trashColumnConfirmId, setTrashColumnConfirmId] = useState<string | null>(
		null,
	);

	const tasksQuery = useQuery({
		queryKey: ["kanbanBoardTasks", boardApiRef],
		enabled: Boolean(boardApiRef),
		queryFn: async ({ signal }) => kanbanBoardGetBoardTasks(boardApiRef, signal),
		refetchOnMount: "always",
	});

	const resolvedBoardId =
		boardMeta?.id ?? tasksQuery.data?.[0]?.boardId ?? "";

	const standId = configQuery.data?.standId;
	const isReady =
		tasksQuery.isSuccess &&
		columnsQuery.isSuccess &&
		configQuery.isSuccess &&
		Boolean(boardApiRef) &&
		Boolean(resolvedBoardId) &&
		Boolean(standId);

	const columnsSignature = (columnsQuery.data ?? [])
		.map(
			(column) =>
				`${column.id}:${column.title}:${column.color}:${column.sortOrder}`,
		)
		.join("|");

	const tasksSignature = useMemo(
		() =>
			(tasksQuery.data ?? [])
				.map(
					(task) =>
						`${task.id}:${task.updatedAt}:${task.parentId}:${task.position}:${task.content.title}`,
				)
				.join("|"),
		[tasksQuery.data],
	);

	useEffect(() => {
		setBoard(null);
	}, [boardApiRef]);

	useEffect(() => {
		if (!columnsQuery.data || !tasksQuery.data) return;
		setBoard(buildBoardData(tasksQuery.data, columnsQuery.data));
	}, [boardApiRef, columnsSignature, columnsQuery.data, tasksSignature]);

	const getColumns = useCallback(
		() =>
			queryClient.getQueryData<KanbanBoardColumnDto[]>([
				"kanbanBoardColumns",
				boardApiRef,
			]) ??
			columnsQuery.data ??
			[],
		[boardApiRef, columnsQuery.data, queryClient],
	);

	const saveMutation = useMutation({
		mutationFn: ({
			nextBoard,
			forceOverwrite,
		}: {
			nextBoard: KanbanBoardData;
			forceOverwrite?: boolean;
		}) => {
			if (!standId || !resolvedBoardId) {
				throw new Error("Не загружен standId трекера");
			}
			const now = new Date().toISOString();
			const rows = fromBoardData(
				nextBoard,
				standId,
				now,
				resolvedBoardId,
			).map((task) => ({
				...task,
				origin: standId,
			}));
			return kanbanBoardSaveBoardTasks(boardApiRef, {
				tasks: rows,
				expectedUpdatedAtByTaskId:
					collectKanbanBoardExpectedVersions(nextBoard),
				forceOverwrite,
				lockHolderLabel: editLabel || undefined,
			});
		},
		onSuccess: (tasks) => {
			setRemoteStale(false);
			setEditBlocked(null);
			setPendingBoard(null);
			queryClient.setQueryData(["kanbanBoardTasks", boardApiRef], tasks);
			const columns = getColumns();
			if (columns.length) {
				setBoard(buildBoardData(tasks, columns));
			}
		},
		onError: (error, variables) => {
			const blocked = parseKanbanBoardTaskEditBlockedError(error);
			if (blocked) {
				setEditBlocked(blocked);
				setPendingBoard(variables.nextBoard);
			}
			const tasks = queryClient.getQueryData<KanbanBoardTaskRecord[]>([
				"kanbanBoardTasks",
				boardApiRef,
			]);
			const columns = getColumns();
			if (tasks && columns.length) {
				setBoard(buildBoardData(tasks, columns));
			}
		},
	});

	useTrackerBoardSync({
		boardRef: boardApiRef,
		enabled: isReady && !saveMutation.isPending,
		onRemoteUpdate: useCallback(() => setRemoteStale(true), []),
	});

	const exportMutation = useMutation({
		mutationFn: () => kanbanBoardExportBoardSnapshot(boardApiRef),
		onSuccess: (blob) => {
			const date = new Date().toISOString().slice(0, 10);
			downloadBlob(
				blob,
				`kanban-board-${boardApiRef}-${standId}-${date}.xlsx`,
			);
		},
	});

	const importMutation = useMutation({
		mutationFn: (file: File) =>
			kanbanBoardImportBoardSnapshot(boardApiRef, file),
		onSuccess: (result: KanbanBoardImportResult) => {
			setImportError(null);
			const nextBoard = buildBoardData(result.tasks, getColumns());
			setBoard(nextBoard);
			queryClient.setQueryData(["kanbanBoardTasks", boardApiRef], result.tasks);
		},
		onError: (
			error: Error & { response?: { data?: Record<string, string> } },
		) => {
			const payload = error.response?.data;
			if (payload?.expectedSha256 && payload?.actualSha256) {
				setImportError(
					`Проверка целостности не пройдена. Ожидался sha256 ${payload.expectedSha256}, получен ${payload.actualSha256}.`,
				);
				return;
			}
			setImportError(payload?.message ?? error.message ?? "Ошибка импорта");
		},
	});

	const persistBoard = useCallback(
		(nextBoard: KanbanBoardData, forceOverwrite?: boolean) => {
			setBoard(nextBoard);
			saveMutation.mutate({ nextBoard, forceOverwrite });
		},
		[saveMutation],
	);

	const handleEditBlocked = useCallback((error: unknown) => {
		const blocked = parseKanbanBoardTaskEditBlockedError(error);
		if (blocked) setEditBlocked(blocked);
	}, []);

	const refreshBoardFromServer = useCallback(async () => {
		const tasks = await queryClient.fetchQuery({
			queryKey: ["kanbanBoardTasks", boardApiRef],
			queryFn: ({ signal }) => kanbanBoardGetBoardTasks(boardApiRef, signal),
		});
		const columns = getColumns();
		if (columns.length) {
			setBoard(buildBoardData(tasks, columns));
		}
		setRemoteStale(false);
		setEditBlocked(null);
		setPendingBoard(null);
	}, [boardApiRef, getColumns, queryClient]);

	const openBoardHistory = useCallback(() => {
		const key = boardMeta?.boardKey ?? boardKey;
		if (!key) return;
		navigate(trackerBoardHistoryPath(key));
	}, [boardKey, boardMeta?.boardKey, navigate]);

	const handleBoardContextMenu = useCallback((event: MouseEvent) => {
		event.preventDefault();
		setBoardContextMenu({
			mouseX: event.clientX,
			mouseY: event.clientY,
		});
	}, []);

	const defaultColumnId = columnsQuery.data?.[0]?.id ?? "todo";

	const openCreateTask = useCallback(
		(columnId = defaultColumnId) => {
			navigate(kanbanTaskCreatePath(boardMeta?.boardKey ?? boardKey, columnId));
		},
		[boardKey, boardMeta?.boardKey, navigate],
	);

	const handleRenameColumn = useCallback(
		(columnId: string, title: string) => {
			if (!boardApiRef) return;
			updateColumn.mutate({ boardId: boardApiRef, columnId, data: { title } });
		},
		[boardApiRef, updateColumn],
	);

	const handleDeleteColumn = useCallback(
		(columnId: string) => {
			if (!boardApiRef) return;
			deleteColumn.mutate({ boardId: boardApiRef, columnId });
		},
		[boardApiRef, deleteColumn],
	);

	const handleAddColumn = useCallback(
		(title: string) => {
			if (!boardApiRef) return;
			createColumn.mutate({ boardId: boardApiRef, data: { title } });
		},
		[boardApiRef, createColumn],
	);

	const confirmTrashColumnTasks = useCallback(async () => {
		if (!resolvedBoardId || !trashColumnConfirmId) return;
		await trashColumnTasks.mutateAsync({
			boardId: resolvedBoardId,
			columnId: trashColumnConfirmId,
		});
		setTrashColumnConfirmId(null);
	}, [resolvedBoardId, trashColumnConfirmId, trashColumnTasks]);

	const isColumnBusy =
		createColumn.isPending ||
		updateColumn.isPending ||
		deleteColumn.isPending ||
		trashColumnTasks.isPending;
	const isBoardBusy = !isReady || !board || isColumnBusy;
	const isSavingBoard = saveMutation.isPending;

	const filtersActive = kanbanBoardTaskFiltersActive(filters);
	const searchActive = Boolean(debouncedSearch.trim());
	const viewFiltered = filtersActive || searchActive;

	const viewBoard = useMemo(() => {
		if (!board) return null;
		if (!viewFiltered) return board;
		const projectCode = boardMeta?.projectCode;
		return filterKanbanBoardData(board, (item) => {
			if (!kanbanBoardTaskMatchesSearch(item, debouncedSearch, projectCode)) {
				return false;
			}
			return kanbanBoardTaskMatchesFilters(item, filters);
		});
	}, [
		board,
		boardMeta?.projectCode,
		debouncedSearch,
		filters,
		viewFiltered,
	]);

	const totalCardCount = useMemo(
		() => (board ? countKanbanBoardCards(board) : 0),
		[board],
	);
	const matchCardCount = useMemo(
		() => (viewBoard ? countKanbanBoardCards(viewBoard) : 0),
		[viewBoard],
	);

	const assigneeFilterOptions = useMemo(
		() =>
			(assigneesQuery.data ?? []).map((item) => ({
				value: item.name,
				label: item.name,
			})),
		[assigneesQuery.data],
	);

	const createdByFilterOptions = useMemo(() => {
		const names = new Set<string>();
		for (const task of tasksQuery.data ?? []) {
			const name = task.createdBy?.trim();
			if (name) names.add(name);
		}
		for (const item of assigneesQuery.data ?? []) {
			if (item.name.trim()) names.add(item.name.trim());
		}
		return [...names]
			.sort((a, b) => a.localeCompare(b, "ru"))
			.map((name) => ({ value: name, label: name }));
	}, [assigneesQuery.data, tasksQuery.data]);

	const renderColumnHeader = useCallback(
		(column: BoardItem) => (
			<KanbanColumnHeader
				column={column}
				disabled={isBoardBusy}
				onRename={handleRenameColumn}
				onDelete={handleDeleteColumn}
				onAddTask={openCreateTask}
				onTrashAll={setTrashColumnConfirmId}
				isTrashing={trashColumnTasks.isPending}
			/>
		),
		[
			handleDeleteColumn,
			handleRenameColumn,
			isBoardBusy,
			openCreateTask,
			trashColumnTasks.isPending,
		],
	);

	const renderColumnAdder = useCallback(
		() => (
			<KanbanColumnAdder
				disabled={isBoardBusy}
				isPending={createColumn.isPending}
				onAdd={handleAddColumn}
			/>
		),
		[createColumn.isPending, handleAddColumn, isBoardBusy],
	);

	const columnStyle = useCallback((column: BoardItem) => {
		const color = getKanbanColumnColor(column);
		return {
			background: `color-mix(in srgb, ${color}, transparent 92%)`,
		};
	}, []);

	const handleCardClick = useCallback(
		(_event: MouseEvent<HTMLDivElement>, card: BoardItem) => {
			const task = tasksQuery.data?.find((item) => item.id === card.id);
			const projectCode = boardMeta?.projectCode;
			if (task?.taskNumber && projectCode) {
				const taskRef = formatKanbanTaskKey(projectCode, task.taskNumber);
				setOpeningTaskLabel(taskRef);
				navigate(kanbanTaskEditPath(taskRef));
			}
		},
		[boardMeta?.projectCode, navigate, tasksQuery.data],
	);

	const handleTaskContentUpdated = useCallback(
		(taskId: string, content: KanbanBoardTaskContent) => {
			setBoard((prev) => {
				if (!prev?.[taskId]) return prev;
				return {
					...prev,
					[taskId]: {
						...prev[taskId],
						content,
					},
				};
			});
		},
		[],
	);

	if (boardsQuery.isLoading) {
		return <Alert severity="info">Загрузка доски…</Alert>;
	}

	if (
		boardsQuery.isSuccess &&
		boardKey &&
		columnsQuery.isError &&
		tasksQuery.isError
	) {
		return <Alert severity="warning">Доска «{boardKey}» не найдена</Alert>;
	}

	const boardSubtitle = boardMeta
		? `${boardMeta.boardKey} · ${boardMeta.name} · стенд ${standId ?? "…"}`
		: `${boardKey} · стенд ${standId ?? "…"}`;

	return (
		<Flex
			flexDirection="column"
			flexGrow={1}
			minHeight="0"
			minWidth="0"
			maxWidth="100%"
			width="100%"
			sx={{ height: "100%", overflow: "hidden", boxSizing: "border-box" }}
			data-test-id="kanban-board-page"
			onContextMenu={handleBoardContextMenu}
		>
			<Header
				leadingAccessory={
					<Typography variant="body2" color="text.secondary" noWrap>
						{boardSubtitle}
					</Typography>
				}
			>
				<Flex gap={6} wrap="wrap" alignItems="center">
					<TextField
						size="small"
						placeholder="Быстрый поиск…"
						value={searchQuery}
						onChange={(event) => setSearchQuery(event.target.value)}
						sx={{ width: { xs: "100%", sm: 260 }, maxWidth: 360, flexShrink: 0 }}
						InputProps={{
							startAdornment: (
								<InputAdornment position="start">
									<SearchIcon fontSize="small" color="action" />
								</InputAdornment>
							),
						}}
						inputProps={{ "aria-label": "Быстрый поиск по задачам" }}
					/>
					<IconButton
						size="small"
						color={filtersOpen || filtersActive ? "primary" : "default"}
						onClick={() => setFiltersOpen((open) => !open)}
						title="Панель фильтров"
						aria-label="Панель фильтров"
						aria-pressed={filtersOpen}
					>
						<Badge
							color="primary"
							variant="dot"
							invisible={!filtersActive}
							overlap="circular"
						>
							<FilterListIcon fontSize="small" />
						</Badge>
					</IconButton>
					{viewFiltered ? (
						<Typography variant="caption" color="text.secondary" noWrap>
							{matchCardCount} / {totalCardCount}
						</Typography>
					) : null}
					<Spacer />
					<Button
						startIcon={<HistoryIcon />}
						variant="outlined"
						size="small"
						onClick={openBoardHistory}
						disabled={!boardApiRef}
					>
						История
					</Button>
					<Button
						startIcon={<AddIcon />}
						variant="contained"
						size="small"
						onClick={() => openCreateTask(defaultColumnId)}
						disabled={isBoardBusy}
					>
						Добавить задачу
					</Button>
					<Button
						startIcon={<DownloadIcon />}
						variant="outlined"
						size="small"
						onClick={() => exportMutation.mutate()}
						disabled={exportMutation.isPending}
					>
						Экспорт XLSX
					</Button>
					<Button
						startIcon={<PublishIcon />}
						variant="outlined"
						size="small"
						onClick={() => fileInputRef.current?.click()}
						disabled={importMutation.isPending}
					>
						Импорт XLSX
					</Button>
					<input
						ref={fileInputRef}
						type="file"
						accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
						hidden
						onChange={(event) => {
							const file = event.target.files?.[0];
							event.target.value = "";
							if (file) importMutation.mutate(file);
						}}
					/>
				</Flex>
			</Header>
			<Collapse in={filtersOpen} unmountOnExit>
				<KanbanBoardFilterPanel
					filters={filters}
					onChange={setFilters}
					assigneeOptions={assigneeFilterOptions}
					createdByOptions={createdByFilterOptions}
					matchCount={matchCardCount}
					totalCount={totalCardCount}
				/>
			</Collapse>
			<Card
				overflow="hidden"
				sx={{
					p: "4px",
					flex: 1,
					minHeight: 0,
					minWidth: 0,
					width: "100%",
					maxWidth: "100%",
					display: "flex",
					flexDirection: "column",
					overflow: "hidden",
					boxSizing: "border-box",
					"& > div": {
						display: "flex",
						flexDirection: "column",
						flex: 1,
						minHeight: 0,
						minWidth: 0,
						width: "100%",
						maxWidth: "100%",
						overflow: "hidden",
					},
				}}
			>
				{(importError ||
					remoteStale ||
					tasksQuery.isError ||
					(saveMutation.isError && !editBlocked) ||
					columnsQuery.isError ||
					createColumn.isError ||
					updateColumn.isError ||
					deleteColumn.isError) && (
					<Stack spacing={2} sx={{ flexShrink: 0, mb: 2 }}>
						{importError ? <Alert severity="error">{importError}</Alert> : null}
						{remoteStale ? (
							<Alert
								severity="info"
								action={
									<Button
										color="inherit"
										size="small"
										onClick={() => void refreshBoardFromServer()}
									>
										Обновить
									</Button>
								}
							>
								Доска изменилась на сервере. Обновите данные перед сохранением.
							</Alert>
						) : null}
						{tasksQuery.isError ? (
							<Alert severity="error">Не удалось загрузить задачи</Alert>
						) : null}
						{saveMutation.isError && !editBlocked ? (
							<Alert severity="error">Не удалось сохранить изменения</Alert>
						) : null}
						{columnsQuery.isError ? (
							<Alert severity="error">Не удалось загрузить колонки</Alert>
						) : null}
						{createColumn.isError ? (
							<Alert severity="error">Не удалось добавить колонку</Alert>
						) : null}
						{updateColumn.isError ? (
							<Alert severity="error">Не удалось переименовать колонку</Alert>
						) : null}
						{deleteColumn.isError ? (
							<Alert severity="error">
								{apiErrorMessage(deleteColumn.error)}
							</Alert>
						) : null}
					</Stack>
				)}

				<Box
					data-test-id="kanban-board-page-content"
					sx={{
						flex: 1,
						minHeight: 0,
						minWidth: 0,
						width: "100%",
						maxWidth: "100%",
						overflow: "auto",
						boxSizing: "border-box",
					}}
				>
					<Box
						sx={{
							display: "inline-block",
							verticalAlign: "top",
							minWidth: "100%",
							minHeight: "100%",
							boxSizing: "border-box",
							"& .rkk-board": {
								overflow: "visible",
								height: "auto",
								minHeight: "100%",
								width: "max-content",
								minWidth: "100%",
								alignItems: "flex-start",
							},
							"& .rkk-column-outer": {
								height: "auto",
								alignSelf: "stretch",
								width: KANBAN_BOARD_COLUMN_WIDTH_PX,
								minWidth: KANBAN_BOARD_COLUMN_WIDTH_PX,
								maxWidth: KANBAN_BOARD_COLUMN_WIDTH_PX,
							},
							"& .rkk-column-outer .rkk-column": {
								height: "auto",
								minHeight: "100%",
								overflow: "visible",
								borderRadius: "4px",
								width: "100%",
							},
							"& .rkk-column-outer .rkk-column-wrapper": {
								maxHeight: "none",
							},
							"& .rkk-column-content": {
								height: "auto",
								flex: "none",
								minHeight: "unset",
							},
							"& .rkk-column-content-list": {
								height: "auto",
								overflow: "visible",
							},
						}}
					>
						{viewBoard ? (
							<Kanban
								dataSource={viewBoard as BoardData}
								rootStyle={{
									height: "auto",
									minHeight: "100%",
									width: "max-content",
									minWidth: "100%",
								}}
								cardsGap={8}
								renderColumnHeader={renderColumnHeader}
								renderColumnAdder={renderColumnAdder}
								allowColumnAdder={!isBoardBusy}
								columnStyle={columnStyle}
								onCardClick={handleCardClick}
								configMap={{
									card: {
										render: ({
											data,
											column,
										}: {
											data: BoardItem;
											column: BoardItem;
										}) => (
											<KanbanTaskBoardCard
												taskId={data.id}
												boardId={resolvedBoardId}
												parentId={data.parentId ?? column.id}
												taskKey={
													boardMeta?.projectCode &&
													(data as KanbanBoardItem).taskNumber
														? formatKanbanTaskKey(
																boardMeta.projectCode,
																(data as KanbanBoardItem).taskNumber!,
															)
														: undefined
												}
												title={data.title}
												content={
													data.content as KanbanBoardTaskContent | undefined
												}
												createdAt={(data as KanbanBoardItem).createdAt}
												createdBy={(data as KanbanBoardItem).createdBy}
												commentCount={(data as KanbanBoardItem).commentCount}
												taskUpdatedAt={(data as KanbanBoardItem).updatedAt}
												editLabel={editLabel}
												columnColor={getKanbanColumnColor(column)}
												isBoardBusy={isBoardBusy}
												highlightQuery={debouncedSearch}
												onContentUpdated={handleTaskContentUpdated}
												onEditBlocked={handleEditBlocked}
											/>
										),
									},
								}}
								onCardMove={(move) => {
									if (isSavingBoard || !standId || viewFiltered) return;
									const nextBoard = normalizeKanbanBoardData(
										dropHandler(move, board as BoardData) as KanbanBoardData,
									);
									persistBoard(nextBoard);
								}}
							/>
						) : null}
					</Box>
				</Box>
			</Card>
			<Menu
				open={boardContextMenu !== null}
				onClose={() => setBoardContextMenu(null)}
				anchorReference="anchorPosition"
				anchorPosition={
					boardContextMenu
						? { top: boardContextMenu.mouseY, left: boardContextMenu.mouseX }
						: undefined
				}
			>
				<MenuItem
					onClick={() => {
						setBoardContextMenu(null);
						openBoardHistory();
					}}
				>
					История изменений
				</MenuItem>
			</Menu>
			<TrackerTaskConflictDialog
				open={Boolean(editBlocked)}
				error={editBlocked}
				onClose={() => {
					setEditBlocked(null);
					setPendingBoard(null);
				}}
				onRefresh={() => {
					void refreshBoardFromServer();
				}}
				onForceOverwrite={() => {
					setEditBlocked(null);
					if (pendingBoard) persistBoard(pendingBoard, true);
				}}
			/>
			<Dialog
				open={Boolean(trashColumnConfirmId)}
				onClose={() => setTrashColumnConfirmId(null)}
				maxWidth="xs"
				fullWidth
			>
				<DialogTitle>Очистить колонку в корзину?</DialogTitle>
				<DialogContent>
					<DialogContentText>
						Все задачи из колонки «
						{trashColumnConfirmId
							? (columnsQuery.data?.find(
									(column) => column.id === trashColumnConfirmId,
								)?.title ?? trashColumnConfirmId)
							: ""}
						» будут перемещены в корзину. Полное удаление — вручную в разделе
						«Корзина».
					</DialogContentText>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setTrashColumnConfirmId(null)}>Отмена</Button>
					<Button
						variant="contained"
						color="warning"
						disabled={trashColumnTasks.isPending}
						onClick={() => void confirmTrashColumnTasks()}
					>
						В корзину
					</Button>
				</DialogActions>
			</Dialog>
			<Backdrop
				open={Boolean(openingTaskLabel)}
				sx={{
					zIndex: (theme) => theme.zIndex.modal + 1,
					color: "common.white",
					flexDirection: "column",
					gap: 12,
				}}
			>
				<CircularProgress color="inherit" size={40} />
				<Typography variant="body1">
					Открываем задачу{openingTaskLabel ? ` ${openingTaskLabel}` : ""}…
				</Typography>
			</Backdrop>
		</Flex>
	);
}
