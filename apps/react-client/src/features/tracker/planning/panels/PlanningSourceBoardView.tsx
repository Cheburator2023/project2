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
	expandKanbanBoardReleasesLanes,
	KANBAN_BOARD_RELEASES_COLUMN_TITLE,
	parseKanbanBoardReleasesLaneId,
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
	useKanbanBoardReleases,
} from "@react-client/common/api/queries/kanban-board";
import {
	getKanbanColumnColor,
	KanbanBlockerCountChip,
} from "@react-client/features/kanban-board/components/KanbanBoardColumnChrome";
import { KanbanTaskBoardCard } from "@react-client/features/kanban-board/components/KanbanTaskBoardCard";
import { trackerTaskPath } from "@react-client/features/kanban-board/kanban-task-paths";
import {
	kanbanBoardColumnWrapperClassName,
	kanbanBoardColumnWrapperStyle,
	kanbanBoardRkkBoardSx,
} from "@react-client/features/kanban-board/kanbanBoardColumnLayout";

import { usePlanningWorkspace } from "@react-client/features/tracker/planning/PlanningWorkspaceContext";

type Props = {
	releaseId: string | null;
	attachedTaskIds: string[];
	storageKey: string;
	missingReleaseMessage?: string;
};

function sourceBoardStorageKey(planningId: string) {
	return `smart-anketa:planning:${planningId}:sourceBoardKey`;
}

export function PlanningSourceBoardView() {
	const { planning, activeReleaseId } = usePlanningWorkspace();
	return (
		<ReleaseSourceBoardPicker
			releaseId={activeReleaseId}
			attachedTaskIds={planning.tasks
				.filter((item) => item.releaseId === activeReleaseId)
				.map((item) => item.taskId)}
			storageKey={sourceBoardStorageKey(planning.id)}
			missingReleaseMessage="Создайте релиз на панели «Релизы», чтобы прикреплять задачи"
		/>
	);
}

export function ReleaseSourceBoardPicker({
	releaseId,
	attachedTaskIds,
	storageKey,
	missingReleaseMessage = "Релиз не выбран",
}: Props) {
	const navigate = useNavigate();
	const boardsQuery = useKanbanBoardBoards();
	const attachTasks = useAttachKanbanBoardReleaseTasks();
	const detachTask = useDetachKanbanBoardReleaseTask();
	const [boardKey, setBoardKey] = useState(() => {
		try {
			return sessionStorage.getItem(storageKey) ?? "";
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
			if (boardApiRef) {
				sessionStorage.setItem(storageKey, boardApiRef);
			} else {
				sessionStorage.removeItem(storageKey);
			}
		} catch {
			// ignore
		}
	}, [boardApiRef, storageKey]);

	useEffect(() => {
		const list = boardsQuery.data;
		if (!boardsQuery.isSuccess || !list?.length) return;
		const exists = Boolean(
			boardKey &&
				list.some(
					(item) =>
						item.boardKey === normalizeTrackerCode(boardKey) ||
						item.id === boardKey,
				),
		);
		if (!exists) setBoardKey(list[0].boardKey);
	}, [boardKey, boardsQuery.data, boardsQuery.isSuccess]);

	const columnsQuery = useKanbanBoardColumns(boardApiRef);
	const releasesQuery = useKanbanBoardReleases();
	const tasksQuery = useQuery({
		queryKey: ["kanbanBoardTasks", boardApiRef],
		enabled: Boolean(boardApiRef),
		queryFn: ({ signal }) => kanbanBoardGetBoardTasks(boardApiRef, signal),
	});

	const boardData = useMemo(() => {
		if (!columnsQuery.data || !tasksQuery.data) return null;
		return expandKanbanBoardReleasesLanes(
			toBoardData(tasksQuery.data, columnsQuery.data),
			releasesQuery.data ?? [],
		);
	}, [columnsQuery.data, releasesQuery.data, tasksQuery.data]);
	const sourceBoardBlockerCount = boardData
		? countKanbanBoardBlockers(boardData)
		: 0;

	const attachedIds = useMemo(
		() => new Set(attachedTaskIds),
		[attachedTaskIds],
	);

	const resolvedBoardId = boardMeta?.id ?? tasksQuery.data?.[0]?.boardId ?? "";

	const attach = async (taskIds: string[]) => {
		if (!releaseId) {
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
				releaseId,
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
					releaseId: releaseId ?? "",
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
	const columnWrapperStyle = useCallback(
		(column: BoardItem) => kanbanBoardColumnWrapperStyle(column),
		[],
	);

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
					{!selectValue ? (
						<MenuItem value="" disabled>
							Доска
						</MenuItem>
					) : null}
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
						!releaseId ||
						!unattachedOnBoard.length ||
						attachTasks.isPending
					}
					onClick={() => void attach(unattachedOnBoard.map((task) => task.id))}
					title={
						releaseId
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
			{!releaseId ? (
				<Alert severity="info">{missingReleaseMessage}</Alert>
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
						...kanbanBoardRkkBoardSx,
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
						columnWrapperStyle={columnWrapperStyle}
						columnWrapperClassName={kanbanBoardColumnWrapperClassName}
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
	const title = parseKanbanBoardReleasesLaneId(column.id)
		? `${KANBAN_BOARD_RELEASES_COLUMN_TITLE} · ${column.title}`
		: column.title;
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
				title={title}
				sx={{ color, flexGrow: 1, minWidth: 0 }}
			>
				{title}
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
