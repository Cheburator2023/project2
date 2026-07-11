import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { alpha } from "@mui/material/styles";
import { format, isValid, parseISO } from "date-fns";
import {
	KANBAN_BOARD_PRIORITIES,
	KANBAN_BOARD_HEAP_BOARD_ID,
	KANBAN_BOARD_TASK_TYPES,
	KANBAN_BOARD_WORK_TYPES,
	kanbanBoardPriorityColor,
	kanbanBoardTaskAssignees,
	kanbanBoardTaskTypeColor,
	kanbanBoardWorkTypeColor,
	normalizeKanbanBoardTaskContent,
	normalizeKanbanBoardSubtasks,
	kanbanBoardRoleEstimatesTotal,
	type KanbanBoardRoleEstimates,
	type KanbanBoardSubtaskItem,
	type KanbanBoardTaskContent,
	type KanbanBoardTaskRegistryDto,
	parseKanbanBoardTaskEditBlockedError,
	type KanbanBoardTaskEditBlockedErrorDto,
} from "@smart-anketa/api-contract";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import { Card } from "@react-client/common/muiCustom/Card";
import { FuzzyAutocomplete } from "@react-client/common/muiCustom/FuzzyAutocomplete";
import { Flex } from "@react-client/common/primitives/Flex";
import { Spacer } from "@react-client/common/primitives/Spacer";
import { Header } from "@react-client/common/navigation/organisms/Header";
import { apiErrorMessage } from "@react-client/common/api/helpers/apiErrorMessage";
import {
	useCreateKanbanBoardTask,
	useKanbanBoardAssignees,
	useKanbanBoardBoards,
	useKanbanBoardColumns,
	useKanbanBoardCustomers,
	useKanbanBoardSprints,
	useKanbanBoardSettings,
	useKanbanBoardStreams,
	useKanbanBoardTaskByRef,
	useKanbanBoardTaskImages,
	useKanbanBoardTasksRegistry,
	useUpdateKanbanBoardTask,
} from "@react-client/common/api/queries/kanban-board";
import {
	KanbanTaskMultiSelectField,
	KanbanTaskSelectField,
} from "@react-client/features/kanban-board/components/KanbanTaskSelectField";
import { KanbanRoleEstimatesFields } from "@react-client/features/kanban-board/components/KanbanRoleEstimatesFields";
import { KanbanSubtasksChecklist } from "@react-client/features/kanban-board/components/KanbanSubtasksChecklist";
import { KanbanTaskImagesSection } from "@react-client/features/kanban-board/components/KanbanTaskImagesSection";
import { KanbanTaskCommentsSection } from "@react-client/features/kanban-board/components/KanbanTaskCommentsSection";
import {
	isKanbanTaskCreateRoute,
	kanbanBoardPath,
	trackerTaskPath,
} from "@react-client/features/kanban-board/kanban-task-paths";
import { normalizeTrackerCode } from "@smart-anketa/api-contract";
import { TrackerMarkdownEditor } from "@react-client/features/kanban-board/components/TrackerMarkdownEditor";
import { TrackerTaskConflictDialog } from "@react-client/features/tracker/components/TrackerTaskConflictDialog";
import { useKanbanTaskEditLock } from "@react-client/features/tracker/hooks/useKanbanTaskEditLock";
import { useTrackerTaskSync } from "@react-client/features/tracker/hooks/useTrackerTaskSync";

const PRIORITY_OPTIONS = KANBAN_BOARD_PRIORITIES.map((option) => ({
	value: option.id,
	label: option.title,
	color: kanbanBoardPriorityColor(option.id),
}));

const DEFAULT_COLUMN_ID = "todo";
const BOARD_SELECT_COLOR = "#6366f1";
const ASSIGNEE_SELECT_COLOR = "#2563eb";
const SPRINT_SELECT_COLOR = "#0891b2";
const STREAM_SELECT_COLOR = "#7c3aed";
const CUSTOMER_SELECT_COLOR = "#0d9488";

const parseDueDate = (value: string): Date | null => {
	if (!value.trim()) return null;
	const parsed = parseISO(value.trim());
	return isValid(parsed) ? parsed : null;
};

const formatDueDate = (value: Date | null): string => {
	if (!value || !isValid(value)) return "";
	return format(value, "yyyy-MM-dd");
};

function resolveKanbanTaskAssigneeFields(
	assignees: string[],
	currentAssignee: string,
): { assignees?: string[]; currentAssignee?: string } {
	const uniqueAssignees = [
		...new Set(assignees.map((item) => item.trim()).filter(Boolean)),
	];
	const current = currentAssignee.trim();
	if (current && !uniqueAssignees.includes(current)) {
		uniqueAssignees.push(current);
	}
	const resolvedCurrent = current || uniqueAssignees[0];
	return {
		assignees: uniqueAssignees.length ? uniqueAssignees : undefined,
		currentAssignee: resolvedCurrent || undefined,
	};
}

type ParentTaskOption = {
	id: string;
	label: string;
};

const formatParentTaskLabel = (task: KanbanBoardTaskRegistryDto): string => {
	return `${task.taskKey} · ${task.title}`;
};

const toParentTaskOption = (
	task: KanbanBoardTaskRegistryDto,
): ParentTaskOption => ({
	id: task.id,
	label: formatParentTaskLabel(task),
});

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
	return (
		columns.find((column) => column.id === value)?.id ??
		columns[0]?.id ??
		DEFAULT_COLUMN_ID
	);
}

export function KanbanTaskPage({ mode }: Props = {}) {
	const navigate = useNavigate();
	const [searchParams] = useSearchParams();
	const { boardKey: boardKeyParam = "", taskKey = "" } = useParams<{
		boardKey?: string;
		taskKey?: string;
	}>();

	const isCreate = mode === "create" || isKanbanTaskCreateRoute(taskKey ?? "");
	const boardKeyFromQuery = searchParams.get("board") ?? "";
	const boardKey = boardKeyParam || boardKeyFromQuery;

	const taskByRefQuery = useKanbanBoardTaskByRef(
		!isCreate && taskKey ? taskKey : undefined,
	);
	const taskId = taskByRefQuery.data?.id ?? "";
	const taskImagesQuery = useKanbanBoardTaskImages(!isCreate ? taskId : undefined);
	const boardIdFromTask = taskByRefQuery.data?.boardId ?? "";
	const boardIdFromQuery = searchParams.get("boardId") ?? "";

	const boardsQuery = useKanbanBoardBoards();
	const boardMetaFromKey = boardsQuery.data?.find(
		(item) =>
			item.boardKey === normalizeTrackerCode(boardKey) ||
			item.id === boardKey,
	);
	const boardId =
		boardIdFromTask ||
		boardIdFromQuery ||
		boardMetaFromKey?.id ||
		"";

	const [selectedBoardId, setSelectedBoardId] = useState("");
	const [title, setTitle] = useState("");
	const [backlogNumber, setBacklogNumber] = useState("");
	const [parentId, setParentId] = useState(DEFAULT_COLUMN_ID);
	const [priority, setPriority] = useState("");
	const [assignees, setAssignees] = useState<string[]>([]);
	const [currentAssignee, setCurrentAssignee] = useState("");
	const [taskType, setTaskType] = useState("");
	const [workType, setWorkType] = useState("");
	const [estimatePd, setEstimatePd] = useState("");
	const [roleEstimates, setRoleEstimates] = useState<KanbanBoardRoleEstimates>(
		{},
	);
	const [dueDate, setDueDate] = useState("");
	const [parentTask, setParentTask] = useState("");
	const [customer, setCustomer] = useState("");
	const [sprintOutcome, setSprintOutcome] = useState("");
	const [sprintId, setSprintId] = useState("");
	const [streamCustomer, setStreamCustomer] = useState("");
	const [description, setDescription] = useState("");
	const [subtasks, setSubtasks] = useState<KanbanBoardSubtaskItem[]>([]);

	const assigneesQuery = useKanbanBoardAssignees();
	const settingsQuery = useKanbanBoardSettings();
	const sprintsQuery = useKanbanBoardSprints();
	const streamsQuery = useKanbanBoardStreams();
	const customersQuery = useKanbanBoardCustomers();
	const tasksRegistryQuery = useKanbanBoardTasksRegistry();

	const effectiveBoardId = boardId || selectedBoardId;
	const boardMeta =
		boardsQuery.data?.find((item) => item.id === effectiveBoardId) ??
		boardMetaFromKey ??
		taskByRefQuery.data;
	const boardApiRef =
		taskByRefQuery.data?.boardKey ??
		boardMetaFromKey?.boardKey ??
		boardMeta?.boardKey ??
		normalizeTrackerCode(boardKey);
	const columnsQuery = useKanbanBoardColumns(boardApiRef || effectiveBoardId);
	const columns = columnsQuery.data ?? [];

	const boardOptions = useMemo(
		() =>
			(boardsQuery.data ?? []).map((board) => ({
				value: board.id,
				label: `${board.boardKey} — ${board.name}`,
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
				label: item.roleTitle
					? `${item.name} — ${item.roleTitle}${item.email ? ` (${item.email})` : ""}`
					: item.email
						? `${item.name} (${item.email})`
						: item.name,
				color: ASSIGNEE_SELECT_COLOR,
			})),
		[assigneesQuery.data],
	);

	const currentAssigneeOptions = useMemo(() => {
		const pool = assignees.length
			? assigneeOptions.filter((option) => assignees.includes(option.value))
			: assigneeOptions;
		return pool;
	}, [assigneeOptions, assignees]);

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

	const customerOptions = useMemo(
		() =>
			(customersQuery.data ?? []).map((item) => ({
				value: item.name,
				label: `${item.code} — ${item.name}`,
				color: CUSTOMER_SELECT_COLOR,
			})),
		[customersQuery.data],
	);

	const parentTaskOptions = useMemo(
		() =>
			(tasksRegistryQuery.data ?? [])
				.filter((row) => row.id !== taskId)
				.map(toParentTaskOption),
		[tasksRegistryQuery.data, taskId],
	);

	const selectedParentTask = useMemo((): ParentTaskOption | null => {
		if (!parentTask) return null;
		const row = (tasksRegistryQuery.data ?? []).find(
			(item) => item.id === parentTask || item.title === parentTask,
		);
		return row ? toParentTaskOption(row) : null;
	}, [parentTask, tasksRegistryQuery.data]);

	const task = taskByRefQuery.data;
	const taskImages = taskImagesQuery.isLoading
		? (task?.content.images ?? [])
		: (taskImagesQuery.data ?? []);

	useEffect(() => {
		if (boardId) {
			setSelectedBoardId(boardId);
			return;
		}
		if (isCreate) {
			setSelectedBoardId(KANBAN_BOARD_HEAP_BOARD_ID);
		}
	}, [boardId, isCreate]);

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
		if (!isCreate || boardKeyParam) return;
		if (!columns.length) return;
		setParentId((current) =>
			columns.some((column) => column.id === current) ? current : columns[0].id,
		);
	}, [boardKeyParam, columns, isCreate, selectedBoardId]);

	const createTask = useCreateKanbanBoardTask();
	const updateTask = useUpdateKanbanBoardTask();
	const [editBlocked, setEditBlocked] =
		useState<KanbanBoardTaskEditBlockedErrorDto | null>(null);
	const [remoteStale, setRemoteStale] = useState(false);

	const { editLabel, foreignLock, isLockedByOther } = useKanbanTaskEditLock(
		taskId,
		!isCreate,
	);

	useTrackerTaskSync({
		taskRef: !isCreate ? taskKey : undefined,
		enabled: !isCreate && Boolean(task),
		baselineUpdatedAt: task?.updatedAt,
		onRemoteUpdate: useCallback(() => setRemoteStale(true), []),
	});

	useEffect(() => {
		if (isCreate || !task) return;
		setTitle(task.content.title);
		setBacklogNumber(
			task.content.backlogNumber !== undefined
				? String(task.content.backlogNumber)
				: "",
		);
		setPriority(task.content.priority ?? "");
		setAssignees(kanbanBoardTaskAssignees(task.content));
		setCurrentAssignee(task.content.currentAssignee ?? "");
		setTaskType(task.content.taskType ?? "");
		setWorkType(task.content.workType ?? "");
		setEstimatePd(
			task.content.estimatePd !== undefined
				? String(task.content.estimatePd)
				: "",
		);
		setRoleEstimates(task.content.roleEstimates ?? {});
		setDueDate(task.content.dueDate ?? "");
		setParentTask(task.content.parentTask ?? "");
		setCustomer(task.content.customer ?? "");
		setSprintOutcome(task.content.sprintOutcome ?? "");
		setSprintId(task.content.sprintId ?? "");
		setStreamCustomer(task.content.streamCustomer ?? "");
		setDescription(task.content.description ?? "");
		setSubtasks(normalizeKanbanBoardSubtasks(task.content.subtasks) ?? []);
	}, [isCreate, task]);

	useEffect(() => {
		if (!isCreate) return;
		const defaultName = settingsQuery.data?.defaultCurrentUserAssigneeName?.trim();
		if (!defaultName) return;
		setAssignees((prev) => (prev.length ? prev : [defaultName]));
		setCurrentAssignee((prev) => prev || defaultName);
	}, [isCreate, settingsQuery.data?.defaultCurrentUserAssigneeName]);

	useEffect(() => {
		if (!currentAssignee) return;
		if (assignees.includes(currentAssignee)) return;
		if (!assignees.length) {
			setAssignees([currentAssignee]);
			return;
		}
		setCurrentAssignee("");
	}, [assignees, currentAssignee]);

	useEffect(() => {
		const total = kanbanBoardRoleEstimatesTotal(roleEstimates);
		if (total !== undefined) {
			setEstimatePd(String(total));
		}
	}, [roleEstimates]);

	const selectedColumn = columns.find((column) => column.id === parentId);
	const columnColor = selectedColumn?.color ?? "#94a3b8";
	const statusTitle = selectedColumn?.title ?? parentId;

	const buildContent = (): KanbanBoardTaskContent | null => {
		if (!title.trim()) return null;
		const parsedBacklog = backlogNumber.trim()
			? Number(backlogNumber)
			: undefined;
		const parsedEstimate = estimatePd.trim() ? Number(estimatePd) : undefined;
		const assigneeFields = resolveKanbanTaskAssigneeFields(assignees, currentAssignee);
		return normalizeKanbanBoardTaskContent({
			title: title.trim(),
			description: description || undefined,
			backlogNumber:
				parsedBacklog !== undefined && !Number.isNaN(parsedBacklog)
					? parsedBacklog
					: undefined,
			priority: priority
				? (priority as KanbanBoardTaskContent["priority"])
				: undefined,
			...assigneeFields,
			taskType: taskType
				? (taskType as KanbanBoardTaskContent["taskType"])
				: undefined,
			workType: workType
				? (workType as KanbanBoardTaskContent["workType"])
				: undefined,
			roleEstimates: Object.keys(roleEstimates).length
				? roleEstimates
				: undefined,
			estimatePd:
				parsedEstimate !== undefined && !Number.isNaN(parsedEstimate)
					? parsedEstimate
					: undefined,
			dueDate: dueDate.trim() || undefined,
			parentTask: parentTask.trim() || undefined,
			customer: customer.trim() || undefined,
			sprintOutcome: sprintOutcome.trim() || undefined,
			sprintId: sprintId || undefined,
			streamCustomer: streamCustomer.trim() || undefined,
			subtasks: subtasks.length ? subtasks : undefined,
			images: taskImages.length ? taskImages : undefined,
		});
	};

	const handleSave = async (forceOverwrite?: boolean) => {
		const content = buildContent();
		if (!content || !effectiveBoardId) return;

		if (isCreate) {
			const created = await createTask.mutateAsync({
				boardId: effectiveBoardId,
				parentId,
				content,
			});
			navigate(trackerTaskPath(created.taskKey));
			return;
		}

		if (!task) return;
		try {
			await updateTask.mutateAsync({
				id: task.id,
				data: {
					boardId: effectiveBoardId,
					parentId,
					content,
					expectedUpdatedAt: task.updatedAt,
					forceOverwrite,
					lockHolderLabel: editLabel || undefined,
				},
			});
			setRemoteStale(false);
			setEditBlocked(null);
			navigate(
				kanbanBoardPath(
					boardMeta && "boardKey" in boardMeta
						? boardMeta.boardKey
						: task.boardKey,
				),
			);
		} catch (error) {
			const blocked = parseKanbanBoardTaskEditBlockedError(error);
			if (blocked) {
				setEditBlocked(blocked);
				return;
			}
			throw error;
		}
	};

	const isSaving = createTask.isPending || updateTask.isPending;
	const isTaskLoading = !isCreate && taskByRefQuery.isLoading && !task;
	const showForm = isCreate || Boolean(task);
	const showBoardPicker = isCreate && !boardKeyParam && !boardKeyFromQuery;
	const boardSubtitle = boardMeta
		? `${boardMeta.boardKey} · ${"name" in boardMeta ? boardMeta.name : boardMeta.boardName}`
		: boardKey || "Новая задача";
	const saveDisabled =
		!title.trim() ||
		!effectiveBoardId ||
		(!isCreate && taskByRefQuery.isLoading) ||
		isSaving ||
		isLockedByOther;

	if (!isCreate && !taskKey) {
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
				<Flex gap={6} wrap="wrap" alignItems="center">
					<Chip
						size="small"
						label={isCreate ? "Создание" : isTaskLoading ? "Загрузка…" : statusTitle}
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
					{isTaskLoading ? (
						<Flex
							flexDirection="column"
							alignItems="center"
							justifyContent="center"
							flexGrow={1}
							gap={12}
							minHeight="280px"
						>
							<CircularProgress size={36} />
							<Typography variant="body2" color="text.secondary">
								Загрузка задачи {taskKey}…
							</Typography>
						</Flex>
					) : null}
					{!isTaskLoading && !isCreate && taskByRefQuery.isError ? (
						<Alert severity="error">Не удалось загрузить задачу</Alert>
					) : null}
					{!isTaskLoading && !isCreate && taskByRefQuery.isSuccess && !task ? (
						<Alert severity="warning">Задача не найдена</Alert>
					) : null}
					{createTask.isError || updateTask.isError ? (
						<Alert severity="error">
							{apiErrorMessage(createTask.error ?? updateTask.error) ||
								(isCreate
									? "Не удалось создать задачу"
									: "Не удалось сохранить задачу")}
						</Alert>
					) : null}
					{isLockedByOther && foreignLock ? (
						<Alert severity="warning">
							Задача редактируется: {foreignLock.lockedByLabel}
						</Alert>
					) : null}
					{remoteStale ? (
						<Alert
							severity="info"
							action={
								<Button
									color="inherit"
									size="small"
									onClick={() => {
										void taskByRefQuery.refetch().then(() => setRemoteStale(false));
									}}
								>
									Обновить
								</Button>
							}
						>
							Задача изменилась на сервере. Обновите данные перед сохранением.
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
							<Stack direction={{ xs: "column", md: "row" }} spacing={2}>
								<TextField
									label="№ в бэклоге"
									type="number"
									value={backlogNumber}
									onChange={(event) => setBacklogNumber(event.target.value)}
									sx={{ maxWidth: 140 }}
									inputProps={{ min: 0, step: 1 }}
								/>
								<TextField
									label="Заголовок"
									value={title}
									onChange={(event) => setTitle(event.target.value)}
									required
									fullWidth
									autoFocus={isCreate}
								/>
							</Stack>
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
									label="Текущий исполнитель"
									value={currentAssignee}
									options={currentAssigneeOptions}
									onChange={setCurrentAssignee}
									disabled={!currentAssigneeOptions.length}
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
									label="Оценка, чд (итого)"
									type="number"
									value={estimatePd}
									onChange={(event) => setEstimatePd(event.target.value)}
									fullWidth
									inputProps={{ min: 0, step: 0.5 }}
									helperText="Заполняется автоматически из оценок по ролям"
								/>
							</Stack>
							<KanbanRoleEstimatesFields
								value={roleEstimates}
								onChange={setRoleEstimates}
							/>
							<Stack direction={{ xs: "column", md: "row" }} spacing={2}>
								<DatePicker
									label="Срок / плановая дата"
									value={parseDueDate(dueDate)}
									onChange={(value) => setDueDate(formatDueDate(value))}
									slotProps={{
										textField: { fullWidth: true },
										field: { clearable: true },
									}}
								/>
								<FuzzyAutocomplete<ParentTaskOption>
									label="Родительская задача"
									options={parentTaskOptions}
									value={selectedParentTask}
									onChange={(option) => {
										if (!option) {
											setParentTask("");
											return;
										}
										const row = (tasksRegistryQuery.data ?? []).find(
											(item) => item.id === option.id,
										);
										setParentTask(row?.title ?? option.label);
									}}
									getOptionLabel={(option) => option.label}
									getOptionValue={(option) => option.id}
									emptyLabel="— без родителя —"
									searchPlaceholder="Поиск по задачам…"
									noMatchesText="Задачи не найдены"
									placeholder="Выберите родительскую задачу"
									helperText={
										parentTask && !selectedParentTask
											? `Текущее значение не найдено в реестре: ${parentTask}`
											: undefined
									}
									disabled={tasksRegistryQuery.isLoading}
									size="medium"
								/>
								<KanbanTaskSelectField
									label="Заказчик"
									value={customer}
									options={customerOptions}
									onChange={setCustomer}
									fullWidth
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
							<Spacer space={12} />
							<TextField
								label="Ожидаемый результат спринта"
								value={sprintOutcome}
								onChange={(event) => setSprintOutcome(event.target.value)}
								fullWidth
								multiline
								minRows={5}
								placeholder="Релиз, ПСИ, ошибки устранены, готовность к демо…"
							/>
							<Spacer space={12} />

							<KanbanSubtasksChecklist
								items={subtasks}
								onChange={setSubtasks}
								disabled={isSaving}
							/>

							<Spacer space={12} />

							{!isCreate && taskId ? (
								<KanbanTaskImagesSection
									taskId={taskId}
									images={taskImages}
									disabled={isSaving}
								/>
							) : isCreate ? (
								<Alert severity="info">
									Изображения можно прикрепить после создания задачи
								</Alert>
							) : null}

							<Spacer space={12} />

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

							{!isCreate && taskId ? (
								<>
									<Spacer space={12} />
									<KanbanTaskCommentsSection
										taskId={taskId}
										disabled={isSaving}
									/>
								</>
							) : null}
						</Stack>
					) : null}
				</Stack>
			</Card>
			<TrackerTaskConflictDialog
				open={Boolean(editBlocked)}
				error={editBlocked}
				onClose={() => setEditBlocked(null)}
				onRefresh={() => {
					setEditBlocked(null);
					void taskByRefQuery.refetch().then(() => setRemoteStale(false));
				}}
				onForceOverwrite={() => {
					setEditBlocked(null);
					void handleSave(true);
				}}
			/>
		</Flex>
	);
}
