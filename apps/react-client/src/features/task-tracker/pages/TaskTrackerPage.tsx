import DownloadIcon from "@mui/icons-material/Download";
import PublishIcon from "@mui/icons-material/Publish";
import AddIcon from "@mui/icons-material/Add";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	fromBoardData,
	toBoardData,
	type KanbanBoardData,
} from "@smart-anketa/api-contract";
import { Kanban, dropHandler } from "react-kanban-kit";
import type { BoardData, CardRenderProps } from "react-kanban-kit";
import { useCallback, useEffect, useRef, useState } from "react";
import { ulid } from "ulid";
import { Card } from "@react-client/common/muiCustom/Card";
import { Flex } from "@react-client/common/primitives/Flex";
import { Header } from "@react-client/common/navigation/organisms/Header";
import {
	downloadBlob,
	taskTrackerExportSnapshot,
	taskTrackerGetConfig,
	taskTrackerGetTasks,
	taskTrackerImportSnapshot,
	taskTrackerSaveTasks,
	type TaskTrackerImportError,
} from "@react-client/common/api/queries/task-tracker";

const emptyBoard = (): KanbanBoardData => toBoardData([]);

function TaskCardContent({
	content,
	origin,
}: {
	content?: { priority?: string; assignee?: string; description?: string };
	origin?: string;
}) {
	return (
		<Stack spacing={0.75} sx={{ p: 1 }}>
			{content?.description ? (
				<Typography variant="body2" color="text.secondary">
					{content.description}
				</Typography>
			) : null}
			<Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
				{content?.priority ? (
					<Chip size="small" label={content.priority} />
				) : null}
				{content?.assignee ? (
					<Chip size="small" variant="outlined" label={content.assignee} />
				) : null}
				{origin ? (
					<Chip size="small" variant="outlined" color="info" label={origin} />
				) : null}
			</Stack>
		</Stack>
	);
}

export function TaskTrackerPage() {
	const queryClient = useQueryClient();
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [board, setBoard] = useState<KanbanBoardData>(emptyBoard);
	const [importError, setImportError] = useState<string | null>(null);

	const configQuery = useQuery({
		queryKey: ["taskTrackerConfig"],
		queryFn: ({ signal }) => taskTrackerGetConfig(signal),
	});

	const tasksQuery = useQuery({
		queryKey: ["taskTrackerTasks"],
		queryFn: async ({ signal }) => {
			const tasks = await taskTrackerGetTasks(signal);
			return toBoardData(tasks);
		},
	});

	const standId = configQuery.data?.standId ?? "local-dev";
	const isReady = tasksQuery.isSuccess;

	useEffect(() => {
		if (tasksQuery.data) {
			setBoard(tasksQuery.data);
		}
	}, [tasksQuery.data]);

	const saveMutation = useMutation({
		mutationFn: (nextBoard: KanbanBoardData) => {
			const now = new Date().toISOString();
			const localRows = fromBoardData(nextBoard, standId, now).filter(
				(task) => task.origin === standId,
			);
			return taskTrackerSaveTasks(localRows);
		},
		onSuccess: (tasks) => {
			queryClient.setQueryData(["taskTrackerTasks"], toBoardData(tasks));
			setBoard(toBoardData(tasks));
		},
	});

	const exportMutation = useMutation({
		mutationFn: () => taskTrackerExportSnapshot(),
		onSuccess: (blob) => {
			const date = new Date().toISOString().slice(0, 10);
			downloadBlob(blob, `tasks-${standId}-${date}.xlsx`);
		},
	});

	const importMutation = useMutation({
		mutationFn: (file: File) => taskTrackerImportSnapshot(file),
		onSuccess: (result) => {
			setImportError(null);
			const nextBoard = toBoardData(result.tasks);
			setBoard(nextBoard);
			queryClient.setQueryData(["taskTrackerTasks"], nextBoard);
		},
		onError: (error: TaskTrackerImportError & Error) => {
			const payload = (error as any)?.response?.data;
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

	const handleAddTask = () => {
		const id = ulid();
		const nextBoard: KanbanBoardData = {
			...board,
			backlog: {
				...board.backlog,
				children: [id, ...board.backlog.children],
				totalChildrenCount: board.backlog.children.length + 1,
			},
			[id]: {
				id,
				title: "Новая задача",
				parentId: "backlog",
				children: [],
				totalChildrenCount: 0,
				type: "card",
				content: { title: "Новая задача" },
				origin: standId,
			},
		};
		persistBoard(nextBoard);
	};

	return (
		<Flex flexDirection="column" data-test-id="task-tracker-page">
			<Header />
			<Card sx={{ p: 2 }}>
				<Stack spacing={2}>
					<Stack
						direction={{ xs: "column", md: "row" }}
						justifyContent="space-between"
						alignItems={{ xs: "stretch", md: "center" }}
						spacing={1.5}
					>
						<div>
							<Typography variant="h2">Таск-трекер</Typography>
							<Typography variant="body2" color="text.secondary">
								Стенд: {standId}. Экспорт и импорт — полный XLSX-снапшот с sha256.
							</Typography>
						</div>
						<Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
							<Button
								startIcon={<AddIcon />}
								variant="contained"
								onClick={handleAddTask}
								disabled={!isReady || saveMutation.isPending}
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

					{importError ? <Alert severity="error">{importError}</Alert> : null}
					{tasksQuery.isError ? (
						<Alert severity="error">Не удалось загрузить задачи</Alert>
					) : null}
					{saveMutation.isError ? (
						<Alert severity="error">Не удалось сохранить изменения</Alert>
					) : null}

					<Kanban
						dataSource={board as BoardData}
						configMap={{
							card: {
								render: ({ data }: CardRenderProps) => (
									<TaskCardContent
										content={data.content as TaskCardContent["content"]}
										origin={(data as KanbanBoardData[string]).origin}
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
				</Stack>
			</Card>
		</Flex>
	);
}
