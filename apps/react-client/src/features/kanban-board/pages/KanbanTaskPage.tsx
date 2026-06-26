import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import {
	KANBAN_BOARD_ASSIGNEE_ROLES,
	KANBAN_BOARD_TASK_TYPES,
	KANBAN_BOARD_WORK_TYPES,
	kanbanBoardPriorityColor,
	kanbanBoardTaskAssignees,
	kanbanBoardTaskTypeColor,
	kanbanBoardWorkTypeColor,
	type KanbanBoardAssigneeRoleId,
	type KanbanBoardTaskContent,
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
import { KanbanTaskMultiSelectField, KanbanTaskSelectField } from "@react-client/features/kanban-board/components/KanbanTaskSelectField";
import {
	isKanbanTaskCreateRoute,
	kanbanBoardPath,
} from "@react-client/features/kanban-board/kanban-task-paths";
import { TrackerMarkdownEditor } from "@react-client/features/kanban-board/components/TrackerMarkdownEditor";
import { useQuery } from "@tanstack/react-query";

const PRIORITY_OPTIONS = [
	{ value: "low", label: "low", color: kanbanBoardPriorityColor("low") },
	{ value: "medium", label: "medium", color: kanbanBoardPriorityColor("medium") },
	{ value: "high", label: "high", color: kanbanBoardPriorityColor("high") },
] as const;

const DEFAULT_COLUMN_ID = "backlog";
const BOARD_SELECT_COLOR = "#6366f1";
const ASSIGNEE_SELECT_COLOR = "#2563eb";
const SPRINT_SELECT_COLOR = "#0891b2";
const STREAM_SELECT_COLOR = "#7c3aed";

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
	const [assignees, setAssignees] = useState<string[]>([]);
	const [assigneeRole, setAssigneeRole] = useState("");
	const [taskType, setTaskType] = useState("");
	const [workType, setWorkType] = useState("");
	const [estimatePd, setEstimatePd] = useState("");
	const [dueDate, setDueDate] = useState("");
	const [parentTask, setParentTask] = useState("");
	const [customer, setCustomer] = useState("");
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

	const boardOptions = useMemo(
		() =>
			(boardsQuery.data ?? []).map((board) => ({
				value: board.id,
				label: `${board.projectCode}/${board.slug} — ${board.name}`,
				color: BOARD_SELECT_COLOR,
			})),
		[boardsQuery.data],
	);

	const columnOptions = useMemo(
		() =>
			columns.map((column) => ({
				value: column.id,
				label: column.title,
				color: column.color,
			})),
		[columns],
	);

	const assigneeOptions = useMemo(
		() =>
			(assigneesQuery.data ?? []).map((item) => ({
				value: item.name,
				label: item.email ? `${item.name} (${item.email})` : item.name,
				color: ASSIGNEE_SELECT_COLOR,
			})),
		[assigneesQuery.data],
	);

	const assigneeRoleOptions = useMemo(
		() =>
			KANBAN_BOARD_ASSIGNEE_ROLES.map((role: (typeof KANBAN_BOARD_ASSIGNEE_ROLES)[number]) => ({
				value: role.id,
				label: role.title,
				color: role.color,
			})),
		[],
	);

	const taskTypeOptions = useMemo(
		() =>
			KANBAN_BOARD_TASK_TYPES.map((option) => ({
				value: option.id,
				label: option.title,
				color: kanbanBoardTaskTypeColor(option.id),
			})),
		[],
	);

	const workTypeOptions = useMemo(
		() =>
			KANBAN_BOARD_WORK_TYPES.map((option) => ({
				value: option.id,
				label: option.title,
				color: kanbanBoardWorkTypeColor(option.id),
			})),
		[],
	);

	const sprintOptions = useMemo(
		() =>
			(sprintsQuery.data ?? []).map((item) => ({
				value: item.id,
				label: `${item.code} — ${item.name}`,
				color: SPRINT_SELECT_COLOR,
			})),
		[sprintsQuery.data],
	);

	const streamOptions = useMemo(
		() =>
			(streamsQuery.data ?? []).map((item) => ({
				value: item.name,
				label: item.name,
				color: STREAM_SELECT_COLOR,
			})),
		[streamsQuery.data],
	);

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
		setAssignees(kanbanBoardTaskAssignees(task.content));
		setAssigneeRole(task.content.assigneeRole ?? "");
		setTaskType(task.content.taskType ?? "");
		setWorkType(task.content.workType ?? "");
		setEstimatePd(
			task.content.estimatePd !== undefined ? String(task.content.estimatePd) : "",
		);
		setDueDate(task.content.dueDate ?? "");
		setParentTask(task.content.parentTask ?? "");
		setCustomer(task.content.customer ?? "");
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
			assignees: assignees.length ? assignees : undefined,
			assigneeRole: assigneeRole
				? (assigneeRole as KanbanBoardAssigneeRoleId)
				: undefined,
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
			customer: customer.trim() || undefined,
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
								<KanbanTaskSelectField
									label="Доска"
									value={selectedBoardId}
									options={boardOptions}
									onChange={setSelectedBoardId}
									required
									fullWidth
								/>
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
								<KanbanTaskSelectField
									label="Колонка"
									value={parentId}
									options={columnOptions}
									onChange={setParentId}
									disabled={columnsQuery.isLoading || !columns.length}
									fullWidth
								/>
								<KanbanTaskSelectField
									label="Приоритет"
									value={priority}
									options={PRIORITY_OPTIONS.map((option) => ({
										value: option.value,
										label: option.label,
										color: option.color,
									}))}
									onChange={setPriority}
									fullWidth
								/>
								<KanbanTaskMultiSelectField
									label="Исполнители"
									value={assignees}
									options={assigneeOptions}
									onChange={setAssignees}
									fullWidth
								/>
								<KanbanTaskSelectField
									label="Роль исполнителя"
									value={assigneeRole}
									options={assigneeRoleOptions}
									onChange={setAssigneeRole}
									fullWidth
								/>
							</Stack>
							<Stack direction={{ xs: "column", md: "row" }} spacing={2}>
								<KanbanTaskSelectField
									label="Тип задачи"
									value={taskType}
									options={taskTypeOptions}
									onChange={setTaskType}
									fullWidth
								/>
								<KanbanTaskSelectField
									label="Тип работ"
									value={workType}
									options={workTypeOptions}
									onChange={setWorkType}
									fullWidth
								/>
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
									label="Заказчик"
									value={customer}
									onChange={(event) => setCustomer(event.target.value)}
									fullWidth
									placeholder="Заказчик задачи"
								/>
								<KanbanTaskSelectField
									label="Спринт"
									value={sprintId}
									options={sprintOptions}
									onChange={setSprintId}
									fullWidth
								/>
								<KanbanTaskSelectField
									label="Стрим-заказчик"
									value={streamCustomer}
									options={streamOptions}
									onChange={setStreamCustomer}
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
