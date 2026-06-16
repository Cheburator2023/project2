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
	type KanbanBoardTaskContent,
	KANBAN_BOARD_TASK_TYPES,
	KANBAN_BOARD_WORK_TYPES,
} from "@smart-anketa/api-contract";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import { Card } from "@react-client/common/muiCustom/Card";
import { Flex } from "@react-client/common/primitives/Flex";
import { Spacer } from "@react-client/common/primitives/Spacer";
import { Header } from "@react-client/common/navigation/organisms/Header";
import {
	kanbanBoardGetBoardTasks,
	useCreateKanbanBoardTask,
	useKanbanBoardAssignees,
	useKanbanBoardBoards,
	useKanbanBoardColumns,
	useKanbanBoardSprints,
	useKanbanBoardStreams,
	useUpdateKanbanBoardTask,
} from "@react-client/common/api/queries/kanban-board";
import {
	isKanbanTaskCreateRoute,
	kanbanBoardPath,
} from "@react-client/features/kanban-board/kanban-task-paths";
import { TrackerMarkdownEditor } from "@react-client/features/kanban-board/components/TrackerMarkdownEditor";
import { useQuery } from "@tanstack/react-query";

const PRIORITY_OPTIONS = [
	{ value: "", label: "—" },
	{ value: "low", label: "low" },
	{ value: "medium", label: "medium" },
	{ value: "high", label: "high" },
] as const;

const DEFAULT_COLUMN_ID = "backlog";

type Props = {
	mode?: "create" | "edit";
};

function parseColumnParam(
	value: string | null,
	columns: { id: string }[],
): string {
	if (!value) {
		return columns[0]?.id ?? DEFAULT_COLUMN_ID;
	}
	return columns.find((column) => column.id === value)?.id ?? columns[0]?.id ?? DEFAULT_COLUMN_ID;
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

	const [selectedBoardId, setSelectedBoardId] = useState(boardId);
	const [title, setTitle] = useState("");
	const [parentId, setParentId] = useState(DEFAULT_COLUMN_ID);
	const [priority, setPriority] = useState("");
	const [assignee, setAssignee] = useState("");
	const [taskType, setTaskType] = useState("");
	const [workType, setWorkType] = useState("");
	const [estimatePd, setEstimatePd] = useState("");
	const [dueDate, setDueDate] = useState("");
	const [parentTask, setParentTask] = useState("");
	const [sprintId, setSprintId] = useState("");
	const [streamCustomer, setStreamCustomer] = useState("");
	const [description, setDescription] = useState("");

	const boardsQuery = useKanbanBoardBoards();
	const assigneesQuery = useKanbanBoardAssignees();
	const sprintsQuery = useKanbanBoardSprints();
	const streamsQuery = useKanbanBoardStreams();
	const boardMeta = boardsQuery.data?.find((item) => item.id === boardId);

	const effectiveBoardId = boardId || selectedBoardId;
	const columnsQuery = useKanbanBoardColumns(effectiveBoardId);
	const columns = columnsQuery.data ?? [];

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

	useEffect(() => {
		if (boardId) {
			setSelectedBoardId(boardId);
		}
	}, [boardId]);

	useEffect(() => {
		if (!columns.length) return;
		if (isCreate) {
			setParentId(parseColumnParam(searchParams.get("column"), columns));
			return;
		}
		if (task) {
			setParentId(
				columns.some((column) => column.id === task.parentId)
					? task.parentId
					: columns[0].id,
			);
		}
	}, [columns, isCreate, searchParams, task]);

	useEffect(() => {
		if (!isCreate || boardIdParam) return;
		if (!columns.length) return;
		setParentId((current) =>
			columns.some((column) => column.id === current) ? current : columns[0].id,
		);
	}, [boardIdParam, columns, isCreate, selectedBoardId]);

	useEffect(() => {
		if (isCreate || !task) return;
		setTitle(task.content.title);
		setPriority(task.content.priority ?? "");
		setAssignee(task.content.assignee ?? "");
		setTaskType(task.content.taskType ?? "");
		setWorkType(task.content.workType ?? "");
		setEstimatePd(
			task.content.estimatePd !== undefined ? String(task.content.estimatePd) : "",
		);
		setDueDate(task.content.dueDate ?? "");
		setParentTask(task.content.parentTask ?? "");
		setSprintId(task.content.sprintId ?? "");
		setStreamCustomer(task.content.streamCustomer ?? "");
		setDescription(task.content.description ?? "");
	}, [isCreate, task]);

	const selectedColumn = columns.find((column) => column.id === parentId);
	const columnColor = selectedColumn?.color ?? "#94a3b8";
	const statusTitle = selectedColumn?.title ?? parentId;

	const buildContent = (): KanbanBoardTaskContent | null => {
		if (!title.trim()) return null;
		const parsedEstimate = estimatePd.trim() ? Number(estimatePd) : undefined;
		return {
			title: title.trim(),
			description: description || undefined,
			priority: priority
				? (priority as KanbanBoardTaskContent["priority"])
				: undefined,
			assignee: assignee.trim() || undefined,
			taskType: taskType
				? (taskType as KanbanBoardTaskContent["taskType"])
				: undefined,
			workType: workType
				? (workType as KanbanBoardTaskContent["workType"])
				: undefined,
			estimatePd:
				parsedEstimate !== undefined && !Number.isNaN(parsedEstimate)
					? parsedEstimate
					: undefined,
			dueDate: dueDate.trim() || undefined,
			parentTask: parentTask.trim() || undefined,
			sprintId: sprintId || undefined,
			streamCustomer: streamCustomer.trim() || undefined,
		};
	};

	const handleSave = async () => {
		const content = buildContent();
		if (!content || !effectiveBoardId) return;

		if (isCreate) {
			await createTask.mutateAsync({
				boardId: effectiveBoardId,
				parentId,
				content,
			});
			navigate(kanbanBoardPath(effectiveBoardId));
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
		navigate(kanbanBoardPath(effectiveBoardId));
	};

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
									onChange={(event) => setParentId(event.target.value)}
									fullWidth
									disabled={columnsQuery.isLoading || !columns.length}
								>
									{columns.map((column) => (
										<MenuItem key={column.id} value={column.id}>
											{column.title}
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
									select
									label="Исполнитель"
									value={assignee}
									onChange={(event) => setAssignee(event.target.value)}
									fullWidth
								>
									<MenuItem value="">—</MenuItem>
									{(assigneesQuery.data ?? []).map((item) => (
										<MenuItem key={item.id} value={item.name}>
											{item.name}
											{item.email ? ` (${item.email})` : ""}
										</MenuItem>
									))}
								</TextField>
							</Stack>
							<Stack direction={{ xs: "column", md: "row" }} spacing={2}>
								<TextField
									select
									label="Тип задачи"
									value={taskType}
									onChange={(event) => setTaskType(event.target.value)}
									fullWidth
								>
									<MenuItem value="">—</MenuItem>
									{KANBAN_BOARD_TASK_TYPES.map((option) => (
										<MenuItem key={option.id} value={option.id}>
											{option.title}
										</MenuItem>
									))}
								</TextField>
								<TextField
									select
									label="Тип работ"
									value={workType}
									onChange={(event) => setWorkType(event.target.value)}
									fullWidth
								>
									<MenuItem value="">—</MenuItem>
									{KANBAN_BOARD_WORK_TYPES.map((option) => (
										<MenuItem key={option.id} value={option.id}>
											{option.title}
										</MenuItem>
									))}
								</TextField>
								<TextField
									label="Оценка, чд"
									type="number"
									value={estimatePd}
									onChange={(event) => setEstimatePd(event.target.value)}
									fullWidth
									inputProps={{ min: 0, step: 0.5 }}
								/>
							</Stack>
							<Stack direction={{ xs: "column", md: "row" }} spacing={2}>
								<TextField
									label="Срок исполнения"
									type="date"
									value={dueDate}
									onChange={(event) => setDueDate(event.target.value)}
									fullWidth
									InputLabelProps={{ shrink: true }}
								/>
								<TextField
									label="Родительская задача"
									value={parentTask}
									onChange={(event) => setParentTask(event.target.value)}
									fullWidth
									placeholder="Ключ или название родительской задачи"
								/>
								<TextField
									select
									label="Спринт"
									value={sprintId}
									onChange={(event) => setSprintId(event.target.value)}
									fullWidth
								>
									<MenuItem value="">—</MenuItem>
									{(sprintsQuery.data ?? []).map((item) => (
										<MenuItem key={item.id} value={item.id}>
											{item.code} — {item.name}
										</MenuItem>
									))}
								</TextField>
								<TextField
									select
									label="Стрим-заказчик"
									value={streamCustomer}
									onChange={(event) => setStreamCustomer(event.target.value)}
									fullWidth
								>
									<MenuItem value="">—</MenuItem>
									{(streamsQuery.data ?? []).map((item) => (
										<MenuItem key={item.id} value={item.name}>
											{item.name}
										</MenuItem>
									))}
								</TextField>
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
