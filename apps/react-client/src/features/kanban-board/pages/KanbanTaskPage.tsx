import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import {
	KANBAN_BOARD_COLUMN_COLORS,
	KANBAN_BOARD_STATUSES,
	type KanbanBoardStatusId,
	type KanbanBoardTaskContent,
} from "@smart-anketa/api-contract";
import { useEffect, useMemo, useState } from "react";
import {
	Link as RouterLink,
	useNavigate,
	useParams,
	useSearchParams,
} from "react-router";
import { Card } from "@react-client/common/muiCustom/Card";
import { Flex } from "@react-client/common/primitives/Flex";
import { Spacer } from "@react-client/common/primitives/Spacer";
import { Header } from "@react-client/common/navigation/organisms/Header";
import {
	kanbanBoardGetBoardTasks,
	useCreateKanbanBoardTask,
	useKanbanBoardBoards,
	useUpdateKanbanBoardTask,
} from "@react-client/common/api/queries/kanban-board";
import {
	isKanbanTaskCreateRoute,
	kanbanTaskEditPath,
} from "@react-client/features/kanban-board/kanban-task-paths";
import { TrackerMarkdownEditor } from "@react-client/features/kanban-board/components/TrackerMarkdownEditor";
import { useQuery } from "@tanstack/react-query";

const PRIORITY_OPTIONS = [
	{ value: "", label: "—" },
	{ value: "low", label: "low" },
	{ value: "medium", label: "medium" },
	{ value: "high", label: "high" },
] as const;

const DEFAULT_STATUS: KanbanBoardStatusId = "backlog";

type Props = {
	mode?: "create" | "edit";
};

function parseColumnParam(value: string | null): KanbanBoardStatusId {
	if (!value) return DEFAULT_STATUS;
	return (
		KANBAN_BOARD_STATUSES.find((status) => status.id === value)?.id ??
		DEFAULT_STATUS
	);
}

export function KanbanTaskPage({ mode }: Props = {}) {
	const navigate = useNavigate();
	const [searchParams] = useSearchParams();
	const { boardId: boardIdParam = "", taskId = "" } = useParams<{
		boardId?: string;
		taskId?: string;
	}>();

	const isCreate = mode === "create" || isKanbanTaskCreateRoute(taskId ?? "");
	const boardIdFromQuery = searchParams.get("boardId") ?? "";
	const boardId = boardIdParam || boardIdFromQuery;

	const boardsQuery = useKanbanBoardBoards();
	const boardMeta = boardsQuery.data?.find((item) => item.id === boardId);

	const tasksQuery = useQuery({
		queryKey: ["kanbanBoardTasks", boardId],
		enabled: Boolean(boardId) && !isCreate,
		queryFn: ({ signal }) => kanbanBoardGetBoardTasks(boardId, signal),
	});

	const task = useMemo(
		() => tasksQuery.data?.find((item) => item.id === taskId),
		[tasksQuery.data, taskId],
	);

	const createTask = useCreateKanbanBoardTask();
	const updateTask = useUpdateKanbanBoardTask();

	const [selectedBoardId, setSelectedBoardId] = useState(boardId);
	const [title, setTitle] = useState("");
	const [parentId, setParentId] = useState<KanbanBoardStatusId>(
		parseColumnParam(searchParams.get("column")),
	);
	const [priority, setPriority] = useState("");
	const [assignee, setAssignee] = useState("");
	const [description, setDescription] = useState("");

	useEffect(() => {
		if (boardId) {
			setSelectedBoardId(boardId);
		}
	}, [boardId]);

	useEffect(() => {
		if (isCreate || !task) return;
		setTitle(task.content.title);
		setParentId(task.parentId as KanbanBoardStatusId);
		setPriority(task.content.priority ?? "");
		setAssignee(task.content.assignee ?? "");
		setDescription(task.content.description ?? "");
	}, [isCreate, task]);

	const effectiveBoardId = boardId || selectedBoardId;
	const columnColor = KANBAN_BOARD_COLUMN_COLORS[parentId];
	const statusTitle =
		KANBAN_BOARD_STATUSES.find((status) => status.id === parentId)?.title ??
		parentId;

	const buildContent = (): KanbanBoardTaskContent | null => {
		if (!title.trim()) return null;
		return {
			title: title.trim(),
			description: description || undefined,
			priority: priority
				? (priority as KanbanBoardTaskContent["priority"])
				: undefined,
			assignee: assignee.trim() || undefined,
		};
	};

	const handleSave = async () => {
		const content = buildContent();
		if (!content || !effectiveBoardId) return;

		if (isCreate) {
			const created = await createTask.mutateAsync({
				boardId: effectiveBoardId,
				parentId,
				content,
			});
			navigate(kanbanTaskEditPath(created.boardId, created.id), {
				replace: true,
			});
			return;
		}

		if (!task) return;
		await updateTask.mutateAsync({
			id: task.id,
			data: {
				boardId: effectiveBoardId,
				parentId,
				content,
			},
		});
	};

	const backPath = effectiveBoardId
		? `/tracker/boards/${effectiveBoardId}`
		: "/tracker/tasks";

	const isSaving = createTask.isPending || updateTask.isPending;
	const showForm = isCreate || Boolean(task);
	const showBoardPicker = isCreate && !boardIdParam;
	const boardSubtitle = boardMeta
		? `${boardMeta.projectCode} / ${boardMeta.name}`
		: effectiveBoardId || "Новая задача";
	const saveDisabled =
		!title.trim() ||
		!effectiveBoardId ||
		(!isCreate && tasksQuery.isLoading) ||
		isSaving;

	if (!isCreate && !taskId) {
		return <Alert severity="warning">Не указана задача</Alert>;
	}

	return (
		<Flex
			flexDirection="column"
			flexGrow={1}
			minHeight="0"
			sx={{ height: "100%" }}
			data-test-id="kanban-task-page"
		>
			<Header
				leadingAccessory={
					<Typography variant="body2" color="text.secondary" noWrap>
						{boardSubtitle}
					</Typography>
				}
			>
				<Flex gap={1} wrap="wrap" alignItems="center">
					<Chip
						size="small"
						label={isCreate ? "Создание" : statusTitle}
						sx={{
							bgcolor: alpha(columnColor, 0.14),
							color: columnColor,
							border: `1px solid ${alpha(columnColor, 0.35)}`,
						}}
					/>
					<Spacer />
					<Button
						variant="contained"
						size="small"
						onClick={() => void handleSave()}
						disabled={saveDisabled}
					>
						{isCreate ? "Создать" : "Сохранить"}
					</Button>
				</Flex>
			</Header>
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
				<Stack spacing={2} sx={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
					{!isCreate && tasksQuery.isError ? (
						<Alert severity="error">Не удалось загрузить задачу</Alert>
					) : null}
					{!isCreate && tasksQuery.isSuccess && !task ? (
						<Alert severity="warning">Задача не найдена</Alert>
					) : null}
					{createTask.isError || updateTask.isError ? (
						<Alert severity="error">
							{isCreate
								? "Не удалось создать задачу"
								: "Не удалось сохранить задачу"}
						</Alert>
					) : null}

					{showForm ? (
						<Stack spacing={2} sx={{ flex: 1, minHeight: 0, overflow: "auto" }}>
							{showBoardPicker ? (
								<TextField
									select
									label="Доска"
									value={selectedBoardId}
									onChange={(event) => setSelectedBoardId(event.target.value)}
									required
									fullWidth
								>
									{(boardsQuery.data ?? []).map((board) => (
										<MenuItem key={board.id} value={board.id}>
											{board.projectCode}/{board.slug} — {board.name}
										</MenuItem>
									))}
								</TextField>
							) : null}
							<TextField
								label="Заголовок"
								value={title}
								onChange={(event) => setTitle(event.target.value)}
								required
								fullWidth
								autoFocus={isCreate}
							/>
							<Stack direction={{ xs: "column", md: "row" }} spacing={2}>
								<TextField
									select
									label="Колонка"
									value={parentId}
									onChange={(event) =>
										setParentId(event.target.value as KanbanBoardStatusId)
									}
									fullWidth
								>
									{KANBAN_BOARD_STATUSES.map((status) => (
										<MenuItem key={status.id} value={status.id}>
											{status.title}
										</MenuItem>
									))}
								</TextField>
								<TextField
									select
									label="Приоритет"
									value={priority}
									onChange={(event) => setPriority(event.target.value)}
									fullWidth
								>
									{PRIORITY_OPTIONS.map((option) => (
										<MenuItem
											key={option.value || "empty"}
											value={option.value}
										>
											{option.label}
										</MenuItem>
									))}
								</TextField>
								<TextField
									label="Исполнитель"
									value={assignee}
									onChange={(event) => setAssignee(event.target.value)}
									fullWidth
								/>
							</Stack>
							<Box sx={{ flex: 1, minHeight: 360 }}>
								<Typography variant="subtitle2" sx={{ mb: 1 }}>
									Описание (Markdown, Mermaid)
								</Typography>
								<TrackerMarkdownEditor
									value={description}
									onChange={setDescription}
									height={480}
								/>
							</Box>
						</Stack>
					) : null}
				</Stack>
			</Card>
		</Flex>
	);
}
