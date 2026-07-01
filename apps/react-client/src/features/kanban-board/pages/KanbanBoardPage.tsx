import AddIcon from "@mui/icons-material/Add";
import DownloadIcon from "@mui/icons-material/Download";
import PublishIcon from "@mui/icons-material/Publish";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	fromBoardData,
	kanbanBoardAssigneeRoleByName,
	normalizeKanbanBoardData,
	toBoardData,
	type KanbanBoardAssigneeRoleId,
	type KanbanBoardColumnDto,
	type KanbanBoardData,
	type KanbanBoardTaskContent,
	type KanbanBoardTaskRecord,
	kanbanBoardTaskAssigneeRoles,
	kanbanBoardTaskAssignees,
} from "@smart-anketa/api-contract";
import { KanbanTaskContentChips } from "@react-client/features/tracker/components/TrackerTaskFieldChips";
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
	useKanbanBoardBoards,
	useKanbanBoardColumns,
	useKanbanBoardConfig,
	useKanbanBoardAssignees,
	useCreateKanbanBoardColumn,
	useDeleteKanbanBoardColumn,
	useUpdateKanbanBoardColumn,
	type KanbanBoardImportResult,
} from "@react-client/common/api/queries/kanban-board";
import {
	KanbanColumnAdder,
	KanbanColumnHeader,
	getKanbanColumnColor,
} from "@react-client/features/kanban-board/components/KanbanBoardColumnChrome";
import {
	kanbanTaskCreatePath,
	kanbanTaskEditPath,
} from "@react-client/features/kanban-board/kanban-task-paths";
import { KanbanTaskCardSubtasks } from "@react-client/features/kanban-board/components/KanbanSubtasksChecklist";

const buildBoardData = (
	tasks: Parameters<typeof toBoardData>[0],
	columns: KanbanBoardColumnDto[],
): KanbanBoardData => toBoardData(tasks, columns);

function TaskCardContent({
	taskId,
	boardId,
	parentId,
	title,
	content,
	origin,
	columnColor,
	assigneeRoleByName,
	isBoardBusy,
	onContentUpdated,
}: {
	taskId: string;
	boardId: string;
	parentId: string;
	title?: string;
	content?: KanbanBoardTaskContent;
	origin?: string;
	columnColor: string;
	assigneeRoleByName?: ReadonlyMap<string, KanbanBoardAssigneeRoleId | null>;
	isBoardBusy?: boolean;
	onContentUpdated: (taskId: string, content: KanbanBoardTaskContent) => void;
}) {
	const displayTitle = title ?? content?.title;
	const hasRoleChips =
		content && assigneeRoleByName
			? kanbanBoardTaskAssigneeRoles(content, assigneeRoleByName).length > 0
			: false;
	const hasMetaChips =
		content?.priority ||
		(content && kanbanBoardTaskAssignees(content).length > 0) ||
		content?.currentAssignee ||
		hasRoleChips ||
		content?.taskType ||
		content?.workType ||
		content?.streamCustomer ||
		content?.estimatePd ||
		content?.dueDate ||
		origin;

	return (
		<Box
			sx={{
				p: 1,
				minWidth: 0,
				borderRadius: 1,
				border: 3,
				borderColor: alpha(columnColor, 0.35),
				// borderTopWidth: 3,
				// borderTopColor: columnColor,
				bgcolor: "background.paper",
				boxShadow: 1,
				cursor: "pointer",
			}}
		>
			<Stack spacing={0.5}>
				{displayTitle ? (
					<Typography
						variant="subtitle2"
						fontWeight={600}
						sx={{ wordBreak: "break-word", lineHeight: 1.35 }}
					>
						{displayTitle}
					</Typography>
				) : null}
				{hasMetaChips ? (
					<Stack
						direction="row"
						spacing={0.5}
						flexWrap="wrap"
						useFlexGap
						alignItems="center"
					>
						<KanbanTaskContentChips
							content={content}
							origin={origin}
							assigneeRoleByName={assigneeRoleByName}
						/>
					</Stack>
				) : null}
				{content ? (
					<KanbanTaskCardSubtasks
						taskId={taskId}
						boardId={boardId}
						parentId={parentId}
						content={content}
						onContentUpdated={onContentUpdated}
						isSaving={isBoardBusy}
					/>
				) : null}
			</Stack>
		</Box>
	);
}

export function KanbanBoardPage() {
	const { boardId = "" } = useParams<{ boardId: string }>();
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [board, setBoard] = useState<KanbanBoardData | null>(null);
	const [importError, setImportError] = useState<string | null>(null);

	const configQuery = useKanbanBoardConfig();
	const boardsQuery = useKanbanBoardBoards();
	const columnsQuery = useKanbanBoardColumns(boardId);
	const assigneesQuery = useKanbanBoardAssignees();
	const assigneeRoleByName = useMemo(
		() => kanbanBoardAssigneeRoleByName(assigneesQuery.data ?? []),
		[assigneesQuery.data],
	);
	const createColumn = useCreateKanbanBoardColumn();
	const updateColumn = useUpdateKanbanBoardColumn();
	const deleteColumn = useDeleteKanbanBoardColumn();
	const boardMeta = boardsQuery.data?.find((item) => item.id === boardId);

	const tasksQuery = useQuery({
		queryKey: ["kanbanBoardTasks", boardId],
		enabled: Boolean(boardId),
		queryFn: async ({ signal }) => kanbanBoardGetBoardTasks(boardId, signal),
	});

	const standId = configQuery.data?.standId;
	const isReady =
		tasksQuery.isSuccess &&
		columnsQuery.isSuccess &&
		configQuery.isSuccess &&
		Boolean(boardId) &&
		Boolean(standId);

	const columnsSignature = (columnsQuery.data ?? [])
		.map(
			(column) =>
				`${column.id}:${column.title}:${column.color}:${column.sortOrder}`,
		)
		.join("|");

	useEffect(() => {
		setBoard(null);
	}, [boardId]);

	useEffect(() => {
		if (!columnsQuery.data || !tasksQuery.isSuccess) return;
		setBoard(buildBoardData(tasksQuery.data ?? [], columnsQuery.data));
	}, [boardId, columnsSignature, columnsQuery.data, tasksQuery.isSuccess]);

	const getColumns = useCallback(
		() =>
			queryClient.getQueryData<KanbanBoardColumnDto[]>([
				"kanbanBoardColumns",
				boardId,
			]) ??
			columnsQuery.data ??
			[],
		[boardId, columnsQuery.data, queryClient],
	);

	const saveMutation = useMutation({
		mutationFn: (nextBoard: KanbanBoardData) => {
			if (!standId) {
				throw new Error("Не загружен standId трекера");
			}
			const now = new Date().toISOString();
			const rows = fromBoardData(nextBoard, standId, now, boardId).map(
				(task) => ({
					...task,
					origin: standId,
				}),
			);
			return kanbanBoardSaveBoardTasks(boardId, rows);
		},
		onSuccess: (tasks) => {
			queryClient.setQueryData(["kanbanBoardTasks", boardId], tasks);
			const columns = getColumns();
			if (columns.length) {
				setBoard(buildBoardData(tasks, columns));
			}
		},
		onError: () => {
			const tasks = queryClient.getQueryData<KanbanBoardTaskRecord[]>([
				"kanbanBoardTasks",
				boardId,
			]);
			const columns = getColumns();
			if (tasks && columns.length) {
				setBoard(buildBoardData(tasks, columns));
			}
		},
	});

	const exportMutation = useMutation({
		mutationFn: () => kanbanBoardExportBoardSnapshot(boardId),
		onSuccess: (blob) => {
			const date = new Date().toISOString().slice(0, 10);
			downloadBlob(blob, `kanban-board-${boardId}-${standId}-${date}.xlsx`);
		},
	});

	const importMutation = useMutation({
		mutationFn: (file: File) => kanbanBoardImportBoardSnapshot(boardId, file),
		onSuccess: (result: KanbanBoardImportResult) => {
			setImportError(null);
			const nextBoard = buildBoardData(result.tasks, getColumns());
			setBoard(nextBoard);
			queryClient.setQueryData(["kanbanBoardTasks", boardId], result.tasks);
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
		(nextBoard: KanbanBoardData) => {
			setBoard(nextBoard);
			saveMutation.mutate(nextBoard);
		},
		[saveMutation],
	);

	const defaultColumnId = columnsQuery.data?.[0]?.id ?? "backlog";

	const openCreateTask = useCallback(
		(columnId = defaultColumnId) => {
			navigate(kanbanTaskCreatePath(boardId, columnId));
		},
		[boardId, defaultColumnId, navigate],
	);

	const handleRenameColumn = useCallback(
		(columnId: string, title: string) => {
			if (!boardId) return;
			updateColumn.mutate({ boardId, columnId, data: { title } });
		},
		[boardId, updateColumn],
	);

	const handleDeleteColumn = useCallback(
		(columnId: string) => {
			if (!boardId) return;
			deleteColumn.mutate({ boardId, columnId });
		},
		[boardId, deleteColumn],
	);

	const handleAddColumn = useCallback(
		(title: string) => {
			if (!boardId) return;
			createColumn.mutate({ boardId, data: { title } });
		},
		[boardId, createColumn],
	);

	const isColumnBusy =
		createColumn.isPending || updateColumn.isPending || deleteColumn.isPending;
	const isBoardBusy = !isReady || !board || isColumnBusy;
	const isSavingBoard = saveMutation.isPending;

	const renderColumnHeader = useCallback(
		(column: BoardItem) => (
			<KanbanColumnHeader
				column={column}
				disabled={isBoardBusy}
				onRename={handleRenameColumn}
				onDelete={handleDeleteColumn}
				onAddTask={openCreateTask}
			/>
		),
		[handleDeleteColumn, handleRenameColumn, isBoardBusy, openCreateTask],
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
			navigate(kanbanTaskEditPath(boardId, card.id));
		},
		[boardId, navigate],
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

	if (!boardId) {
		return <Alert severity="warning">Не указана доска</Alert>;
	}

	const boardSubtitle = boardMeta
		? `${boardMeta.projectCode} / ${boardMeta.name} (${boardMeta.slug}) · стенд ${standId ?? "…"}`
		: `${boardId} · стенд ${standId ?? "…"}`;

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
		>
			<Header
				leadingAccessory={
					<Typography variant="body2" color="text.secondary" noWrap>
						{boardSubtitle}
					</Typography>
				}
			>
				<Flex gap={6} wrap="wrap" alignItems="center">
					<Spacer />
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
					tasksQuery.isError ||
					saveMutation.isError ||
					columnsQuery.isError ||
					createColumn.isError ||
					updateColumn.isError ||
					deleteColumn.isError) && (
					<Stack spacing={2} sx={{ flexShrink: 0, mb: 2 }}>
						{importError ? <Alert severity="error">{importError}</Alert> : null}
						{tasksQuery.isError ? (
							<Alert severity="error">Не удалось загрузить задачи</Alert>
						) : null}
						{saveMutation.isError ? (
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
							},
							"& .rkk-column-outer .rkk-column": {
								height: "auto",
								minHeight: "100%",
								overflow: "visible",
								borderRadius: "4px",
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
						{board ? (
							<Kanban
								dataSource={board as BoardData}
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
											<TaskCardContent
												taskId={data.id}
												boardId={boardId}
												parentId={data.parentId ?? column.id}
												title={data.title}
												content={
													data.content as KanbanBoardTaskContent | undefined
												}
												origin={(data as KanbanBoardData[string]).origin}
												columnColor={getKanbanColumnColor(column)}
												assigneeRoleByName={assigneeRoleByName}
												isBoardBusy={isBoardBusy}
												onContentUpdated={handleTaskContentUpdated}
											/>
										),
									},
								}}
								onCardMove={(move) => {
									if (isSavingBoard || !standId) return;
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
		</Flex>
	);
}
