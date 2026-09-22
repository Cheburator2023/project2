import ContentCopyOutlinedIcon from "@mui/icons-material/ContentCopyOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Collapse from "@mui/material/Collapse";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { alpha } from "@mui/material/styles";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import {
	KANBAN_BOARD_PRIORITIES,
	KANBAN_BOARD_HEAP_BOARD_ID,
	KANBAN_BOARD_STANDS,
	KANBAN_BOARD_SYSTEMS,
	KANBAN_BOARD_TASK_DESCRIPTION_MAX_LENGTH,
	KANBAN_BOARD_TASK_TITLE_MAX_LENGTH,
	KANBAN_BOARD_TASK_TYPES,
	KANBAN_BOARD_DEFAULT_TASK_TYPE_ID,
	KANBAN_BOARD_WORK_TYPES,
	kanbanBoardPriorityColor,
	kanbanBoardStandColor,
	kanbanBoardSystemColor,
	kanbanBoardTaskAssignees,
	kanbanBoardTaskStands,
	kanbanBoardTaskSystems,
	kanbanBoardTaskTypeColor,
	kanbanBoardWorkTypeColor,
	kanbanBoardTaskReleaseLabel,
	kanbanBoardTaskContentLengthErrorMessage,
	kanbanBoardTextLengthHint,
	kanbanBoardTaskHasAssigneeHandoff,
	kanbanBoardAssigneeHandoffTitle,
	KANBAN_BOARD_HANDOFF_COLOR,
	normalizeKanbanBoardTaskContent,
	normalizeKanbanBoardSubtasks,
	kanbanBoardRelatedLinksFromContent,
	type KanbanBoardRelatedTaskLink,
	kanbanBoardSubtaskOwnedImageIds,
	kanbanBoardRoleEstimatesTotal,
	type KanbanBoardRoleEstimates,
	type KanbanBoardSubtaskItem,
	type KanbanBoardTaskContent,
	type KanbanBoardTaskRegistryDto,
	parseKanbanBoardTaskEditBlockedError,
	type KanbanBoardTaskEditBlockedErrorDto,
} from "@smart-anketa/api-contract";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	useLocation,
	useNavigate,
	useParams,
	useSearchParams,
} from "react-router";
import { FuzzyAutocomplete } from "@react-client/common/muiCustom/FuzzyAutocomplete";
import { Flex } from "@react-client/common/primitives/Flex";
import { Spacer } from "@react-client/common/primitives/Spacer";
import { Header } from "@react-client/common/navigation/organisms/Header";
import { apiErrorMessage } from "@react-client/common/api/helpers/apiErrorMessage";
import { toast } from "@react-client/common/toasts";
import {
	useCreateKanbanBoardTask,
	useKanbanBoardAssignees,
	useKanbanBoardBoards,
	useKanbanBoardColumns,
	useKanbanBoardCustomers,
	useKanbanBoardSprints,
	useKanbanBoardReleases,
	useKanbanBoardSettings,
	useKanbanBoardStreams,
	useKanbanBoardTaskByRef,
	useKanbanBoardTaskFiles,
	useKanbanBoardTaskImages,
	useKanbanBoardTasksRegistry,
	useUpdateKanbanBoardTask,
	kanbanBoardGetBoardTasks,
} from "@react-client/common/api/queries/kanban-board";
import {
	KanbanTaskMultiSelectField,
	KanbanTaskSelectField,
	type KanbanTaskChipOption,
} from "@react-client/features/kanban-board/components/KanbanTaskSelectField";
import { KanbanRoleEstimatesFields } from "@react-client/features/kanban-board/components/KanbanRoleEstimatesFields";
import { KanbanSubtasksChecklist } from "@react-client/features/kanban-board/components/KanbanSubtasksChecklist";
import { KanbanRelatedTasksPanel } from "@react-client/features/kanban-board/components/KanbanRelatedTasksPanel";
import { KanbanTaskImagesSection } from "@react-client/features/kanban-board/components/KanbanTaskImagesSection";
import { KanbanTaskFilesSection } from "@react-client/features/kanban-board/components/KanbanTaskFilesSection";
import { KanbanTaskActivitySection } from "@react-client/features/kanban-board/components/KanbanTaskActivitySection";
import { KanbanPageStatus } from "@react-client/features/kanban-board/components/KanbanPageStatus";
import {
	KanbanTaskDetailRow,
	KanbanTaskDueLabel,
	KanbanTaskPersonLabel,
	KanbanTaskPriorityBadge,
	KanbanTaskSectionCard,
	KanbanTaskStatusBadge,
	KanbanTaskTimelineRow,
} from "@react-client/features/kanban-board/components/KanbanTaskPageCards";
import {
	isKanbanTaskCreateRoute,
	trackerBoardPathFromReturnState,
	trackerTaskPath,
} from "@react-client/features/kanban-board/kanban-task-paths";
import { normalizeTrackerCode } from "@smart-anketa/api-contract";
import { TrackerMarkdownEditor } from "@react-client/features/kanban-board/components/TrackerMarkdownEditor";
import { KanbanFieldLengthHint } from "@react-client/features/kanban-board/components/KanbanFieldLengthHint";
import { TrackerIdentityRequiredDialog } from "@react-client/features/tracker/components/TrackerIdentityRequiredDialog";
import { TrackerTaskConflictDialog } from "@react-client/features/tracker/components/TrackerTaskConflictDialog";
import { useKanbanTaskEditLock } from "@react-client/features/tracker/hooks/useKanbanTaskEditLock";
import { useTrackerTaskSync } from "@react-client/features/tracker/hooks/useTrackerTaskSync";
import { KANBAN_NEW_TASK_TITLE } from "@react-client/features/kanban-board/useCreateAndOpenKanbanTask";

const PRIORITY_OPTIONS = KANBAN_BOARD_PRIORITIES.map((option) => ({
	value: option.id,
	label: option.title,
	color: kanbanBoardPriorityColor(option.id),
}));

const DEFAULT_COLUMN_ID = "todo";
const BOARD_SELECT_COLOR = "#6366f1";
const ASSIGNEE_SELECT_COLOR = "#2563eb";
const SPRINT_SELECT_COLOR = "#0891b2";
const RELEASE_SELECT_COLOR = "#d97706";
const STREAM_SELECT_COLOR = "#7c3aed";
const CUSTOMER_SELECT_COLOR = "#0d9488";
const AUTOSAVE_DEBOUNCE_MS = 800;

type TaskSaveStatus = "idle" | "dirty" | "saving" | "saved" | "error";

const isValidDate = (value: Date | null | undefined): value is Date =>
	value instanceof Date && !Number.isNaN(value.getTime());

const parseDueDate = (value: string): Date | null => {
	if (!value.trim()) return null;
	const parsed = parseISO(value.trim());
	return isValidDate(parsed) ? parsed : null;
};

const formatDueDate = (value: Date | null): string => {
	if (!isValidDate(value)) return "";
	return format(value, "yyyy-MM-dd");
};

const formatTaskTimeline = (value?: string | null): string => {
	if (!value?.trim()) return "—";
	try {
		return format(parseISO(value), "d MMM yyyy, HH:mm", { locale: ru });
	} catch {
		return value;
	}
};

const formatTaskDueLabel = (value: string): string => {
	const parsed = parseDueDate(value);
	if (!parsed) return value;
	return format(parsed, "d MMM yyyy", { locale: ru });
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
	taskKey?: string;
	onClose?: () => void;
	onOpenTask?: (taskKey: string) => void;
	bindRequestClose?: (requestClose: () => void) => void;
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

export function KanbanTaskPage({
	mode,
	taskKey: taskKeyProp,
	onClose,
	onOpenTask,
	bindRequestClose,
}: Props = {}) {
	const navigate = useNavigate();
	const location = useLocation();
	const queryClient = useQueryClient();
	const [searchParams] = useSearchParams();
	const { boardKey: boardKeyParam = "", taskKey: taskKeyParam = "" } = useParams<{
		boardKey?: string;
		taskKey?: string;
	}>();
	const taskKey = taskKeyProp || taskKeyParam;

	const isCreate = mode === "create" || isKanbanTaskCreateRoute(taskKey ?? "");
	const boardKeyFromQuery = searchParams.get("board") ?? "";
	const boardKey = boardKeyParam || boardKeyFromQuery;

	const taskByRefQuery = useKanbanBoardTaskByRef(
		!isCreate && taskKey ? taskKey : undefined,
	);
	const taskId = taskByRefQuery.data?.id ?? "";
	const taskImagesQuery = useKanbanBoardTaskImages(
		!isCreate ? taskId : undefined,
	);
	const taskFilesQuery = useKanbanBoardTaskFiles(
		!isCreate ? taskId : undefined,
	);
	const boardIdFromTask = taskByRefQuery.data?.boardId ?? "";
	const boardIdFromQuery = searchParams.get("boardId") ?? "";

	const boardsQuery = useKanbanBoardBoards();
	const boardMetaFromKey = boardsQuery.data?.find(
		(item) =>
			item.boardKey === normalizeTrackerCode(boardKey) || item.id === boardKey,
	);
	const boardId =
		boardIdFromTask || boardIdFromQuery || boardMetaFromKey?.id || "";

	const [selectedBoardId, setSelectedBoardId] = useState("");
	const [title, setTitle] = useState("");
	const [backlogNumber, setBacklogNumber] = useState("");
	const [parentId, setParentId] = useState(DEFAULT_COLUMN_ID);
	const [priority, setPriority] = useState("");
	const [assignees, setAssignees] = useState<string[]>([]);
	const [currentAssignee, setCurrentAssignee] = useState("");
	const [taskType, setTaskType] = useState(
		isCreate ? KANBAN_BOARD_DEFAULT_TASK_TYPE_ID : "",
	);
	const [workType, setWorkType] = useState("");
	const [stands, setStands] = useState<string[]>([]);
	const [systems, setSystems] = useState<string[]>([]);
	const [hasBlocker, setHasBlocker] = useState(false);
	const [handoffPending, setHandoffPending] = useState(false);
	const [handoffFrom, setHandoffFrom] = useState("");
	const [estimatePd, setEstimatePd] = useState("");
	const [roleEstimates, setRoleEstimates] = useState<KanbanBoardRoleEstimates>(
		{},
	);
	const [dueDate, setDueDate] = useState("");
	const [parentTask, setParentTask] = useState("");
	const [customer, setCustomer] = useState("");
	const [sprintId, setSprintId] = useState("");
	const [releaseIds, setReleaseIds] = useState<string[]>([]);
	const [streamCustomer, setStreamCustomer] = useState("");
	const [description, setDescription] = useState("");
	const [subtasks, setSubtasks] = useState<KanbanBoardSubtaskItem[]>([]);
	const [relatedLinks, setRelatedLinks] = useState<
		KanbanBoardRelatedTaskLink[]
	>([]);
	const [createdByName, setCreatedByName] = useState("");
	const [pendingCreatedBy, setPendingCreatedBy] = useState<string | null>(null);

	const assigneesQuery = useKanbanBoardAssignees();
	const settingsQuery = useKanbanBoardSettings();
	const sprintsQuery = useKanbanBoardSprints();
	const releasesQuery = useKanbanBoardReleases();
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

	const createdByOptions = useMemo(() => {
		const options = [...assigneeOptions];
		const current = createdByName.trim();
		if (current && !options.some((option) => option.value === current)) {
			options.unshift({
				value: current,
				label: current,
				color: "#7c3aed",
			});
		}
		return options;
	}, [assigneeOptions, createdByName]);

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

	const standOptions = useMemo(() => {
		const options: KanbanTaskChipOption[] = KANBAN_BOARD_STANDS.map(
			(option) => ({
				value: option.id,
				label: option.title,
				color: kanbanBoardStandColor(option.id),
			}),
		);
		if (
			stands.includes("dev") &&
			!options.some((item) => item.value === "dev")
		) {
			options.unshift({
				value: "dev",
				label: "Dev",
				color: kanbanBoardStandColor("dev"),
			});
		}
		return options;
	}, [stands]);

	const systemOptions = useMemo(
		() =>
			KANBAN_BOARD_SYSTEMS.map((option) => ({
				value: option.id,
				label: option.title,
				color: kanbanBoardSystemColor(option.id),
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

	const releaseOptions = useMemo(() => {
		const options = (releasesQuery.data ?? []).map((item) => ({
			value: item.id,
			label: kanbanBoardTaskReleaseLabel(item),
			color: RELEASE_SELECT_COLOR,
		}));
		for (const release of taskByRefQuery.data?.releases ?? []) {
			if (options.some((option) => option.value === release.id)) continue;
			options.push({
				value: release.id,
				label: kanbanBoardTaskReleaseLabel(release),
				color: RELEASE_SELECT_COLOR,
			});
		}
		return options;
	}, [releasesQuery.data, taskByRefQuery.data?.releases]);

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
	const listedImages = taskImagesQuery.isLoading
		? (task?.content.images ?? [])
		: (taskImagesQuery.data ?? []);
	const subtaskImageIds = kanbanBoardSubtaskOwnedImageIds([
		...(task?.content.subtasks ?? []),
		...subtasks,
	]);
	const taskImages = listedImages.filter(
		(image) => !subtaskImageIds.has(image.id),
	);
	const taskFiles = taskFilesQuery.isLoading
		? (task?.content.files ?? [])
		: (taskFilesQuery.data ?? []);

	useEffect(() => {
		if (isCreate) return;
		const actual = taskByRefQuery.data?.taskKey?.trim();
		if (!actual || !taskKey) return;
		if (normalizeTrackerCode(actual) === normalizeTrackerCode(taskKey)) return;
		if (onOpenTask) {
			onOpenTask(actual);
			return;
		}
		navigate(trackerTaskPath(actual), { replace: true, state: location.state });
	}, [
		isCreate,
		location.state,
		navigate,
		onOpenTask,
		taskByRefQuery.data?.taskKey,
		taskKey,
	]);

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
		if (!task) return;
		if (
			saveStatusRef.current === "dirty" ||
			saveStatusRef.current === "saving"
		) {
			return;
		}
		setParentId(
			columns.some((column) => column.id === task.parentId)
				? task.parentId
				: columns[0].id,
		);
	}, [
		columns,
		isCreate,
		searchParams,
		task?.id,
		task?.parentId,
		task?.updatedAt,
	]);

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
	const [showMoreDetails, setShowMoreDetails] = useState(false);
	const [saveStatus, setSaveStatus] = useState<TaskSaveStatus>("idle");
	const lastSavedKeyRef = useRef<string | null>(null);
	const pendingDraftKeyRef = useRef<string | null>(null);
	const expectedUpdatedAtRef = useRef<string | null>(null);
	const saveStatusRef = useRef<TaskSaveStatus>("idle");
	const autosaveTimerRef = useRef<number | null>(null);
	const savingRef = useRef(false);
	saveStatusRef.current = saveStatus;

	const leaveTaskPath = useMemo(() => {
		const key = boardApiRef?.trim();
		if (key) return trackerBoardPathFromReturnState(key, location.state);
		return "/tracker";
	}, [boardApiRef, location.state]);

	const closeOrLeave = useCallback(() => {
		if (onClose) {
			onClose();
			return;
		}
		navigate(leaveTaskPath);
	}, [leaveTaskPath, navigate, onClose]);

	const handleIdleTimeout = useCallback(() => {
		closeOrLeave();
	}, [closeOrLeave]);

	const { editLabel, foreignLock, isLockedByOther } = useKanbanTaskEditLock(
		taskId,
		!isCreate,
		{ onIdleTimeout: handleIdleTimeout },
	);

	useTrackerTaskSync({
		taskId: !isCreate ? taskId : undefined,
		taskRef: !isCreate ? taskKey : undefined,
		enabled: !isCreate && Boolean(task),
		baselineUpdatedAt: task?.updatedAt,
		isLocalBusy: useCallback(
			() =>
				saveStatusRef.current === "dirty" || saveStatusRef.current === "saving",
			[],
		),
		onRemoteStale: useCallback(() => setRemoteStale(true), []),
		onRemoteApplied: useCallback(() => setRemoteStale(false), []),
	});

	useEffect(() => {
		if (isCreate || !task) return;
		if (
			saveStatusRef.current === "dirty" ||
			saveStatusRef.current === "saving"
		) {
			return;
		}
		// Свой автосейв уже обновил expectedUpdatedAt — не перетираем controlled-поля
		// (иначе MDEditor/textarea теряют курсор и «прыгают» по тексту).
		if (expectedUpdatedAtRef.current === task.updatedAt) {
			return;
		}
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
		setStands(kanbanBoardTaskStands(task.content));
		setSystems(kanbanBoardTaskSystems(task.content));
		setHasBlocker(task.content.hasBlocker === true);
		setHandoffPending(kanbanBoardTaskHasAssigneeHandoff(task.content));
		setHandoffFrom(task.content.assigneeHandoffFrom ?? "");
		setEstimatePd(
			task.content.estimatePd !== undefined
				? String(task.content.estimatePd)
				: "",
		);
		setRoleEstimates(task.content.roleEstimates ?? {});
		setDueDate(task.content.dueDate ?? "");
		setParentTask(task.content.parentTask ?? "");
		setCustomer(task.content.customer ?? "");
		setSprintId(task.content.sprintId ?? "");
		setReleaseIds((task.releases ?? []).map((item) => item.id));
		setStreamCustomer(task.content.streamCustomer ?? "");
		setDescription(task.content.description ?? "");
		setSubtasks(normalizeKanbanBoardSubtasks(task.content.subtasks) ?? []);
		setRelatedLinks(kanbanBoardRelatedLinksFromContent(task.content));
		setCreatedByName(task.createdBy ?? "");
		expectedUpdatedAtRef.current = task.updatedAt;
		lastSavedKeyRef.current = null;
		if (saveStatusRef.current !== "saved") {
			setSaveStatus("idle");
		}
	}, [isCreate, task?.id, task?.updatedAt]);

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
		const assigneeFields = resolveKanbanTaskAssigneeFields(
			assignees,
			currentAssignee,
		);
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
			stands: stands as KanbanBoardTaskContent["stands"],
			stand: undefined,
			systems: systems as KanbanBoardTaskContent["systems"],
			system: undefined,
			hasBlocker,
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
			sprintId: sprintId || undefined,
			streamCustomer: streamCustomer.trim() || undefined,
			subtasks: subtasks.length ? subtasks : undefined,
			relatedLinks,
			images: taskImages.length ? taskImages : undefined,
			files: taskFiles.length ? taskFiles : undefined,
		});
	};

	const draftKey = useMemo(
		() =>
			JSON.stringify({
				boardId: effectiveBoardId,
				parentId,
				title,
				description,
				backlogNumber,
				priority,
				assignees,
				currentAssignee,
				createdByName,
				taskType,
				workType,
				stands,
				systems,
				hasBlocker,
				estimatePd,
				roleEstimates,
				dueDate,
				parentTask,
				customer,
				sprintId,
				releaseIds,
				streamCustomer,
				subtasks,
				relatedLinks,
			}),
		[
			effectiveBoardId,
			parentId,
			title,
			description,
			backlogNumber,
			priority,
			assignees,
			currentAssignee,
			createdByName,
			taskType,
			workType,
			stands,
			systems,
			hasBlocker,
			estimatePd,
			roleEstimates,
			dueDate,
			parentTask,
			customer,
			sprintId,
			releaseIds,
			streamCustomer,
			subtasks,
			relatedLinks,
		],
	);

	const handleSave = async (
		forceOverwrite?: boolean,
		options?: { pickup?: boolean },
	) => {
		const content = buildContent();
		if (!content || !effectiveBoardId) return;
		if (options?.pickup) {
			content.assigneeHandoffPending = false;
		}
		if (kanbanBoardTaskContentLengthErrorMessage(content)) {
			if (!isCreate) setSaveStatus("error");
			return;
		}

		if (isCreate) {
			const created = await createTask.mutateAsync({
				boardId: effectiveBoardId,
				parentId,
				content,
				createdBy: createdByName.trim() || null,
				releaseIds,
			});
			if (onOpenTask) {
				onOpenTask(created.taskKey);
				return;
			}
			navigate(trackerTaskPath(created.taskKey));
			return;
		}

		if (!task || savingRef.current) return;
		const keyBeingSaved = draftKey;
		const expectedUpdatedAt = expectedUpdatedAtRef.current ?? task.updatedAt;
		savingRef.current = true;
		setSaveStatus("saving");
		try {
			const updated = await updateTask.mutateAsync({
				id: task.id,
				data: {
					boardId: effectiveBoardId,
					parentId,
					content,
					createdBy: createdByName.trim() || null,
					expectedUpdatedAt,
					forceOverwrite,
					lockHolderLabel: editLabel || undefined,
					releaseIds,
				},
			});
			expectedUpdatedAtRef.current = updated.updatedAt;
			lastSavedKeyRef.current = keyBeingSaved;
			setHandoffPending(kanbanBoardTaskHasAssigneeHandoff(updated.content));
			setHandoffFrom(updated.content.assigneeHandoffFrom ?? "");
			setRemoteStale(false);
			setEditBlocked(null);
			const stillDirty = pendingDraftKeyRef.current !== keyBeingSaved;
			setSaveStatus(stillDirty ? "dirty" : "saved");
			if (stillDirty) {
				window.setTimeout(() => {
					void handleSaveRef.current();
				}, 0);
			}
		} catch (error) {
			const blocked = parseKanbanBoardTaskEditBlockedError(error);
			if (blocked) {
				setEditBlocked(blocked);
				setSaveStatus("dirty");
				return;
			}
			setSaveStatus("error");
		} finally {
			savingRef.current = false;
		}
	};
	const handleSaveRef = useRef(handleSave);
	handleSaveRef.current = handleSave;

	const goBackToBoard = useCallback(async () => {
		if (autosaveTimerRef.current != null) {
			window.clearTimeout(autosaveTimerRef.current);
			autosaveTimerRef.current = null;
		}
		if (
			!isCreate &&
			(saveStatusRef.current === "dirty" || saveStatusRef.current === "saving")
		) {
			await handleSaveRef.current();
		}
		const key = boardApiRef?.trim();
		if (key) {
			try {
				await queryClient.fetchQuery({
					queryKey: ["kanbanBoardTasks", key],
					queryFn: ({ signal }) => kanbanBoardGetBoardTasks(key, signal),
				});
			} catch {
				await queryClient.invalidateQueries({
					queryKey: ["kanbanBoardTasks", key],
				});
			}
		}
		closeOrLeave();
	}, [boardApiRef, closeOrLeave, isCreate, queryClient]);

	useEffect(() => {
		bindRequestClose?.(() => {
			void goBackToBoard();
		});
	}, [bindRequestClose, goBackToBoard]);

	useEffect(() => {
		if (isCreate || !task) return;
		if (!title.trim() || !effectiveBoardId) return;
		if (isLockedByOther || remoteStale || editBlocked) return;

		pendingDraftKeyRef.current = draftKey;

		if (lastSavedKeyRef.current === null) {
			lastSavedKeyRef.current = draftKey;
			return;
		}
		if (draftKey === lastSavedKeyRef.current) {
			return;
		}

		if (
			kanbanBoardTaskContentLengthErrorMessage({
				title,
				description,
				subtasks,
			})
		) {
			if (autosaveTimerRef.current != null) {
				window.clearTimeout(autosaveTimerRef.current);
				autosaveTimerRef.current = null;
			}
			setSaveStatus("error");
			return;
		}

		setSaveStatus("dirty");
		if (autosaveTimerRef.current != null) {
			window.clearTimeout(autosaveTimerRef.current);
		}
		autosaveTimerRef.current = window.setTimeout(() => {
			autosaveTimerRef.current = null;
			void handleSaveRef.current();
		}, AUTOSAVE_DEBOUNCE_MS);

		return () => {
			if (autosaveTimerRef.current != null) {
				window.clearTimeout(autosaveTimerRef.current);
				autosaveTimerRef.current = null;
			}
		};
	}, [
		draftKey,
		editBlocked,
		effectiveBoardId,
		isCreate,
		isLockedByOther,
		remoteStale,
		subtasks,
		task,
		title,
		description,
	]);

	const formLocked = isLockedByOther || createTask.isPending;
	const isTaskLoading =
		!isCreate &&
		Boolean(taskKey) &&
		!task &&
		(taskByRefQuery.isLoading || taskByRefQuery.isFetching);
	const isBootstrapLoading =
		boardsQuery.isLoading ||
		(isCreate && columnsQuery.isLoading && !columns.length);
	const isPageLoading = isTaskLoading || isBootstrapLoading;
	const showForm = !isPageLoading && (isCreate || Boolean(task));
	const showBoardPicker = isCreate && !boardKeyParam && !boardKeyFromQuery;
	const boardSubtitle = boardMeta
		? `${boardMeta.boardKey} · ${"name" in boardMeta ? boardMeta.name : boardMeta.boardName}`
		: boardKey || "Новая задача";
	const contentLengthError = useMemo(
		() =>
			kanbanBoardTaskContentLengthErrorMessage({
				title,
				description,
				subtasks,
			}),
		[description, subtasks, title],
	);
	const titleHint = kanbanBoardTextLengthHint(
		title.length,
		KANBAN_BOARD_TASK_TITLE_MAX_LENGTH,
	);

	useEffect(() => {
		const id = "kanban-task-content-length";
		if (!showForm || !contentLengthError) {
			toast.dismiss(id);
			return;
		}
		toast.error(
			`${contentLengthError}. Сохранение заблокировано, пока текст не уложится в лимит.`,
			{ id, duration: Number.POSITIVE_INFINITY },
		);
		return () => {
			toast.dismiss(id);
		};
	}, [contentLengthError, showForm]);

	useEffect(() => {
		const id = "kanban-task-handoff";
		if (!showForm || isCreate || !handoffPending) {
			toast.dismiss(id);
			return;
		}
		toast.warning(
			kanbanBoardAssigneeHandoffTitle({
				currentAssignee,
				assigneeHandoffFrom: handoffFrom || undefined,
			}),
			{
				id,
				duration: Number.POSITIVE_INFINITY,
				action: formLocked
					? undefined
					: {
							label: "Взял в работу",
							onClick: () => {
								void handleSaveRef.current(undefined, { pickup: true });
							},
						},
			},
		);
		return () => {
			toast.dismiss(id);
		};
	}, [
		currentAssignee,
		formLocked,
		handoffFrom,
		handoffPending,
		isCreate,
		showForm,
	]);

	useEffect(() => {
		const id = "kanban-task-save-error";
		const failed = createTask.isError || updateTask.isError;
		if (!showForm || !failed) {
			toast.dismiss(id);
			return;
		}
		toast.error(
			apiErrorMessage(createTask.error ?? updateTask.error) ||
				(isCreate
					? "Не удалось создать задачу"
					: "Не удалось сохранить задачу"),
			{ id, duration: Number.POSITIVE_INFINITY },
		);
		return () => {
			toast.dismiss(id);
		};
	}, [
		createTask.error,
		createTask.isError,
		isCreate,
		showForm,
		updateTask.error,
		updateTask.isError,
	]);

	useEffect(() => {
		const id = "kanban-task-foreign-lock";
		if (!showForm || !isLockedByOther || !foreignLock) {
			toast.dismiss(id);
			return;
		}
		toast.warning(
			`Задача сейчас редактируется: ${foreignLock.lockedByLabel}. Поля заблокированы до освобождения.`,
			{ id, duration: Number.POSITIVE_INFINITY },
		);
		return () => {
			toast.dismiss(id);
		};
	}, [foreignLock, isLockedByOther, showForm]);

	useEffect(() => {
		const id = "kanban-task-remote-stale";
		if (!showForm || !remoteStale) {
			toast.dismiss(id);
			return;
		}
		toast.info(
			"На сервере есть более новая версия, а у вас есть несохранённые изменения. Обновите данные (локальные правки будут потеряны) или досохраните и разрешите конфликт.",
			{
				id,
				duration: Number.POSITIVE_INFINITY,
				action: {
					label: "Обновить",
					onClick: () => {
						void taskByRefQuery
							.refetch()
							.then(() => setRemoteStale(false));
					},
				},
			},
		);
		return () => {
			toast.dismiss(id);
		};
	}, [remoteStale, showForm, taskByRefQuery.refetch]);
	const createDisabled =
		!title.trim() ||
		!effectiveBoardId ||
		createTask.isPending ||
		isLockedByOther ||
		Boolean(contentLengthError);

	const saveStatusLabel = contentLengthError
		? "Сохранение заблокировано: сократите текст"
		: saveStatus === "saving"
			? "Сохранение…"
			: saveStatus === "saved"
				? "Сохранено"
				: saveStatus === "dirty"
					? "Есть изменения…"
					: saveStatus === "error"
						? "Ошибка сохранения"
						: null;

	const pageStatus =
		!isCreate && !taskKey
			? ("missing-key" as const)
			: isPageLoading
				? ("loading" as const)
				: !isCreate && taskByRefQuery.isError
					? ("load-error" as const)
					: !isCreate && taskByRefQuery.isSuccess && !task
						? ("not-found" as const)
						: null;

	return (
		<Flex
			flexDirection="column"
			flexGrow={1}
			minHeight="0"
			sx={{ height: "100%" }}
			data-test-id="kanban-task-page"
		>
			<Header
				title={isCreate ? KANBAN_NEW_TASK_TITLE : taskKey || "Задача"}
				backTo={leaveTaskPath}
				onBack={() => void goBackToBoard()}
				leadingAccessory={
					<Typography variant="body2" color="text.secondary" noWrap>
						{boardSubtitle}
					</Typography>
				}
			>
				<Flex gap={6} wrap="wrap" alignItems="center">
					<Chip
						size="small"
						label={
							isCreate ? "Создание" : isPageLoading ? "Загрузка…" : statusTitle
						}
						sx={{
							bgcolor: alpha(columnColor, 0.14),
							color: columnColor,
							border: `1px solid ${alpha(columnColor, 0.35)}`,
						}}
					/>
					<Button
						size="small"
						variant={hasBlocker ? "contained" : "outlined"}
						color="error"
						disabled={formLocked}
						onClick={() => setHasBlocker((value) => !value)}
						title={
							hasBlocker
								? "На задаче есть блокер. Нажмите, чтобы снять."
								: "Отметить, что на задаче есть блокер"
						}
					>
						{hasBlocker ? "Блокер" : "Есть блокер"}
					</Button>
					{!isCreate && handoffPending ? (
						<Button
							size="small"
							variant="contained"
							color="warning"
							disabled={formLocked}
							onClick={() => void handleSave(undefined, { pickup: true })}
							title={kanbanBoardAssigneeHandoffTitle({
								currentAssignee,
								assigneeHandoffFrom: handoffFrom || undefined,
							})}
						>
							Взял в работу
						</Button>
					) : null}
					<Spacer />
					{!isCreate && isLockedByOther && foreignLock ? (
						<Chip
							size="small"
							color="warning"
							variant="outlined"
							label={`Редактирует: ${foreignLock.lockedByLabel}`}
							title={`Задача сейчас редактируется пользователем ${foreignLock.lockedByLabel}. Поля заблокированы.`}
						/>
					) : null}
					{!isCreate && (saveStatusLabel || contentLengthError) ? (
						<Flex alignItems="center" gap={6}>
							{saveStatus === "saving" ? (
								<CircularProgress size={14} thickness={5} />
							) : null}
							<Typography
								variant="caption"
								color={
									contentLengthError || saveStatus === "error"
										? "error"
										: saveStatus === "saved"
											? "success.main"
											: "text.secondary"
								}
								sx={{ fontWeight: 600, whiteSpace: "nowrap" }}
							>
								{saveStatusLabel}
							</Typography>
						</Flex>
					) : null}
					{isCreate ? (
						<Button
							variant="contained"
							size="small"
							onClick={() => void handleSave()}
							disabled={createDisabled}
							title={
								contentLengthError
									? contentLengthError
									: !title.trim()
										? "Укажите заголовок"
										: undefined
							}
						>
							Создать
						</Button>
					) : null}
				</Flex>
			</Header>

			<Flex
				flexDirection="column"
				flexGrow={1}
				minHeight="0"
				height="100%"
				gap={12}
				sx={{
					overflow: "auto",
				}}
			>
				{pageStatus === "loading" ? (
					<KanbanPageStatus
						loading
						title={isTaskLoading ? `Загрузка задачи ${taskKey}…` : "Загрузка…"}
						description={
							isTaskLoading
								? "Подтягиваем карточку и связанные данные"
								: "Подготавливаем форму задачи"
						}
					/>
				) : null}
				{pageStatus === "missing-key" ? (
					<KanbanPageStatus
						title="Не указана задача"
						description="Откройте задачу из доски или реестра трекера."
					/>
				) : null}
				{pageStatus === "load-error" ? (
					<KanbanPageStatus
						title="Не удалось загрузить задачу"
						description={
							apiErrorMessage(taskByRefQuery.error) ||
							"Проверьте соединение и попробуйте ещё раз."
						}
						action={
							<Button
								variant="outlined"
								size="small"
								onClick={() => void taskByRefQuery.refetch()}
							>
								Повторить
							</Button>
						}
					/>
				) : null}
				{pageStatus === "not-found" ? (
					<KanbanPageStatus
						title="Задача не найдена"
						description={`Задача ${taskKey} отсутствует или недоступна.`}
					/>
				) : null}
				{showForm ? (
					<Flex
						flexGrow={1}
						gap={16}
						sx={{
							flexDirection: { xs: "column", lg: "row" },
							alignItems: "flex-start",
						}}
					>
						<Flex
							flexDirection="column"
							flexGrow={1}
							minWidth="0"
							gap={12}
							sx={{ pr: { lg: 0.5 } }}
						>
							<KanbanTaskSectionCard>
								<Flex gap={8} wrap="wrap" alignItems="center" sx={{ mb: 1.5 }}>
									{priority ? (
										<KanbanTaskPriorityBadge priority={priority} />
									) : null}
									<KanbanTaskStatusBadge
										title={isCreate ? "Новая" : statusTitle}
										color={columnColor}
									/>
									{handoffPending ? (
										<Chip
											size="small"
											label="Передано"
											title={kanbanBoardAssigneeHandoffTitle({
												currentAssignee,
												assigneeHandoffFrom: handoffFrom || undefined,
											})}
											sx={{
												bgcolor: alpha(KANBAN_BOARD_HANDOFF_COLOR, 0.12),
												color: KANBAN_BOARD_HANDOFF_COLOR,
												fontWeight: 700,
											}}
										/>
									) : null}
									{taskType ? (
										<Chip
											size="small"
											label={
												taskTypeOptions.find((o) => o.value === taskType)
													?.label ?? taskType
											}
											sx={{
												bgcolor: alpha(
													kanbanBoardTaskTypeColor(taskType),
													0.12,
												),
												color: kanbanBoardTaskTypeColor(taskType),
												fontWeight: 700,
											}}
										/>
									) : null}
								</Flex>
								<Flex
									alignItems="flex-start"
									gap={12}
									wrap="wrap"
									sx={{ mb: 2 }}
								>
									<TextField
										value={title}
										onChange={(event) => setTitle(event.target.value)}
										required
										fullWidth
										autoFocus={
											isCreate ||
											title === KANBAN_NEW_TASK_TITLE ||
											!title.trim()
										}
										placeholder="Заголовок задачи"
										disabled={formLocked}
										error={titleHint.over}
										helperText={titleHint.text}
										title={`Заголовок: до ${KANBAN_BOARD_TASK_TITLE_MAX_LENGTH} символов`}
										inputProps={{
											maxLength: KANBAN_BOARD_TASK_TITLE_MAX_LENGTH,
										}}
										FormHelperTextProps={{
											sx: titleHint.near
												? { color: "warning.main" }
												: undefined,
										}}
										sx={{ flex: 1, minWidth: 220 }}
									/>
									<Box sx={{ width: { xs: "100%", sm: 200 }, flexShrink: 0 }}>
										<KanbanTaskSelectField
											value={taskType}
											options={taskTypeOptions}
											onChange={setTaskType}
											emptyLabel="Тип задачи"
											fullWidth
											disabled={formLocked}
										/>
									</Box>
								</Flex>
								<Flex
									alignItems="center"
									justifyContent="space-between"
									gap={8}
									sx={{ mb: 1 }}
								>
									<Typography variant="subtitle2" fontWeight={700}>
										Описание
									</Typography>
									<Flex alignItems="center" gap={8}>
										<KanbanFieldLengthHint
											length={description.length}
											max={KANBAN_BOARD_TASK_DESCRIPTION_MAX_LENGTH}
										/>
										<IconButton
											size="small"
											disabled={!description.trim()}
											onClick={() => {
												void navigator.clipboard.writeText(description);
											}}
											aria-label="Копировать описание"
											title="Копировать текст"
										>
											<ContentCopyOutlinedIcon fontSize="small" />
										</IconButton>
									</Flex>
								</Flex>
								<TrackerMarkdownEditor
									value={description}
									onChange={setDescription}
									disabled={formLocked}
									maxLength={KANBAN_BOARD_TASK_DESCRIPTION_MAX_LENGTH}
								/>
							</KanbanTaskSectionCard>

							<KanbanTaskSectionCard>
								<KanbanSubtasksChecklist
									items={subtasks}
									onChange={setSubtasks}
									taskId={!isCreate && taskId ? taskId : undefined}
									disabled={formLocked}
								/>
							</KanbanTaskSectionCard>

							<KanbanTaskSectionCard>
								<KanbanRelatedTasksPanel
									relatedLinks={relatedLinks}
									onChange={setRelatedLinks}
									tasks={tasksRegistryQuery.data ?? []}
									currentTaskId={taskId || undefined}
									disabled={formLocked}
									loading={tasksRegistryQuery.isLoading}
								/>
							</KanbanTaskSectionCard>

							{!isCreate && taskId ? (
								<KanbanTaskSectionCard>
									<KanbanTaskActivitySection
										taskId={taskId}
										disabled={formLocked}
									/>
								</KanbanTaskSectionCard>
							) : null}
						</Flex>

						<Flex
							flexDirection="column"
							gap={12}
							sx={{
								width: { xs: "100%", lg: 340 },
								flexShrink: 0,
								boxSizing: "border-box",
							}}
						>
							{!isCreate && task ? (
								<KanbanTaskSectionCard title="Таймлайн">
									<KanbanTaskTimelineRow
										label="Создано"
										value={formatTaskTimeline(task.createdAt)}
									/>
									<KanbanTaskTimelineRow
										label="Обновлено"
										value={formatTaskTimeline(task.updatedAt)}
									/>
								</KanbanTaskSectionCard>
							) : null}

							<KanbanTaskSectionCard title="Детали">
								<KanbanTaskDetailRow label="Статус">
									<Box sx={{ textAlign: "left" }}>
										<KanbanTaskSelectField
											label=""
											value={parentId}
											options={columnOptions}
											onChange={setParentId}
											disabled={
												formLocked || columnsQuery.isLoading || !columns.length
											}
											fullWidth
										/>
									</Box>
								</KanbanTaskDetailRow>
								<KanbanTaskDetailRow label="Приоритет">
									<Box sx={{ textAlign: "left" }}>
										<KanbanTaskSelectField
											label=""
											value={priority}
											options={PRIORITY_OPTIONS.map((option) => ({
												value: option.value,
												label: option.label,
												color: option.color,
											}))}
											onChange={setPriority}
											fullWidth
											disabled={formLocked}
										/>
									</Box>
								</KanbanTaskDetailRow>
								<KanbanTaskDetailRow label="Стенд">
									<Box sx={{ textAlign: "left" }}>
										<KanbanTaskMultiSelectField
											label=""
											value={stands}
											options={standOptions}
											onChange={setStands}
											fullWidth
											disabled={formLocked}
											emptyLabel="— не выбран —"
										/>
									</Box>
								</KanbanTaskDetailRow>
								<KanbanTaskDetailRow label="Система / приложение">
									<Box sx={{ textAlign: "left" }}>
										<KanbanTaskMultiSelectField
											label=""
											value={systems}
											options={systemOptions}
											onChange={setSystems}
											fullWidth
											disabled={formLocked}
											emptyLabel="— не выбрана —"
										/>
									</Box>
								</KanbanTaskDetailRow>
								<KanbanTaskDetailRow label="Исполнитель">
									{currentAssignee ? (
										<KanbanTaskPersonLabel
											name={currentAssignee}
											color={ASSIGNEE_SELECT_COLOR}
										/>
									) : (
										<Typography variant="body2" color="text.secondary">
											—
										</Typography>
									)}
								</KanbanTaskDetailRow>
								<Box sx={{ textAlign: "left", mt: 0.5 }}>
									<KanbanTaskSelectField
										label="Текущий исполнитель"
										value={currentAssignee}
										options={currentAssigneeOptions}
										onChange={setCurrentAssignee}
										disabled={formLocked || !currentAssigneeOptions.length}
										fullWidth
									/>
								</Box>
								<Box sx={{ textAlign: "left", mt: 1 }}>
									<KanbanTaskMultiSelectField
										label="Исполнители"
										value={assignees}
										options={assigneeOptions}
										onChange={setAssignees}
										fullWidth
										disabled={formLocked}
									/>
								</Box>
								<KanbanTaskDetailRow label="Назначил">
									{createdByName ? (
										<KanbanTaskPersonLabel
											name={createdByName}
											color="#7c3aed"
										/>
									) : (
										<Typography variant="body2" color="text.secondary">
											—
										</Typography>
									)}
								</KanbanTaskDetailRow>
								<Box sx={{ textAlign: "left", mt: 0.5 }}>
									<KanbanTaskSelectField
										label=""
										value={createdByName}
										options={createdByOptions}
										onChange={(next) => {
											if (next === createdByName) return;
											if (isCreate) {
												setCreatedByName(next);
												return;
											}
											setPendingCreatedBy(next);
										}}
										disabled={formLocked || assigneesQuery.isLoading}
										fullWidth
										emptyLabel="— не указан —"
									/>
								</Box>
								<KanbanTaskDetailRow label="Срок">
									{dueDate ? (
										<KanbanTaskDueLabel value={formatTaskDueLabel(dueDate)} />
									) : (
										<Typography variant="body2" color="text.secondary">
											—
										</Typography>
									)}
								</KanbanTaskDetailRow>
								<Box sx={{ textAlign: "left", mt: 0.5 }}>
									<DatePicker
										label="Срок"
										value={parseDueDate(dueDate)}
										onChange={(value) => setDueDate(formatDueDate(value))}
										disabled={formLocked}
										slotProps={{
											textField: {
												fullWidth: true,
												size: "small",
												disabled: formLocked,
											},
											field: { clearable: !formLocked },
										}}
									/>
								</Box>
								<KanbanTaskDetailRow label="Оценка">
									<Typography variant="body2" fontWeight={600}>
										{estimatePd.trim() ? `${estimatePd} чд` : "—"}
									</Typography>
								</KanbanTaskDetailRow>
								{(taskType || workType || stands.length > 0) && (
									<KanbanTaskDetailRow label="Метки">
										<Flex gap={4} wrap="wrap" justifyContent="flex-end">
											{taskType ? (
												<Chip
													size="small"
													label={
														taskTypeOptions.find((o) => o.value === taskType)
															?.label ?? taskType
													}
													sx={{
														bgcolor: alpha(
															kanbanBoardTaskTypeColor(taskType),
															0.12,
														),
														color: kanbanBoardTaskTypeColor(taskType),
													}}
												/>
											) : null}
											{workType ? (
												<Chip
													size="small"
													label={
														workTypeOptions.find((o) => o.value === workType)
															?.label ?? workType
													}
													sx={{
														bgcolor: alpha(
															kanbanBoardWorkTypeColor(workType),
															0.12,
														),
														color: kanbanBoardWorkTypeColor(workType),
													}}
												/>
											) : null}
											{stands.map((standId) => (
												<Chip
													key={standId}
													size="small"
													label={
														standOptions.find((o) => o.value === standId)
															?.label ?? standId
													}
													sx={{
														bgcolor: alpha(
															kanbanBoardStandColor(standId),
															0.12,
														),
														color: kanbanBoardStandColor(standId),
													}}
												/>
											))}
										</Flex>
									</KanbanTaskDetailRow>
								)}

								<Button
									size="small"
									onClick={() => setShowMoreDetails((v) => !v)}
									sx={{ mt: 1, alignSelf: "flex-start" }}
								>
									{showMoreDetails ? "Скрыть поля" : "Ещё поля"}
								</Button>
								<Collapse in={showMoreDetails}>
									<Flex flexDirection="column" gap={10} sx={{ pt: 1 }}>
										{showBoardPicker ? (
											<KanbanTaskSelectField
												label="Доска"
												value={selectedBoardId}
												options={boardOptions}
												onChange={setSelectedBoardId}
												required
												fullWidth
												disabled={formLocked}
											/>
										) : null}
										<TextField
											label="№ в бэклоге"
											type="number"
											value={backlogNumber}
											onChange={(event) => setBacklogNumber(event.target.value)}
											fullWidth
											size="small"
											disabled={formLocked}
											inputProps={{ min: 0, step: 1 }}
										/>
										<KanbanTaskSelectField
											label="Тип работ"
											value={workType}
											options={workTypeOptions}
											onChange={setWorkType}
											fullWidth
											disabled={formLocked}
										/>
										<TextField
											label="Оценка, чд (итого)"
											type="number"
											value={estimatePd}
											onChange={(event) => setEstimatePd(event.target.value)}
											fullWidth
											size="small"
											disabled={formLocked}
											inputProps={{ min: 0, step: 0.5 }}
											helperText="Из оценок по ролям"
										/>
										<KanbanRoleEstimatesFields
											value={roleEstimates}
											onChange={setRoleEstimates}
											disabled={formLocked}
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
													? `Не найдено в реестре: ${parentTask}`
													: undefined
											}
											disabled={formLocked || tasksRegistryQuery.isLoading}
											size="small"
										/>
										<KanbanTaskSelectField
											label="Заказчик"
											value={customer}
											options={customerOptions}
											onChange={setCustomer}
											fullWidth
											disabled={formLocked}
										/>
										<KanbanTaskSelectField
											label="Спринт"
											value={sprintId}
											options={sprintOptions}
											onChange={setSprintId}
											fullWidth
											disabled={formLocked}
										/>
										<KanbanTaskMultiSelectField
											label="Релиз"
											value={releaseIds}
											options={releaseOptions}
											onChange={setReleaseIds}
											fullWidth
											disabled={formLocked || releasesQuery.isLoading}
										/>
										<KanbanTaskSelectField
											label="Стрим-заказчик"
											value={streamCustomer}
											options={streamOptions}
											onChange={setStreamCustomer}
											fullWidth
											disabled={formLocked}
										/>
									</Flex>
								</Collapse>
							</KanbanTaskSectionCard>

							<KanbanTaskSectionCard title="Вложения">
								{!isCreate && taskId ? (
									<Flex flexDirection="column" gap={16}>
										<KanbanTaskImagesSection
											taskId={taskId}
											images={taskImages}
											disabled={formLocked}
										/>
										<KanbanTaskFilesSection
											taskId={taskId}
											files={taskFiles}
											disabled={formLocked}
										/>
									</Flex>
								) : (
									<Alert severity="info">
										Изображения и документы можно прикрепить после создания
										задачи
									</Alert>
								)}
							</KanbanTaskSectionCard>
						</Flex>
					</Flex>
				) : null}
			</Flex>
			<TrackerIdentityRequiredDialog
				open={isCreate && !settingsQuery.isLoading && !editLabel.trim()}
				onCancel={() => closeOrLeave()}
				onSaved={() => undefined}
			/>
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
			<Dialog
				open={pendingCreatedBy !== null}
				onClose={() => setPendingCreatedBy(null)}
				maxWidth="xs"
				fullWidth
			>
				<DialogTitle>Сменить назначившего?</DialogTitle>
				<DialogContent>
					<Alert severity="warning" sx={{ mb: 2 }}>
						Поле «Назначил» по умолчанию пустое. Смена изменит отображение
						автора в карточке и на доске.
					</Alert>
					<DialogContentText component="div">
						<Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
							Сейчас: <strong>{createdByName.trim() || "не указан"}</strong>
						</Typography>
						<Typography variant="body2" color="text.secondary">
							Будет: <strong>{pendingCreatedBy?.trim() || "не указан"}</strong>
						</Typography>
					</DialogContentText>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setPendingCreatedBy(null)}>Отмена</Button>
					<Button
						variant="contained"
						color="warning"
						onClick={() => {
							if (pendingCreatedBy === null) return;
							setCreatedByName(pendingCreatedBy);
							setPendingCreatedBy(null);
						}}
					>
						Сменить
					</Button>
				</DialogActions>
			</Dialog>
		</Flex>
	);
}
