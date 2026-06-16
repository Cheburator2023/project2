import AddIcon from "@mui/icons-material/Add";
import DownloadIcon from "@mui/icons-material/Download";
import PublishIcon from "@mui/icons-material/Publish";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	fromBoardData,
	toBoardData,
	type KanbanBoardData,
	type KanbanBoardStatusId,
	type KanbanBoardTaskContent,
} from "@smart-anketa/api-contract";
import { Kanban, dropHandler } from "react-kanban-kit";
import type { BoardData, BoardItem } from "react-kanban-kit";
import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import { useNavigate, useParams } from "react-router";
import { Card } from "@react-client/common/muiCustom/Card";
import { Flex } from "@react-client/common/primitives/Flex";
import { Header } from "@react-client/common/navigation/organisms/Header";
import {
	downloadBlob,
	kanbanBoardExportBoardSnapshot,
	kanbanBoardGetBoardTasks,
	kanbanBoardImportBoardSnapshot,
	kanbanBoardSaveBoardTasks,
	useKanbanBoardBoards,
	useKanbanBoardConfig,
	type KanbanBoardImportResult,
} from "@react-client/common/api/queries/kanban-board";
import {
	kanbanTaskCreatePath,
	kanbanTaskEditPath,
} from "@react-client/features/kanban-board/kanban-task-paths";

const emptyBoard = (): KanbanBoardData => toBoardData([]);

function getColumnColor(column: BoardItem): string {
	const color = column.content?.color;
	return typeof color === "string" && color ? color : "#94a3b8";
}

function TaskCardContent({
	title,
	content,
	origin,
	columnColor,
}: {
	title?: string;
	content?: KanbanBoardTaskContent;
	origin?: string;
	columnColor: string;
}) {
	const displayTitle = title ?? content?.title;

	return (
		<Box
			sx={{
				p: 1.25,
				minWidth: 0,
				borderRadius: 1,
				border: 1,
				borderColor: alpha(columnColor, 0.35),
				borderTopWidth: 3,
				borderTopColor: columnColor,
				bgcolor: "background.paper",
				boxShadow: 1,
				cursor: "pointer",
			}}
		>
			<Stack spacing={0.75}>
				{displayTitle ? (
					<Typography
						variant="subtitle2"
						fontWeight={600}
						sx={{ wordBreak: "break-word" }}
					>
						{displayTitle}
					</Typography>
				) : null}
				{content?.priority || content?.assignee || origin ? (
					<Stack
						direction="row"
						spacing={0.5}
						flexWrap="wrap"
						useFlexGap
						alignItems="center"
					>
						{content?.priority ? (
							<Chip size="small" label={content.priority} />
						) : null}
						{content?.assignee ? (
							<Chip size="small" variant="outlined" label={content.assignee} />
						) : null}
						{origin ? (
							<Chip
								size="small"
								variant="outlined"
								color="info"
								label={origin}
							/>
						) : null}
					</Stack>
				) : null}
			</Stack>
		</Box>
	);
}

function KanbanColumnHeader({ column }: { column: BoardItem }) {
	const color = getColumnColor(column);

	return (
		<Box
			sx={{
				px: 1,
				py: 0.75,
				borderBottom: 2,
				borderColor: color,
				bgcolor: alpha(color, 0.08),
			}}
		>
			<Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
				<Typography variant="subtitle2" fontWeight={700} sx={{ color }}>
					{column.title}
				</Typography>
				<Chip
					size="small"
					label={column.totalChildrenCount}
					sx={{
						height: 22,
						bgcolor: alpha(color, 0.14),
						color,
						border: `1px solid ${alpha(color, 0.3)}`,
					}}
				/>
			</Stack>
		</Box>
	);
}

function ColumnAddTaskFooter({
	column,
	disabled,
	onAdd,
}: {
	column: BoardItem;
	disabled: boolean;
	onAdd: (columnId: string) => void;
}) {
	const color = getColumnColor(column);

	return (
		<Button
			fullWidth
			size="small"
			startIcon={<AddIcon fontSize="small" />}
			disabled={disabled}
			onClick={() => onAdd(column.id)}
			sx={{
				justifyContent: "flex-start",
				color,
				mt: 0.5,
				px: 1,
				py: 0.75,
			}}
		>
			Добавить задачу
		</Button>
	);
}

export function KanbanBoardPage() {
	const { boardId = "" } = useParams<{ boardId: string }>();
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [board, setBoard] = useState<KanbanBoardData>(emptyBoard);
	const [importError, setImportError] = useState<string | null>(null);

	const configQuery = useKanbanBoardConfig();
	const boardsQuery = useKanbanBoardBoards();
	const boardMeta = boardsQuery.data?.find((item) => item.id === boardId);

	const tasksQuery = useQuery({
		queryKey: ["kanbanBoardTasks", boardId],
		enabled: Boolean(boardId),
		queryFn: async ({ signal }) => {
			const tasks = await kanbanBoardGetBoardTasks(boardId, signal);
			return toBoardData(tasks);
		},
	});

	const standId = configQuery.data?.standId ?? "local-dev";
	const isReady = tasksQuery.isSuccess && Boolean(boardId);

	useEffect(() => {
		if (tasksQuery.data) {
			setBoard(tasksQuery.data);
		}
	}, [tasksQuery.data]);

	const saveMutation = useMutation({
		mutationFn: (nextBoard: KanbanBoardData) => {
			const now = new Date().toISOString();
			const localRows = fromBoardData(nextBoard, standId, now, boardId).filter(
				(task) => task.origin === standId,
			);
			return kanbanBoardSaveBoardTasks(boardId, localRows);
		},
		onSuccess: (tasks) => {
			const nextBoard = toBoardData(tasks);
			queryClient.setQueryData(["kanbanBoardTasks", boardId], nextBoard);
			setBoard(nextBoard);
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
			const nextBoard = toBoardData(result.tasks);
			setBoard(nextBoard);
			queryClient.setQueryData(["kanbanBoardTasks", boardId], nextBoard);
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

	const openCreateTask = useCallback(
		(columnId = "backlog") => {
			navigate(
				kanbanTaskCreatePath(boardId, columnId as KanbanBoardStatusId),
			);
		},
		[boardId, navigate],
	);

	const isBoardBusy = !isReady || saveMutation.isPending;

	const renderListFooter = useCallback(
		(column: BoardItem) => (
			<ColumnAddTaskFooter
				column={column}
				disabled={isBoardBusy}
				onAdd={openCreateTask}
			/>
		),
		[isBoardBusy, openCreateTask],
	);

	const renderColumnHeader = useCallback(
		(column: BoardItem) => <KanbanColumnHeader column={column} />,
		[],
	);

	const columnStyle = useCallback(
		(column: BoardItem) => {
			const color = getColumnColor(column);
			return {
				background: `color-mix(in srgb, ${color}, transparent 92%)`,
			};
		},
		[],
	);

	const handleCardClick = useCallback(
		(_event: MouseEvent<HTMLDivElement>, card: BoardItem) => {
			navigate(kanbanTaskEditPath(boardId, card.id));
		},
		[boardId, navigate],
	);

	if (!boardId) {
		return <Alert severity="warning">Не указана доска</Alert>;
	}

	return (
		<Flex
			flexDirection="column"
			flexGrow={1}
			minHeight="0"
			sx={{ height: "100%" }}
			data-test-id="kanban-board-page"
		>
			<Header />
			<Card
				sx={{
					p: 2,
					flex: 1,
					minHeight: 0,
					display: "flex",
					flexDirection: "column",
					overflow: "hidden",
				}}
			>
				<Stack
					spacing={2}
					sx={{ flex: 1, minHeight: 0, overflow: "hidden" }}
				>
					<Stack
						direction={{ xs: "column", md: "row" }}
						justifyContent="space-between"
						alignItems={{ xs: "stretch", md: "center" }}
						spacing={1.5}
						sx={{ flexShrink: 0 }}
					>
						<div>
							<Typography variant="body2" color="text.secondary">
								{boardMeta
									? `${boardMeta.projectCode} / ${boardMeta.name} (${boardMeta.slug})`
									: boardId}{" "}
								· стенд {standId}
							</Typography>
						</div>
						<Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
							<Button
								startIcon={<AddIcon />}
								variant="contained"
								onClick={() => openCreateTask("backlog")}
								disabled={isBoardBusy}
							>
								Добавить задачу
							</Button>
							<Button
								startIcon={<DownloadIcon />}
								variant="outlined"
								onClick={() => exportMutation.mutate()}
								disabled={exportMutation.isPending}
							>
								Экспорт XLSX
							</Button>
							<Button
								startIcon={<PublishIcon />}
								variant="outlined"
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
						</Stack>
					</Stack>

					{importError ? (
						<Alert severity="error" sx={{ flexShrink: 0 }}>
							{importError}
						</Alert>
					) : null}
					{tasksQuery.isError ? (
						<Alert severity="error" sx={{ flexShrink: 0 }}>
							Не удалось загрузить задачи
						</Alert>
					) : null}
					{saveMutation.isError ? (
						<Alert severity="error" sx={{ flexShrink: 0 }}>
							Не удалось сохранить изменения
						</Alert>
					) : null}

					<Box sx={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
						<Kanban
							dataSource={board as BoardData}
							rootStyle={{ height: "100%" }}
							cardsGap={8}
							renderColumnHeader={renderColumnHeader}
							columnStyle={columnStyle}
							renderListFooter={renderListFooter}
							allowListFooter={() => !isBoardBusy}
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
											title={data.title}
											content={
												data.content as KanbanBoardTaskContent | undefined
											}
											origin={(data as KanbanBoardData[string]).origin}
											columnColor={getColumnColor(column)}
										/>
									),
								},
							}}
							onCardMove={(move) =>
								persistBoard(
									dropHandler(move, board as BoardData) as KanbanBoardData,
								)
							}
						/>
					</Box>
				</Stack>
			</Card>
		</Flex>
	);
}
