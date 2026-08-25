import AddIcon from "@mui/icons-material/Add";
import CheckIcon from "@mui/icons-material/Check";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import { useQuery } from "@tanstack/react-query";
import {
	formatKanbanTaskKey,
	normalizeTrackerCode,
	toBoardData,
	countKanbanBoardBlockers,
	countKanbanBoardColumnBlockers,
	type KanbanBoardItem,
	type KanbanBoardTaskContent,
} from "@smart-anketa/api-contract";
import { Kanban } from "react-kanban-kit";
import type { BoardData, BoardItem } from "react-kanban-kit";
import {
	useCallback,
	useEffect,
	useMemo,
	useState,
	type MouseEvent,
} from "react";
import { useNavigate } from "react-router";
import { Flex } from "@react-client/common/primitives/Flex";
import { toast } from "@react-client/common/toasts";
import { apiErrorMessage } from "@react-client/common/api/helpers/apiErrorMessage";
import {
	kanbanBoardGetBoardTasks,
	useAttachKanbanBoardReleaseTasks,
	useDetachKanbanBoardReleaseTask,
	useKanbanBoardBoards,
	useKanbanBoardColumns,
} from "@react-client/common/api/queries/kanban-board";
import {
	getKanbanColumnColor,
	KanbanBlockerCountChip,
} from "@react-client/features/kanban-board/components/KanbanBoardColumnChrome";
import { KanbanTaskBoardCard } from "@react-client/features/kanban-board/components/KanbanTaskBoardCard";
import { trackerTaskPath } from "@react-client/features/kanban-board/kanban-task-paths";
import { usePlanningWorkspace } from "@react-client/features/tracker/planning/PlanningWorkspaceContext";

const COLUMN_WIDTH_PX = 320;

function sourceBoardStorageKey(planningId: string) {
	return `smart-anketa:planning:${planningId}:sourceBoardKey`;
}

export function PlanningSourceBoardView() {
	const navigate = useNavigate();
	const { planning, activeReleaseId } = usePlanningWorkspace();
	const boardsQuery = useKanbanBoardBoards();
	const attachTasks = useAttachKanbanBoardReleaseTasks();
	const detachTask = useDetachKanbanBoardReleaseTask();
	const [boardKey, setBoardKey] = useState(() => {
		try {
			return sessionStorage.getItem(sourceBoardStorageKey(planning.id)) ?? "";
		} catch {
			return "";
		}
	});

	const boards = boardsQuery.data ?? [];
	const boardMeta = boards.find(
		(item) =>
			item.boardKey === normalizeTrackerCode(boardKey) || item.id === boardKey,
	);
	const boardApiRef =
		boardMeta?.boardKey ?? (boardKey ? normalizeTrackerCode(boardKey) : "");

	useEffect(() => {
		try {
			const storageKey = sourceBoardStorageKey(planning.id);
			if (boardApiRef) {
				sessionStorage.setItem(storageKey, boardApiRef);
			} else {
				sessionStorage.removeItem(storageKey);
			}
		} catch {
			// ignore
		}
	}, [boardApiRef, planning.id]);

	useEffect(() => {
		const list = boardsQuery.data;
		if (!boardsQuery.isSuccess || !boardKey || !list) return;
		const exists = list.some(
			(item) =>
				item.boardKey === normalizeTrackerCode(boardKey) ||
				item.id === boardKey,
		);
		if (!exists) setBoardKey("");
	}, [boardKey, boardsQuery.data, boardsQuery.isSuccess]);

	const columnsQuery = useKanbanBoardColumns(boardApiRef);
	const tasksQuery = useQuery({
		queryKey: ["kanbanBoardTasks", boardApiRef],
		enabled: Boolean(boardApiRef),
		queryFn: ({ signal }) => kanbanBoardGetBoardTasks(boardApiRef, signal),
	});

	const boardData = useMemo(() => {
		if (!columnsQuery.data || !tasksQuery.data) return null;
		return toBoardData(tasksQuery.data, columnsQuery.data);
	}, [columnsQuery.data, tasksQuery.data]);
	const sourceBoardBlockerCount = boardData
		? countKanbanBoardBlockers(boardData)
		: 0;

	const attachedIds = useMemo(
		() =>
			new Set(
				planning.tasks
					.filter((item) => item.releaseId === activeReleaseId)
					.map((item) => item.taskId),
			),
		[activeReleaseId, planning.tasks],
	);
	const releaseByTaskId = useMemo(
		() => new Map(planning.tasks.map((item) => [item.taskId, item.releaseId])),
		[planning.tasks],
	);

	const resolvedBoardId = boardMeta?.id ?? tasksQuery.data?.[0]?.boardId ?? "";

	const attach = async (taskIds: string[]) => {
		if (!activeReleaseId) {
			toast.error("Сначала создайте релиз");
			return;
		}
		const incoming = taskIds.filter((id) => !attachedIds.has(id));
		if (!incoming.length) {
			toast.success("Выбранные задачи уже в этом релизе");
			return;
		}
		try {
			await attachTasks.mutateAsync({
				releaseId: activeReleaseId,
				data: { taskIds: incoming },
			});
			toast.success(
				incoming.length === 1
					? "Задача добавлена в релиз"
					: `Добавлено задач: ${incoming.length}`,
			);
		} catch (error) {
			toast.error(apiErrorMessage(error));
		}
	};

	const toggleTask = async (taskId: string) => {
		if (attachedIds.has(taskId)) {
			try {
				await detachTask.mutateAsync({
					releaseId: activeReleaseId ?? releaseByTaskId.get(taskId) ?? "",
					taskId,
				});
			} catch (error) {
				toast.error(apiErrorMessage(error));
			}
			return;
		}
		await attach([taskId]);
	};

	const handleCardClick = useCallback(
		(_event: MouseEvent<HTMLDivElement>, card: BoardItem) => {
			const task = tasksQuery.data?.find((item) => item.id === card.id);
			const projectCode = boardMeta?.projectCode;
			if (task?.taskNumber && projectCode) {
				navigate(
					trackerTaskPath(formatKanbanTaskKey(projectCode, task.taskNumber)),
				);
			}
		},
		[boardMeta?.projectCode, navigate, tasksQuery.data],
	);

	const columnStyle = useCallback((column: BoardItem) => {
		const color = getKanbanColumnColor(column);
		return {
			background: `color-mix(in srgb, ${color}, transparent 92%)`,
		};
	}, []);

	const unattachedOnBoard = (tasksQuery.data ?? []).filter(
		(task) => !attachedIds.has(task.id),
	);

	const selectValue = boards.some((board) => board.boardKey === boardApiRef)
		? boardApiRef
		: "";

	return (
		<Flex
			flexDirection="column"
			height="100%"
			width="100%"
			minHeight="0"
			minWidth="0"
			gap={8}
		>
			<Flex gap={8} alignItems="center" wrap="wrap">
				<TextField
					select
					size="small"
					placeholder="Доска"
					value={selectValue}
					disabled={boardsQuery.isLoading}
					onChange={(event) => setBoardKey(event.target.value)}
					sx={{ minWidth: 280, flexGrow: 1, maxWidth: 480 }}
				>
					<MenuItem value="">
						<em>Выберите доску</em>
					</MenuItem>
					{boards.map((board) => (
						<MenuItem key={board.id} value={board.boardKey}>
							{board.projectCode} · {board.name}
							{board.blockerCount > 0 ? ` · блокер ${board.blockerCount}` : ""}
						</MenuItem>
					))}
				</TextField>
				<Button
					size="small"
					variant="outlined"
					disabled={
						!activeReleaseId ||
						!unattachedOnBoard.length ||
						attachTasks.isPending
					}
					onClick={() => void attach(unattachedOnBoard.map((task) => task.id))}
					title={
						activeReleaseId
							? "Добавить задачи доски в выбранный релиз"
							: "Сначала создайте релиз"
					}
				>
					Добавить все с доски ({unattachedOnBoard.length})
				</Button>
				<KanbanBlockerCountChip
					count={sourceBoardBlockerCount}
					label={`Блокер: ${sourceBoardBlockerCount}`}
				/>
			</Flex>
			{!activeReleaseId ? (
				<Alert severity="info">
					Создайте релиз на панели «Релизы», чтобы прикреплять задачи
				</Alert>
			) : boardsQuery.isError ? (
				<Alert severity="error">Не удалось загрузить список досок</Alert>
			) : boardsQuery.isSuccess && !boards.length ? (
				<Alert severity="info">Нет доступных досок</Alert>
			) : !boardApiRef ? (
				<Alert severity="info">
					Выберите доску, чтобы прикреплять задачи к выбранному релизу
				</Alert>
			) : tasksQuery.isLoading || columnsQuery.isLoading ? (
				<Flex flexGrow={1} alignItems="center" justifyContent="center">
					<CircularProgress size={28} />
				</Flex>
			) : tasksQuery.isError || columnsQuery.isError ? (
				<Alert severity="error">Не удалось загрузить доску</Alert>
			) : boardData ? (
				<Box
					sx={{
						flex: 1,
						minHeight: 0,
						minWidth: 0,
						overflow: "auto",
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
							width: COLUMN_WIDTH_PX,
							minWidth: COLUMN_WIDTH_PX,
							maxWidth: COLUMN_WIDTH_PX,
						},
						"& .rkk-column-outer .rkk-column": {
							height: "auto",
							minHeight: "100%",
							overflow: "visible !important",
							borderRadius: "4px",
							width: "100%",
						},
						"& .rkk-column-outer .rkk-column-wrapper": {
							maxHeight: "none",
							overflow: "visible",
						},
						"& .rkk-column-content": {
							height: "auto",
							flex: "none",
							minHeight: "unset",
							overflow: "visible",
						},
						"& .rkk-column-content-list": {
							height: "auto",
							overflow: "visible !important",
							overflowX: "visible !important",
							overflowY: "visible !important",
						},
						"& .rkk-card-shadow-container": {
							overflow: "visible",
						},
					}}
				>
					<Kanban
						dataSource={boardData as BoardData}
						rootStyle={{
							height: "auto",
							minHeight: "100%",
							width: "max-content",
							minWidth: "100%",
						}}
						cardsGap={8}
						viewOnly
						allowColumnAdder={false}
						allowColumnDrag={false}
						columnStyle={columnStyle}
						onCardClick={handleCardClick}
						renderColumnHeader={(column: BoardItem) => (
							<SourceColumnHeader
								column={column}
								busy={attachTasks.isPending}
								attachedIds={attachedIds}
								blockerCount={
									boardData
										? countKanbanBoardColumnBlockers(boardData, column.id)
										: 0
								}
								onAttachColumn={() =>
									void attach(
										(column.children ?? []).filter(
											(id) => !attachedIds.has(id),
										),
									)
								}
							/>
						)}
						configMap={{
							card: {
								isDraggable: false,
								render: ({
									data,
									column,
								}: {
									data: BoardItem;
									column: BoardItem;
								}) => (
									<SourceBoardCard
										data={data}
										column={column}
										boardId={resolvedBoardId}
										projectCode={boardMeta?.projectCode}
										attached={attachedIds.has(data.id)}
										busy={attachTasks.isPending || detachTask.isPending}
										onToggle={() => void toggleTask(data.id)}
									/>
								),
							},
						}}
					/>
				</Box>
			) : null}
		</Flex>
	);
}

function SourceColumnHeader({
	column,
	busy,
	attachedIds,
	blockerCount,
	onAttachColumn,
}: {
	column: BoardItem;
	busy: boolean;
	attachedIds: Set<string>;
	blockerCount: number;
	onAttachColumn: () => void;
}) {
	const color = getKanbanColumnColor(column);
	const unattached = (column.children ?? []).filter(
		(id) => !attachedIds.has(id),
	).length;
	return (
		<Flex
			alignItems="center"
			gap={8}
			padding="8px"
			style={{
				background: alpha(color, 0.08),
				borderRadius: 4,
			}}
		>
			<Typography
				variant="subtitle2"
				fontWeight={700}
				noWrap
				title={column.title}
				sx={{ color, flexGrow: 1, minWidth: 0 }}
			>
				{column.title}
			</Typography>
			<KanbanBlockerCountChip count={blockerCount} />
			<Typography variant="caption" color="text.secondary">
				{column.totalChildrenCount}
			</Typography>
			<Button
				size="small"
				disabled={busy || unattached === 0}
				onClick={onAttachColumn}
				title="Добавить задачи колонки в выбранный релиз"
			>
				+{unattached}
			</Button>
		</Flex>
	);
}

function SourceBoardCard({
	data,
	column,
	boardId,
	projectCode,
	attached,
	busy,
	onToggle,
}: {
	data: BoardItem;
	column: BoardItem;
	boardId: string;
	projectCode?: string;
	attached: boolean;
	busy: boolean;
	onToggle: () => void;
}) {
	const item = data as KanbanBoardItem;
	return (
		<Flex position="relative">
			<KanbanTaskBoardCard
				taskId={data.id}
				boardId={boardId}
				parentId={data.parentId ?? column.id}
				taskKey={
					projectCode && item.taskNumber
						? formatKanbanTaskKey(projectCode, item.taskNumber)
						: undefined
				}
				title={data.title}
				content={data.content as KanbanBoardTaskContent | undefined}
				createdAt={item.createdAt}
				createdBy={item.createdBy}
				commentCount={item.commentCount}
				taskUpdatedAt={item.updatedAt}
				releases={item.releases}
				columnColor={getKanbanColumnColor(column)}
				isBoardBusy
				onContentUpdated={() => undefined}
			/>
			<IconButton
				size="small"
				disabled={busy}
				onClick={(event) => {
					event.stopPropagation();
					onToggle();
				}}
				title={attached ? "Убрать из релиза" : "Добавить в выбранный релиз"}
				aria-label={
					attached ? "Убрать из релиза" : "Добавить в выбранный релиз"
				}
				sx={{
					position: "absolute",
					bottom: 6,
					right: 6,
					zIndex: 1,
					bgcolor: "background.paper",
					boxShadow: 1,
					color: attached ? "success.main" : "text.secondary",
					"&:hover": { bgcolor: "background.paper" },
				}}
			>
				{attached ? (
					<CheckIcon fontSize="small" />
				) : (
					<AddIcon fontSize="small" />
				)}
			</IconButton>
		</Flex>
	);
}
