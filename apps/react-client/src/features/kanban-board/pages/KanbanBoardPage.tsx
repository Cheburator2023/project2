import AddIcon from "@mui/icons-material/Add";
import DownloadIcon from "@mui/icons-material/Download";
import FilterListIcon from "@mui/icons-material/FilterList";
import PeopleAltOutlinedIcon from "@mui/icons-material/PeopleAltOutlined";
import ViewColumnIcon from "@mui/icons-material/ViewColumn";
import HistoryIcon from "@mui/icons-material/History";
import PublishIcon from "@mui/icons-material/Publish";
import SearchIcon from "@mui/icons-material/Search";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import Alert from "@mui/material/Alert";
import Backdrop from "@mui/material/Backdrop";
import Badge from "@mui/material/Badge";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Collapse from "@mui/material/Collapse";
import Dialog from "@mui/material/Dialog";
import Divider from "@mui/material/Divider";
import ListSubheader from "@mui/material/ListSubheader";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	fromBoardData,
	normalizeKanbanBoardData,
	toBoardData,
	findKanbanBoardCancelledColumnId,
	kanbanBoardDisplayColumnTitle,
	kanbanBoardIsCancelledColumn,
	kanbanBoardIsDoneColumn,
	kanbanBoardResolveColumnId,
	collapseKanbanBoardReleasesLanes,
	expandKanbanBoardReleasesLanes,
	parseKanbanBoardReleasesLaneId,
	moveKanbanBoardCardToColumn,
	withKanbanBoardCurrentAssignee,
	type KanbanBoardColumnDto,
	type KanbanBoardData,
	type KanbanBoardItem,
	type KanbanBoardTaskContent,
	type KanbanBoardTaskRecord,
	formatKanbanTaskKey,
	normalizeTrackerCode,
	collectKanbanBoardExpectedVersions,
	parseKanbanBoardTaskEditBlockedError,
	countKanbanBoardBlockers,
	countKanbanBoardColumnBlockers,
	kanbanBoardReleaseCanComplete,
	kanbanBoardTaskReleaseLabel,
	KANBAN_BOARD_RELEASE_DONE_STATUS_ID,
	type KanbanBoardTaskEditBlockedErrorDto,
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
import { useNavigate, useParams, useSearchParams } from "react-router";
import { Card } from "@react-client/common/muiCustom/Card";
import { Flex } from "@react-client/common/primitives/Flex";
import { Spacer } from "@react-client/common/primitives/Spacer";
import { Header } from "@react-client/common/navigation/organisms/Header";
import { apiErrorMessage } from "@react-client/common/api/helpers/apiErrorMessage";
import { toast } from "@react-client/common/toasts";
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
	useKanbanBoardCustomers,
	useKanbanBoardReleases,
	useKanbanBoardSprints,
	useKanbanBoardStreams,
	useCompleteKanbanBoardRelease,
	useCreateKanbanBoardColumn,
	useDeleteKanbanBoardColumn,
	useTrashKanbanBoardColumnTasks,
	useUpdateKanbanBoardColumn,
	useUpdateKanbanBoardTask,
	type KanbanBoardImportResult,
} from "@react-client/common/api/queries/kanban-board";
import {
	KanbanColumnAdder,
	KanbanColumnHeader,
	KanbanBlockerCountChip,
	getKanbanColumnColor,
} from "@react-client/features/kanban-board/components/KanbanBoardColumnChrome";
import { KanbanBoardFilterPanel } from "@react-client/features/kanban-board/components/KanbanBoardFilterPanel";
import { KanbanBoardPeopleView } from "@react-client/features/kanban-board/components/KanbanBoardPeopleView";
import { KanbanTaskBoardCard } from "@react-client/features/kanban-board/components/KanbanTaskBoardCard";
import { useKanbanBoardPageScroll } from "@react-client/features/kanban-board/useKanbanBoardPageScroll";
import {
	kanbanBoardColumnWrapperClassName,
	kanbanBoardColumnWrapperStyle,
	kanbanBoardRkkBoardSx,
} from "@react-client/features/kanban-board/kanbanBoardColumnLayout";
import {
	kanbanTaskEditPath,
	trackerBoardHistoryPath,
	trackerBoardPath,
	type KanbanBoardReturnLocationState,
} from "@react-client/features/kanban-board/kanban-task-paths";
import { groupKanbanBoardByCurrentAssignee } from "@react-client/features/kanban-board/kanbanBoardPeopleGroups";
import { useCreateAndOpenKanbanTask } from "@react-client/features/kanban-board/useCreateAndOpenKanbanTask";
import {
	countKanbanBoardCards,
	filterKanbanBoardData,
	kanbanBoardTaskFiltersActive,
	kanbanBoardTaskMatchesFilters,
	kanbanBoardTaskMatchesSearch,
	applyKanbanBoardViewToSearchParams,
	parseKanbanBoardLayout,
	parseKanbanBoardSearchQuery,
	parseKanbanBoardTaskFiltersFromSearchParams,
	type KanbanBoardTaskFilters,
} from "@react-client/features/kanban-board/kanban-board-task-filter";
import { TrackerBoardSettingsDialog } from "@react-client/features/tracker/components/TrackerBoardSettingsDialog";
import { TrackerTaskConflictDialog } from "@react-client/features/tracker/components/TrackerTaskConflictDialog";
import { useTrackerBoardSync } from "@react-client/features/tracker/hooks/useTrackerBoardSync";
import { useTrackerEditIdentity } from "@react-client/features/tracker/hooks/useTrackerEditIdentity";
import { useDebouncedValue } from "@react-client/features/v2/admin_constructor/hooks/useDebouncedValue";

const SEARCH_DEBOUNCE_MS = 300;

const buildBoardData = (
	tasks: Parameters<typeof toBoardData>[0],
	columns: KanbanBoardColumnDto[],
): KanbanBoardData => toBoardData(tasks, columns);

function ensureCancelledColumnOnBoard(
	board: KanbanBoardData,
	column: Pick<KanbanBoardColumnDto, "id" | "title" | "color">,
): KanbanBoardData {
	if (board[column.id]) return board;
	const children = [...(board.root.children ?? [])];
	const doneIndex = children.findIndex((id) =>
		kanbanBoardIsDoneColumn({ id, title: board[id]?.title }),
	);
	const insertAt = doneIndex >= 0 ? doneIndex : children.length;
	children.splice(insertAt, 0, column.id);
	return {
		...board,
		root: {
			...board.root,
			children,
			totalChildrenCount: children.length,
		},
		[column.id]: {
			id: column.id,
			title: column.title,
			parentId: "root",
			children: [],
			totalChildrenCount: 0,
			content: { color: column.color },
		},
	};
}

export function KanbanBoardPage() {
	const { boardKey = "" } = useParams<{ boardKey: string }>();
	const navigate = useNavigate();
	const [searchParams, setSearchParams] = useSearchParams();
	const queryClient = useQueryClient();
	const fileInputRef = useRef<HTMLInputElement>(null);
	const searchInputRef = useRef<HTMLInputElement>(null);
	const [board, setBoard] = useState<KanbanBoardData | null>(null);
	const [importError, setImportError] = useState<string | null>(null);
	const [editBlocked, setEditBlocked] =
		useState<KanbanBoardTaskEditBlockedErrorDto | null>(null);
	const [pendingBoard, setPendingBoard] = useState<KanbanBoardData | null>(
		null,
	);
	const [remoteStale, setRemoteStale] = useState(false);
	const [openingTaskLabel, setOpeningTaskLabel] = useState<string | null>(null);
	const [boardSettingsOpen, setBoardSettingsOpen] = useState(false);
	const urlSearchQuery = parseKanbanBoardSearchQuery(searchParams);
	const [searchDraft, setSearchDraft] = useState(urlSearchQuery);
	const layout = parseKanbanBoardLayout(searchParams);
	const filters = useMemo(
		() => parseKanbanBoardTaskFiltersFromSearchParams(searchParams),
		[searchParams],
	);
	const [filtersOpen, setFiltersOpen] = useState(() =>
		kanbanBoardTaskFiltersActive(
			parseKanbanBoardTaskFiltersFromSearchParams(searchParams),
		),
	);
	const debouncedSearch = useDebouncedValue(searchDraft, SEARCH_DEBOUNCE_MS);
	const editLabel = useTrackerEditIdentity();
	const boardSearch = searchParams.toString();
	const boardReturnState = useMemo<KanbanBoardReturnLocationState>(
		() => ({ boardSearch }),
		[boardSearch],
	);
	const setBoardView = useCallback(
		(next: { filters?: KanbanBoardTaskFilters; query?: string }) => {
			setSearchParams(
				(prev) =>
					applyKanbanBoardViewToSearchParams(prev, {
						filters:
							next.filters ?? parseKanbanBoardTaskFiltersFromSearchParams(prev),
						query: next.query ?? parseKanbanBoardSearchQuery(prev),
					}),
				{ replace: true },
			);
		},
		[setSearchParams],
	);
	useEffect(() => {
		if (debouncedSearch === urlSearchQuery) return;
		setBoardView({ query: debouncedSearch });
	}, [debouncedSearch, setBoardView, urlSearchQuery]);
	useEffect(() => {
		const input = searchInputRef.current;
		if (input && document.activeElement === input) return;
		setSearchDraft(urlSearchQuery);
	}, [urlSearchQuery]);
	const setFilters = useCallback(
		(next: KanbanBoardTaskFilters) => setBoardView({ filters: next }),
		[setBoardView],
	);
	const setLayout = useCallback(
		(next: "board" | "people") => {
			setSearchParams(
				(prev) => {
					const params = new URLSearchParams(prev);
					if (next === "people") params.set("layout", "people");
					else params.delete("layout");
					return params;
				},
				{ replace: true },
			);
		},
		[setSearchParams],
	);
	const [boardContextMenu, setBoardContextMenu] = useState<{
		mouseX: number;
		mouseY: number;
	} | null>(null);
	const [cardContextMenu, setCardContextMenu] = useState<{
		mouseX: number;
		mouseY: number;
		cardId: string;
		parentId: string;
	} | null>(null);

	const configQuery = useKanbanBoardConfig();
	const boardsQuery = useKanbanBoardBoards();
	const assigneesQuery = useKanbanBoardAssignees();
	const customersQuery = useKanbanBoardCustomers();
	const sprintsQuery = useKanbanBoardSprints();
	const streamsQuery = useKanbanBoardStreams();
	const boardMeta = boardsQuery.data?.find(
		(item) =>
			item.boardKey === normalizeTrackerCode(boardKey) || item.id === boardKey,
	);
	const boardApiRef = boardMeta?.boardKey ?? normalizeTrackerCode(boardKey);
	const { setScroller, persistScroll } = useKanbanBoardPageScroll(
		boardApiRef,
		Boolean(board),
	);
	const columnsQuery = useKanbanBoardColumns(boardApiRef);
	const createColumn = useCreateKanbanBoardColumn();
	const updateColumn = useUpdateKanbanBoardColumn();
	const deleteColumn = useDeleteKanbanBoardColumn();
	const trashColumnTasks = useTrashKanbanBoardColumnTasks();
	const updateTask = useUpdateKanbanBoardTask();
	const releasesQuery = useKanbanBoardReleases();
	const completeRelease = useCompleteKanbanBoardRelease();
	const [trashColumnConfirmId, setTrashColumnConfirmId] = useState<
		string | null
	>(null);
	const [completeReleaseConfirmId, setCompleteReleaseConfirmId] = useState<
		string | null
	>(null);

	const tasksQuery = useQuery({
		queryKey: ["kanbanBoardTasks", boardApiRef],
		enabled: Boolean(boardApiRef),
		queryFn: async ({ signal }) =>
			kanbanBoardGetBoardTasks(boardApiRef, signal),
		refetchOnMount: "always",
	});

	const resolvedBoardId = boardMeta?.id ?? tasksQuery.data?.[0]?.boardId ?? "";

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
						`${task.id}:${task.updatedAt}:${task.parentId}:${task.position}:${(task.releases ?? []).map((item) => item.id).join(",")}:${JSON.stringify(task.content)}`,
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
	}, [
		boardApiRef,
		columnsSignature,
		columnsQuery.data,
		tasksSignature,
		tasksQuery.data,
		tasksQuery.dataUpdatedAt,
	]);

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
			const rows = fromBoardData(nextBoard, standId, now, resolvedBoardId).map(
				(task) => ({
					...task,
					origin: standId,
				}),
			);
			return kanbanBoardSaveBoardTasks(boardApiRef, {
				tasks: rows,
				expectedUpdatedAtByTaskId:
					collectKanbanBoardExpectedVersions(nextBoard),
				forceOverwrite,
				lockHolderLabel: editLabel || undefined,
			});
		},
		onSuccess: (tasks, variables) => {
			setRemoteStale(false);
			setEditBlocked(null);
			setPendingBoard(null);
			const merged = tasks.map((task) => {
				const fromBoard = variables.nextBoard[task.id] as
					| KanbanBoardItem
					| undefined;
				return fromBoard?.releases !== undefined
					? { ...task, releases: fromBoard.releases }
					: task;
			});
			queryClient.setQueryData(["kanbanBoardTasks", boardApiRef], merged);
			const columns = getColumns();
			if (columns.length) {
				setBoard(buildBoardData(merged, columns));
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
		boardId: resolvedBoardId,
		boardRef: boardApiRef,
		enabled: isReady && !saveMutation.isPending,
		onRemoteUpdate: useCallback(() => setRemoteStale(true), []),
	});

	const exportMutation = useMutation({
		mutationFn: () => kanbanBoardExportBoardSnapshot(boardApiRef),
		onSuccess: (blob) => {
			const date = new Date().toISOString().slice(0, 10);
			downloadBlob(blob, `kanban-board-${boardApiRef}-${standId}-${date}.xlsx`);
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
		async (nextBoard: KanbanBoardData, forceOverwrite?: boolean) => {
			const collapsed = collapseKanbanBoardReleasesLanes(nextBoard);
			setBoard(collapsed);
			return saveMutation.mutateAsync({ nextBoard: collapsed, forceOverwrite });
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
		persistScroll();
		navigate(trackerBoardHistoryPath(key));
	}, [boardApiRef, boardKey, boardMeta?.boardKey, navigate, persistScroll]);

	const handleBoardContextMenu = useCallback((event: MouseEvent) => {
		event.preventDefault();
		setCardContextMenu(null);
		setBoardContextMenu({
			mouseX: event.clientX,
			mouseY: event.clientY,
		});
	}, []);

	const { createAndOpen, isPending: isCreatingTask } =
		useCreateAndOpenKanbanTask();

	const defaultColumnId = columnsQuery.data?.[0]?.id ?? "todo";

	const openCreateTask = useCallback(
		async (columnId = defaultColumnId) => {
			if (!resolvedBoardId) return;
			try {
				persistScroll();
				setOpeningTaskLabel("Новая задача");
				const lane = parseKanbanBoardReleasesLaneId(columnId);
				const created = await createAndOpen({
					boardId: resolvedBoardId,
					parentId: lane?.columnId ?? columnId,
					releaseIds: lane?.releaseId ? [lane.releaseId] : undefined,
					returnState: boardReturnState,
				});
				setOpeningTaskLabel(created.taskKey);
			} catch (error) {
				setOpeningTaskLabel(null);
				toast.error(apiErrorMessage(error));
			}
		},
		[
			boardApiRef,
			boardReturnState,
			createAndOpen,
			defaultColumnId,
			persistScroll,
			resolvedBoardId,
		],
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

	const completeReleaseConfirm = useMemo(
		() =>
			releasesQuery.data?.find((item) => item.id === completeReleaseConfirmId),
		[completeReleaseConfirmId, releasesQuery.data],
	);

	const confirmCompleteRelease = useCallback(async () => {
		if (!completeReleaseConfirmId) return;
		try {
			await completeRelease.mutateAsync({
				id: completeReleaseConfirmId,
				data: { lockHolderLabel: editLabel || undefined },
			});
			toast.success("Релиз завершён, задачи перенесены в «Готово»");
			setCompleteReleaseConfirmId(null);
		} catch (error) {
			toast.error(apiErrorMessage(error));
		}
	}, [completeRelease, completeReleaseConfirmId, editLabel]);

	const isColumnBusy =
		createColumn.isPending ||
		updateColumn.isPending ||
		deleteColumn.isPending ||
		trashColumnTasks.isPending ||
		completeRelease.isPending;
	const isBoardBusy = !isReady || !board || isColumnBusy || isCreatingTask;
	const isSavingBoard = saveMutation.isPending || updateTask.isPending;

	const filtersActive = kanbanBoardTaskFiltersActive(filters);
	const searchActive = Boolean(debouncedSearch.trim());
	const viewFiltered = filtersActive || searchActive;

	const expandedBoard = useMemo(() => {
		if (!board) return null;
		return expandKanbanBoardReleasesLanes(board, releasesQuery.data ?? []);
	}, [board, releasesQuery.data]);

	const filteredBoard = useMemo(() => {
		if (!board) return null;
		if (!viewFiltered) return board;
		return filterKanbanBoardData(board, (item) => {
			if (
				!kanbanBoardTaskMatchesSearch(
					item,
					debouncedSearch,
					boardMeta?.boardKey,
				)
			) {
				return false;
			}
			return kanbanBoardTaskMatchesFilters(item, filters);
		});
	}, [board, boardMeta?.boardKey, debouncedSearch, filters, viewFiltered]);

	const viewBoard = useMemo(() => {
		if (!filteredBoard) return null;
		return expandKanbanBoardReleasesLanes(
			filteredBoard,
			releasesQuery.data ?? [],
		);
	}, [filteredBoard, releasesQuery.data]);

	const directoryAssigneeNames = useMemo(
		() =>
			[
				...new Set(
					(assigneesQuery.data ?? [])
						.map((item) => item.name.trim())
						.filter(Boolean),
				),
			].sort((a, b) => a.localeCompare(b, "ru")),
		[assigneesQuery.data],
	);

	const peopleGroups = useMemo(
		() =>
			filteredBoard
				? groupKanbanBoardByCurrentAssignee(
						filteredBoard,
						boardMeta?.boardKey,
						directoryAssigneeNames,
					)
				: [],
		[boardMeta?.boardKey, directoryAssigneeNames, filteredBoard],
	);

	const totalCardCount = useMemo(
		() => (board ? countKanbanBoardCards(board) : 0),
		[board],
	);
	const matchCardCount = useMemo(
		() => (viewBoard ? countKanbanBoardCards(viewBoard) : 0),
		[viewBoard],
	);
	const boardBlockerCount = useMemo(
		() => (board ? countKanbanBoardBlockers(board) : 0),
		[board],
	);

	const assigneeFilterOptions = useMemo(
		() =>
			(assigneesQuery.data ?? []).map((item) => ({
				value: item.name,
				label: item.name,
			})),
		[assigneesQuery.data],
	);

	const boardCards = useMemo(() => {
		if (!board) return [];
		const cards: KanbanBoardItem[] = [];
		for (const columnId of board.root.children) {
			for (const cardId of board[columnId]?.children ?? []) {
				const card = board[cardId];
				if (card?.type === "card") cards.push(card);
			}
		}
		return cards;
	}, [board]);

	const currentAssigneeFilterOptions = useMemo(() => {
		const names = new Set(directoryAssigneeNames);
		for (const card of boardCards) {
			const name = (
				card.content as KanbanBoardTaskContent | undefined
			)?.currentAssignee?.trim();
			if (name) names.add(name);
		}
		return [...names]
			.sort((a, b) => a.localeCompare(b, "ru"))
			.map((name) => ({ value: name, label: name }));
	}, [boardCards, directoryAssigneeNames]);

	const statusFilterOptions = useMemo(
		() =>
			(columnsQuery.data ?? []).map((column) => ({
				value: column.id,
				label: kanbanBoardDisplayColumnTitle(column),
			})),
		[columnsQuery.data],
	);

	const customerFilterOptions = useMemo(() => {
		const names = new Set(
			(customersQuery.data ?? []).map((item) => item.name.trim()).filter(Boolean),
		);
		for (const card of boardCards) {
			const name = (card.content as KanbanBoardTaskContent | undefined)?.customer?.trim();
			if (name) names.add(name);
		}
		return [...names]
			.sort((a, b) => a.localeCompare(b, "ru"))
			.map((name) => ({ value: name, label: name }));
	}, [boardCards, customersQuery.data]);

	const sprintFilterOptions = useMemo(() => {
		const options = (sprintsQuery.data ?? []).map((item) => ({
			value: item.id,
			label: `${item.code} — ${item.name}`,
		}));
		const known = new Set(options.map((option) => option.value));
		for (const card of boardCards) {
			const sprintId = (card.content as KanbanBoardTaskContent | undefined)?.sprintId;
			if (sprintId && !known.has(sprintId)) {
				known.add(sprintId);
				options.push({ value: sprintId, label: sprintId });
			}
		}
		return options.sort((a, b) => a.label.localeCompare(b.label, "ru"));
	}, [boardCards, sprintsQuery.data]);

	const streamFilterOptions = useMemo(() => {
		const names = new Set(
			(streamsQuery.data ?? []).map((item) => item.name.trim()).filter(Boolean),
		);
		for (const card of boardCards) {
			const name = (
				card.content as KanbanBoardTaskContent | undefined
			)?.streamCustomer?.trim();
			if (name) names.add(name);
		}
		return [...names]
			.sort((a, b) => a.localeCompare(b, "ru"))
			.map((name) => ({ value: name, label: name }));
	}, [boardCards, streamsQuery.data]);

	const releaseFilterOptions = useMemo(() => {
		const options = new Map<string, string>();
		for (const release of releasesQuery.data ?? []) {
			options.set(release.id, kanbanBoardTaskReleaseLabel(release));
		}
		for (const card of boardCards) {
			for (const release of card.releases ?? []) {
				if (!options.has(release.id)) {
					options.set(release.id, kanbanBoardTaskReleaseLabel(release));
				}
			}
		}
		return [...options.entries()]
			.map(([value, label]) => ({ value, label }))
			.sort((a, b) => a.label.localeCompare(b.label, "ru"));
	}, [boardCards, releasesQuery.data]);

	const parentFilterOptions = useMemo(() => {
		const names = new Set<string>();
		for (const card of boardCards) {
			const name = (
				card.content as KanbanBoardTaskContent | undefined
			)?.parentTask?.trim();
			if (name) names.add(name);
		}
		return [...names]
			.sort((a, b) => a.localeCompare(b, "ru"))
			.map((name) => ({ value: name, label: name }));
	}, [boardCards]);

	const tagFilterOptions = useMemo(() => {
		const names = new Set<string>();
		for (const card of boardCards) {
			for (const tag of (card.content as KanbanBoardTaskContent | undefined)?.tags ??
				[]) {
				const name = tag.trim();
				if (name) names.add(name);
			}
		}
		return [...names]
			.sort((a, b) => a.localeCompare(b, "ru"))
			.map((name) => ({ value: name, label: name }));
	}, [boardCards]);

	const backlogFilterOptions = useMemo(() => {
		const numbers = new Set<string>();
		for (const card of boardCards) {
			const backlog = (card.content as KanbanBoardTaskContent | undefined)
				?.backlogNumber;
			if (backlog != null && !Number.isNaN(backlog)) {
				numbers.add(String(backlog));
			}
		}
		return [...numbers]
			.sort((a, b) => Number(a) - Number(b))
			.map((value) => ({ value, label: value }));
	}, [boardCards]);

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
		(column: BoardItem) => {
			const lane = parseKanbanBoardReleasesLaneId(column.id);
			const release = lane?.releaseId
				? releasesQuery.data?.find((item) => item.id === lane.releaseId)
				: undefined;
			const canComplete = Boolean(
				release &&
					kanbanBoardReleaseCanComplete(release.status) &&
					(release.status !== KANBAN_BOARD_RELEASE_DONE_STATUS_ID ||
						column.totalChildrenCount > 0),
			);
			const completeTitle = !release
				? undefined
				: release.status === "cancelled" || release.status === "archived"
					? "Нельзя завершить отменённый или архивный релиз"
					: release.status === KANBAN_BOARD_RELEASE_DONE_STATUS_ID &&
							column.totalChildrenCount === 0
						? "Релиз уже выпущен"
						: "Завершить релиз и перенести задачи в «Готово»";
			return (
				<KanbanColumnHeader
					column={column}
					disabled={isBoardBusy}
					onRename={handleRenameColumn}
					onDelete={handleDeleteColumn}
					onAddTask={(columnId) => void openCreateTask(columnId)}
					onTrashAll={setTrashColumnConfirmId}
					isTrashing={trashColumnTasks.isPending}
					onCompleteRelease={
						release ? () => setCompleteReleaseConfirmId(release.id) : undefined
					}
					canCompleteRelease={canComplete}
					isCompletingRelease={completeRelease.isPending}
					completeReleaseTitle={completeTitle}
					blockerCount={
						viewBoard ? countKanbanBoardColumnBlockers(viewBoard, column.id) : 0
					}
				/>
			);
		},
		[
			completeRelease.isPending,
			handleDeleteColumn,
			handleRenameColumn,
			isBoardBusy,
			openCreateTask,
			releasesQuery.data,
			trashColumnTasks.isPending,
			viewBoard,
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

	const columnWrapperStyle = useCallback(
		(column: BoardItem) => kanbanBoardColumnWrapperStyle(column),
		[],
	);

	const openTaskByKey = useCallback(
		(taskKey: string) => {
			persistScroll();
			setOpeningTaskLabel(taskKey);
			navigate(kanbanTaskEditPath(taskKey), { state: boardReturnState });
		},
		[boardReturnState, navigate, persistScroll],
	);

	const handleCardClick = useCallback(
		(_event: MouseEvent<HTMLDivElement>, card: BoardItem) => {
			const task = tasksQuery.data?.find((item) => item.id === card.id);
			const boardKeyPrefix = boardMeta?.boardKey;
			if (task?.taskNumber && boardKeyPrefix) {
				openTaskByKey(formatKanbanTaskKey(boardKeyPrefix, task.taskNumber));
			}
		},
		[boardMeta?.boardKey, openTaskByKey, tasksQuery.data],
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

	const handleCardContextMenu = useCallback(
		(event: MouseEvent, cardId: string, parentId: string) => {
			event.preventDefault();
			event.stopPropagation();
			setBoardContextMenu(null);
			setCardContextMenu({
				mouseX: event.clientX,
				mouseY: event.clientY,
				cardId,
				parentId,
			});
		},
		[],
	);

	const moveCardToColumn = useCallback(
		(cardId: string, parentId: string, columnId: string) => {
			if (!board || isSavingBoard) return;
			if (kanbanBoardResolveColumnId(parentId) === columnId) return;
			if (!board[columnId] || !board[cardId]) {
				toast.error("Колонка ещё не появилась — обновите доску");
				return;
			}
			const moved = moveKanbanBoardCardToColumn(board, cardId, columnId);
			if (!moved || moved === board) return;
			void persistBoard(moved).catch(() => undefined);
		},
		[board, isSavingBoard, persistBoard],
	);

	const moveCardToColumnFromMenu = useCallback(
		(columnId: string) => {
			if (!cardContextMenu || isSavingBoard) {
				setCardContextMenu(null);
				return;
			}
			const { cardId, parentId } = cardContextMenu;
			setCardContextMenu(null);
			moveCardToColumn(cardId, parentId, columnId);
		},
		[cardContextMenu, isSavingBoard, moveCardToColumn],
	);

	const cancelCardFromMenu = useCallback(() => {
		if (!cardContextMenu || !board || isSavingBoard) {
			setCardContextMenu(null);
			return;
		}
		const { cardId, parentId } = cardContextMenu;
		setCardContextMenu(null);
		if (kanbanBoardIsCancelledColumn({ id: kanbanBoardResolveColumnId(parentId) }))
			return;

		const columnId =
			findKanbanBoardCancelledColumnId(columnsQuery.data ?? []) ??
			findKanbanBoardCancelledColumnId(
				(board.root.children ?? []).map((id) => ({
					id,
					title: board[id]?.title,
				})),
			);
		if (!columnId) {
			toast.error("Колонка «Отменено» ещё не появилась — обновите доску");
			return;
		}

		let nextBoard = board;
		if (!nextBoard[columnId]) {
			const column = columnsQuery.data?.find((item) => item.id === columnId);
			if (!column) {
				toast.error("Колонка «Отменено» ещё не появилась — обновите доску");
				return;
			}
			nextBoard = ensureCancelledColumnOnBoard(nextBoard, column);
		}
		const moved = moveKanbanBoardCardToColumn(nextBoard, cardId, columnId);
		if (!moved) return;
		void persistBoard(moved).catch(() => undefined);
	}, [board, cardContextMenu, columnsQuery.data, isSavingBoard, persistBoard]);

	const assignCard = useCallback(
		(cardId: string, nextAssignee: string) => {
			if (!board || isSavingBoard) return;
			const card = board[cardId];
			const content = card?.content;
			if (!card || !content || !("title" in content)) return;
			const current = content.currentAssignee?.trim() ?? "";
			if (nextAssignee.trim() === current) return;
			const nextBoard: KanbanBoardData = {
				...board,
				[cardId]: {
					...card,
					content: withKanbanBoardCurrentAssignee(content, nextAssignee),
				},
			};
			void persistBoard(nextBoard).catch(() => undefined);
		},
		[board, isSavingBoard, persistBoard],
	);

	const assignCardFromMenu = useCallback(
		(nextAssignee: string) => {
			if (!cardContextMenu || isSavingBoard) {
				setCardContextMenu(null);
				return;
			}
			const { cardId } = cardContextMenu;
			setCardContextMenu(null);
			assignCard(cardId, nextAssignee);
		},
		[assignCard, cardContextMenu, isSavingBoard],
	);

	useEffect(() => {
		const id = "kanban-board-import-error";
		if (!importError) {
			toast.dismiss(id);
			return;
		}
		toast.error(importError, { id, duration: Number.POSITIVE_INFINITY });
		return () => {
			toast.dismiss(id);
		};
	}, [importError]);

	useEffect(() => {
		const id = "kanban-board-remote-stale";
		if (!remoteStale) {
			toast.dismiss(id);
			return;
		}
		toast.info(
			"Доска изменилась на сервере. Обновите данные перед сохранением.",
			{
				id,
				duration: Number.POSITIVE_INFINITY,
				action: {
					label: "Обновить",
					onClick: () => {
						void refreshBoardFromServer();
					},
				},
			},
		);
		return () => {
			toast.dismiss(id);
		};
	}, [refreshBoardFromServer, remoteStale]);

	useEffect(() => {
		const notices = [
			{
				id: "kanban-board-tasks-error",
				message: tasksQuery.isError ? "Не удалось загрузить задачи" : null,
			},
			{
				id: "kanban-board-save-error",
				message:
					saveMutation.isError && !editBlocked
						? "Не удалось сохранить изменения"
						: null,
			},
			{
				id: "kanban-board-columns-error",
				message: columnsQuery.isError ? "Не удалось загрузить колонки" : null,
			},
			{
				id: "kanban-board-create-column-error",
				message: createColumn.isError ? "Не удалось добавить колонку" : null,
			},
			{
				id: "kanban-board-rename-column-error",
				message: updateColumn.isError
					? "Не удалось переименовать колонку"
					: null,
			},
			{
				id: "kanban-board-delete-column-error",
				message: deleteColumn.isError
					? apiErrorMessage(deleteColumn.error)
					: null,
			},
		];
		for (const notice of notices) {
			if (!notice.message) {
				toast.dismiss(notice.id);
				continue;
			}
			toast.error(notice.message, {
				id: notice.id,
				duration: Number.POSITIVE_INFINITY,
			});
		}
		return () => {
			for (const notice of notices) toast.dismiss(notice.id);
		};
	}, [
		columnsQuery.isError,
		createColumn.isError,
		deleteColumn.error,
		deleteColumn.isError,
		editBlocked,
		saveMutation.isError,
		tasksQuery.isError,
		updateColumn.isError,
	]);

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

	const boardTitle = boardMeta?.name?.trim() || boardKey;
	const statusColumns = [...(columnsQuery.data ?? [])].sort(
		(a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title, "ru"),
	);
	const cardColumnId = cardContextMenu
		? kanbanBoardResolveColumnId(cardContextMenu.parentId)
		: null;
	const cardMenuAssignee = (() => {
		if (!cardContextMenu || !board) return "";
		const content = board[cardContextMenu.cardId]?.content;
		if (!content || !("title" in content)) return "";
		return content.currentAssignee?.trim() ?? "";
	})();
	const assigneeMenuNames = [
		...new Set(
			(assigneesQuery.data ?? [])
				.map((item) => item.name.trim())
				.filter(Boolean),
		),
	];
	if (cardMenuAssignee && !assigneeMenuNames.includes(cardMenuAssignee)) {
		assigneeMenuNames.push(cardMenuAssignee);
	}
	assigneeMenuNames.sort((a, b) => a.localeCompare(b, "ru"));

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
				title={boardTitle}
				trailingAccessory={
					boardMeta ? (
						<IconButton
							size="small"
							title="Настройки доски"
							aria-label="Настройки доски"
							onClick={() => setBoardSettingsOpen(true)}
						>
							<SettingsOutlinedIcon fontSize="small" />
						</IconButton>
					) : null
				}
			>
				<Flex gap={6} wrap="wrap" alignItems="center">
					<TextField
						size="small"
						placeholder="Быстрый поиск…"
						value={searchDraft}
						onChange={(event) => setSearchDraft(event.target.value)}
						inputRef={searchInputRef}
						sx={{
							width: { xs: "100%", sm: 260 },
							maxWidth: 360,
							flexShrink: 0,
						}}
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
					<ToggleButtonGroup
						exclusive
						size="small"
						value={layout}
						onChange={(_, next: "board" | "people" | null) => {
							if (next) setLayout(next);
						}}
						aria-label="Вид доски"
						sx={{ flexShrink: 0, height: 32 }}
					>
						<ToggleButton
							value="board"
							title="Доска"
							aria-label="Доска"
							sx={{ textTransform: "none", px: 1, gap: 0.5 }}
						>
							<ViewColumnIcon fontSize="small" />
							Доска
						</ToggleButton>
						<ToggleButton
							value="people"
							title="По людям"
							aria-label="По людям"
							sx={{ textTransform: "none", px: 1, gap: 0.5 }}
						>
							<PeopleAltOutlinedIcon fontSize="small" />
							По людям
						</ToggleButton>
					</ToggleButtonGroup>
					{viewFiltered ? (
						<Typography variant="caption" color="text.secondary" noWrap>
							{matchCardCount} / {totalCardCount}
						</Typography>
					) : null}
					<KanbanBlockerCountChip
						count={boardBlockerCount}
						label={`Блокер: ${boardBlockerCount}`}
					/>
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
					currentAssigneeOptions={currentAssigneeFilterOptions}
					createdByOptions={createdByFilterOptions}
					statusOptions={statusFilterOptions}
					customerOptions={customerFilterOptions}
					sprintOptions={sprintFilterOptions}
					streamOptions={streamFilterOptions}
					releaseOptions={releaseFilterOptions}
					parentOptions={parentFilterOptions}
					tagOptions={tagFilterOptions}
					backlogOptions={backlogFilterOptions}
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
				<Box
					ref={setScroller}
					data-test-id="kanban-board-page-content"
					sx={{
						flex: 1,
						minHeight: 0,
						minWidth: 0,
						width: "100%",
						maxWidth: "100%",
						overflow: "auto",
						overflowX: "auto",
						overflowY: "auto",
						boxSizing: "border-box",
					}}
				>
					{layout === "people" && filteredBoard ? (
						<KanbanBoardPeopleView
							groups={peopleGroups}
							statuses={statusColumns.map((column) => ({
								id: column.id,
								title: kanbanBoardDisplayColumnTitle(column),
								color: column.color || "#94a3b8",
							}))}
							assigneeNames={directoryAssigneeNames}
							busy={isSavingBoard}
							onOpenTask={openTaskByKey}
							onMoveTask={moveCardToColumn}
							onAssignTask={assignCard}
							onTaskContextMenu={handleCardContextMenu}
						/>
					) : (
					<Box
						sx={{
							display: "flex",
							height: "100%",
							minHeight: "100%",
							width: "max-content",
							minWidth: "100%",
							boxSizing: "border-box",
							...kanbanBoardRkkBoardSx,
						}}
					>
						{viewBoard ? (
							<Kanban
								dataSource={viewBoard as BoardData}
								rootStyle={{
									height: "100%",
									width: "max-content",
									minWidth: "100%",
									flex: 1,
								}}
								cardsGap={8}
								renderColumnHeader={renderColumnHeader}
								renderColumnAdder={renderColumnAdder}
								allowColumnAdder={!isBoardBusy}
								columnStyle={columnStyle}
								columnWrapperStyle={columnWrapperStyle}
								columnWrapperClassName={kanbanBoardColumnWrapperClassName}
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
												parentId={kanbanBoardResolveColumnId(
													data.parentId ?? column.id,
												)}
												taskKey={
													boardMeta?.boardKey &&
													(data as KanbanBoardItem).taskNumber
														? formatKanbanTaskKey(
																boardMeta.boardKey,
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
												releases={(data as KanbanBoardItem).releases}
												editLabel={editLabel}
												columnColor={getKanbanColumnColor(column)}
												isBoardBusy={isBoardBusy}
												highlightQuery={debouncedSearch}
												onContentUpdated={handleTaskContentUpdated}
												onEditBlocked={handleEditBlocked}
												onContextMenu={(event) =>
													handleCardContextMenu(
														event,
														data.id,
														data.parentId ?? column.id,
													)
												}
											/>
										),
									},
								}}
								onCardMove={(move) => {
									if (isSavingBoard || !standId || !expandedBoard) return;
									// Соседи берутся из отфильтрованного вида, а вставка идёт
									// в полную доску, чтобы скрытые карточки остались в колонках.
									const movedView = normalizeKanbanBoardData(
										dropHandler(
											move,
											expandedBoard as BoardData,
										) as KanbanBoardData,
									);
									const toLane = parseKanbanBoardReleasesLaneId(
										move.toColumnId,
									);
									const fromLane = parseKanbanBoardReleasesLaneId(
										move.fromColumnId,
									);
									const membershipChanged =
										Boolean(toLane) &&
										(fromLane?.releaseId ?? null) !==
											(toLane?.releaseId ?? null);
									const nextReleaseId = toLane?.releaseId ?? null;
									const nextRelease = nextReleaseId
										? (releasesQuery.data ?? []).find(
												(item) => item.id === nextReleaseId,
											)
										: null;
									if (membershipChanged && movedView[move.cardId]) {
										movedView[move.cardId] = {
											...movedView[move.cardId],
											releases: nextReleaseId
												? [
														{
															id: nextReleaseId,
															code: nextRelease?.code ?? "",
															name:
																nextRelease?.name ??
																nextRelease?.code ??
																nextReleaseId,
														},
													]
												: [],
										};
									}
									void (async () => {
										try {
											const saved = await persistBoard(movedView);
											if (!membershipChanged) return;
											const savedTask = saved.find(
												(task) => task.id === move.cardId,
											);
											await updateTask.mutateAsync({
												id: move.cardId,
												data: {
													releaseIds: nextReleaseId ? [nextReleaseId] : [],
													expectedUpdatedAt: savedTask?.updatedAt,
													lockHolderLabel: editLabel || undefined,
												},
											});
										} catch (error) {
											toast.error(apiErrorMessage(error));
										}
									})();
								}}
							/>
						) : null}
					</Box>
					)}
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
			<Menu
				open={cardContextMenu !== null}
				onClose={() => setCardContextMenu(null)}
				anchorReference="anchorPosition"
				anchorPosition={
					cardContextMenu
						? { top: cardContextMenu.mouseY, left: cardContextMenu.mouseX }
						: undefined
				}
				slotProps={{
					paper: {
						sx: { maxHeight: "min(480px, 70vh)", minWidth: 260 },
					},
				}}
			>
				<ListSubheader
					sx={{ bgcolor: "background.paper", lineHeight: "32px", fontSize: 12 }}
				>
					Переместить в статус
				</ListSubheader>
				{statusColumns.map((column) => {
					const title = kanbanBoardDisplayColumnTitle(column);
					const isCurrent = column.id === cardColumnId;
					return (
						<MenuItem
							key={column.id}
							disabled={!cardContextMenu || isSavingBoard || isCurrent}
							onClick={() => moveCardToColumnFromMenu(column.id)}
						>
							<Box
								sx={{
									width: 8,
									height: 8,
									borderRadius: "50%",
									bgcolor: column.color || "#94a3b8",
									mr: 1,
									flexShrink: 0,
								}}
							/>
							{title}
						</MenuItem>
					);
				})}
				<Divider />
				<ListSubheader
					sx={{ bgcolor: "background.paper", lineHeight: "32px", fontSize: 12 }}
				>
					Текущий исполнитель
				</ListSubheader>
				{assigneeMenuNames.map((name) => (
					<MenuItem
						key={name}
						disabled={!cardContextMenu || isSavingBoard || name === cardMenuAssignee}
						onClick={() => assignCardFromMenu(name)}
					>
						{name}
					</MenuItem>
				))}
				<MenuItem
					disabled={!cardContextMenu || isSavingBoard || !cardMenuAssignee}
					onClick={() => assignCardFromMenu("")}
				>
					Без исполнителя
				</MenuItem>
				<Divider />
				<MenuItem
					disabled={
						!cardContextMenu ||
						isSavingBoard ||
						kanbanBoardIsCancelledColumn({
							id: kanbanBoardResolveColumnId(cardContextMenu.parentId),
						})
					}
					onClick={cancelCardFromMenu}
				>
					Отменить задачу
				</MenuItem>
			</Menu>
			<TrackerBoardSettingsDialog
				open={boardSettingsOpen}
				board={boardMeta ?? null}
				onClose={() => setBoardSettingsOpen(false)}
				onSaved={(updated) => {
					if (
						normalizeTrackerCode(updated.boardKey) !==
						normalizeTrackerCode(boardKey)
					) {
						navigate(trackerBoardPath(updated.boardKey), { replace: true });
					}
				}}
			/>
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
					if (pendingBoard) void persistBoard(pendingBoard, true).catch(() => undefined);
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
			<Dialog
				open={Boolean(completeReleaseConfirmId)}
				onClose={() => setCompleteReleaseConfirmId(null)}
				maxWidth="xs"
				fullWidth
			>
				<DialogTitle>Завершить релиз?</DialogTitle>
				<DialogContent>
					<DialogContentText>
						Релиз «
						{completeReleaseConfirm
							? `${completeReleaseConfirm.code} · ${completeReleaseConfirm.name}`
							: completeReleaseConfirmId}
						» получит статус «Выпущен». Все его задачи будут перенесены в
						колонку «Готово».
					</DialogContentText>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setCompleteReleaseConfirmId(null)}>
						Отмена
					</Button>
					<Button
						variant="contained"
						color="success"
						disabled={completeRelease.isPending}
						onClick={() => void confirmCompleteRelease()}
					>
						Завершить
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
