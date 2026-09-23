import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import MenuItem from "@mui/material/MenuItem";
import Slider from "@mui/material/Slider";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import type { ColDef } from "ag-grid-community";
import { TrackerRegistryGrid } from "@react-client/features/tracker/components/TrackerRegistryGrid";
import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@react-client/common/api/helpers/apiClient";
import { apiErrorMessage } from "@react-client/common/api/helpers/apiErrorMessage";
import {
	useKanbanBoardBoards,
	useKanbanBoardColumns,
	useKanbanBoardPlanning,
	useKanbanBoardPlannings,
	useKanbanBoardSprints,
	useKanbanBoardTasksRegistry,
} from "@react-client/common/api/queries/kanban-board";
import { Flex } from "@react-client/common/primitives/Flex";
import { toast } from "@react-client/common/toasts";
import { getTrackerCurrentUserAssigneeName } from "@react-client/features/tracker/utils/trackerCurrentUserAssignee.storage";
import {
	KANBAN_BOARD_SYSTEMS,
	KANBAN_BOARD_SYSTEM_COLORS,
	normalizeKanbanBoardTaskContent,
	type CreateKanbanBoardPlanningRequestDto,
	type CreateKanbanBoardReleaseThemeRequestDto,
	type CreateKanbanBoardTaskCommentRequestDto,
	type CreateKanbanBoardTaskRequestDto,
	type KanbanBoardPlanningDetailDto,
	type KanbanBoardReleaseThemeDto,
	type KanbanBoardTaskCommentDto,
	type KanbanBoardRoleEstimates,
	type KanbanBoardSystemId,
	type KanbanBoardTaskContent,
	type KanbanBoardTaskRegistryDto,
	type UpdateKanbanBoardTaskRequestDto,
} from "@smart-anketa/api-contract";
import { useMemo, useRef, useState } from "react";
import {
	PLANNING_CSV_MATCH_THRESHOLD,
	matchPlanningCsvRows,
	parsePlanningCsv,
	planningSystemTitle,
	type PlanningCsvAction,
	type PlanningCsvMatch,
} from "./planningCsvImport";

const PLANNING_NEW = "__new__";

type ImportPreviewRow = {
	line: number;
	action: PlanningCsvAction;
	title: string;
	description: string;
	assigneesText: string;
	comment: string;
	sprintCode: string;
	statusId: string;
	systemId: KanbanBoardSystemId | "";
	analyst: number | null;
	developer: number | null;
	qa: number | null;
	debug: number | null;
	devops: number | null;
	architect: number | null;
	score: number;
	matchedTaskId: string | null;
	matchedTaskKey: string;
	editedFields: string[];
};

type RollbackJournal = {
	createdTaskIds: string[];
	comments: { taskId: string; commentId: string }[];
	updates: { id: string; content: KanbanBoardTaskContent }[];
	createdPlanningId?: string;
	createdThemeIds: { planningId: string; themeId: string }[];
	attached: { planningId: string; taskId: string }[];
};

const emptyJournal = (): RollbackJournal => ({
	createdTaskIds: [],
	comments: [],
	updates: [],
	createdThemeIds: [],
	attached: [],
});

function importJournalIsEmpty(journal: RollbackJournal): boolean {
	return (
		!journal.createdPlanningId &&
		journal.createdTaskIds.length === 0 &&
		journal.comments.length === 0 &&
		journal.updates.length === 0 &&
		journal.createdThemeIds.length === 0 &&
		journal.attached.length === 0
	);
}

async function revertImportJournal(journal: RollbackJournal, authorName: string) {
	for (const comment of [...journal.comments].reverse()) {
		await apiClient({
			url: `/kanban-board/tasks/${comment.taskId}/comments/${comment.commentId}`,
			method: "DELETE",
		});
	}
	for (const update of [...journal.updates].reverse()) {
		await apiClient({
			url: `/kanban-board/tasks/${update.id}`,
			method: "PUT",
			data: {
				content: update.content,
				forceOverwrite: true,
				lockHolderLabel: authorName || undefined,
			} satisfies UpdateKanbanBoardTaskRequestDto,
		});
	}
	for (const item of [...journal.attached].reverse()) {
		await apiClient({
			url: `/kanban-board/plannings/${item.planningId}/tasks/${item.taskId}`,
			method: "DELETE",
		});
	}
	for (const theme of [...journal.createdThemeIds].reverse()) {
		await apiClient({
			url: `/kanban-board/plannings/${theme.planningId}/themes/${theme.themeId}`,
			method: "DELETE",
		});
	}
	if (journal.createdPlanningId) {
		await apiClient({
			url: `/kanban-board/plannings/${journal.createdPlanningId}`,
			method: "DELETE",
		});
	}
	for (const taskId of [...journal.createdTaskIds].reverse()) {
		await apiClient({
			url: `/kanban-board/tasks/${taskId}`,
			method: "DELETE",
		});
	}
}

function planningCode(): string {
	const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
	let suffix = "";
	for (let index = 0; index < 8; index += 1) {
		suffix += alphabet[Math.floor(Math.random() * alphabet.length)] ?? "X";
	}
	return `PLN-${suffix}`;
}

function actionLabel(action: PlanningCsvAction): string {
	if (action === "create") return "Создать";
	if (action === "update") return "Обновить";
	return "Без изменений";
}

const ROLE_KEYS = [
	"analyst",
	"developer",
	"qa",
	"debug",
	"devops",
	"architect",
] as const satisfies ReadonlyArray<keyof KanbanBoardRoleEstimates>;

function cellEstimate(
	estimates: KanbanBoardRoleEstimates | undefined,
	key: keyof KanbanBoardRoleEstimates,
): number | null {
	const value = estimates?.[key];
	return value === undefined ? null : value;
}

function estimatesFromRow(row: ImportPreviewRow): KanbanBoardRoleEstimates | undefined {
	const next: KanbanBoardRoleEstimates = {};
	for (const key of ROLE_KEYS) {
		const value = row[key];
		if (typeof value === "number" && Number.isFinite(value)) next[key] = value;
	}
	return Object.keys(next).length ? next : undefined;
}

function assigneesFromText(value: string): string[] {
	return value
		.split(",")
		.map((item) => item.trim())
		.filter(Boolean);
}

function toPreviewRow(
	match: PlanningCsvMatch,
	currentStatusId?: string,
): ImportPreviewRow {
	const estimates =
		match.action === "create" ? match.row.estimates : match.nextEstimates;
	return {
		line: match.row.line,
		action: match.action,
		title: match.row.title,
		description: match.row.description,
		assigneesText: match.row.assignees.join(", "),
		comment: match.row.comment,
		sprintCode: match.row.sprintCode,
		statusId:
			match.action === "create"
				? match.statusId
				: (currentStatusId ?? match.statusId),
		systemId: match.systemId ?? "",
		analyst: cellEstimate(estimates, "analyst"),
		developer: cellEstimate(estimates, "developer"),
		qa: cellEstimate(estimates, "qa"),
		debug: cellEstimate(estimates, "debug"),
		devops: cellEstimate(estimates, "devops"),
		architect: cellEstimate(estimates, "architect"),
		score: match.score,
		matchedTaskId: match.task?.id ?? null,
		matchedTaskKey: match.task?.taskKey ?? "",
		editedFields: [],
	};
}

const EDITABLE_PREVIEW_FIELDS = [
	"title",
	"description",
	"assigneesText",
	"comment",
	"sprintCode",
	"statusId",
	"systemId",
	"analyst",
	"developer",
	"qa",
	"debug",
	"devops",
	"architect",
] as const satisfies ReadonlyArray<keyof ImportPreviewRow>;

function overlayPreviewEdits(
	row: ImportPreviewRow,
	previous: ImportPreviewRow | undefined,
): ImportPreviewRow {
	if (!previous?.editedFields.length) return row;
	const merged: ImportPreviewRow = {
		...row,
		editedFields: [...previous.editedFields],
	};
	for (const field of EDITABLE_PREVIEW_FIELDS) {
		if (!previous.editedFields.includes(field)) continue;
		Object.assign(merged, { [field]: previous[field] });
	}
	return merged;
}

export function TrackerPlanningCsvImport() {
	const queryClient = useQueryClient();
	const fileRef = useRef<HTMLInputElement>(null);
	const boardsQuery = useKanbanBoardBoards();
	const planningsQuery = useKanbanBoardPlannings();
	const sprintsQuery = useKanbanBoardSprints();
	const tasksQuery = useKanbanBoardTasksRegistry();
	const [boardId, setBoardId] = useState("");
	const [planningChoice, setPlanningChoice] = useState(PLANNING_NEW);
	const [planningName, setPlanningName] = useState("");
	const [groupBySystem, setGroupBySystem] = useState(true);
	const [threshold, setThreshold] = useState(PLANNING_CSV_MATCH_THRESHOLD);
	const [fileName, setFileName] = useState("");
	const [csvText, setCsvText] = useState("");
	const [quickFilter, setQuickFilter] = useState("");
	const [preview, setPreview] = useState<ImportPreviewRow[] | null>(null);
	const [selectedLines, setSelectedLines] = useState<number[]>([]);
	const [journal, setJournal] = useState<RollbackJournal | null>(null);
	const [busy, setBusy] = useState(false);
	const [progress, setProgress] = useState("");
	const boards = boardsQuery.data ?? [];
	const selectedBoardId =
		boardId ||
		boards.find((board) => board.boardKey === "COMMON")?.id ||
		boards[0]?.id ||
		"";
	const columnsQuery = useKanbanBoardColumns(selectedBoardId);
	const existingPlanningId =
		planningChoice && planningChoice !== PLANNING_NEW ? planningChoice : "";
	const planningDetailQuery = useKanbanBoardPlanning(existingPlanningId);

	const authorName = getTrackerCurrentUserAssigneeName().trim();

	const buildPreviewRows = (parsedThreshold: number): ImportPreviewRow[] | null => {
		if (!Number.isFinite(parsedThreshold) || parsedThreshold < 50 || parsedThreshold > 100) {
			toast.error("Порог совпадения — число от 50 до 100");
			return null;
		}
		if (!csvText.trim()) {
			toast.error("Выберите CSV");
			return null;
		}
		if (!selectedBoardId) {
			toast.error("Выберите доску");
			return null;
		}
		if (planningChoice === PLANNING_NEW && !planningName.trim()) {
			toast.error("Укажите название нового планирования");
			return null;
		}
		const columns = columnsQuery.data ?? [];
		if (!columns.length) {
			toast.error("Колонки доски ещё не загрузились");
			return null;
		}
		let parsedRows;
		try {
			parsedRows = parsePlanningCsv(csvText);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Не удалось прочитать CSV");
			return null;
		}
		if (!parsedRows.length) {
			toast.error("В CSV нет задач");
			return null;
		}
		const matches = matchPlanningCsvRows({
			rows: parsedRows,
			tasks: (tasksQuery.data ?? []).map((task) => ({
				id: task.id,
				boardId: task.boardId,
				taskKey: task.taskKey,
				title: task.title,
				sprintId: task.content.sprintId,
				roleEstimates: task.content.roleEstimates,
			})),
			columns: columns.map((column) => ({ id: column.id, title: column.title })),
			sprints: (sprintsQuery.data ?? []).map((sprint) => ({
				id: sprint.id,
				code: sprint.code,
				name: sprint.name,
			})),
			boardId: selectedBoardId,
			threshold: parsedThreshold,
		});
		const tasksById = new Map((tasksQuery.data ?? []).map((task) => [task.id, task]));
		return matches.map((match) =>
			toPreviewRow(
				match,
				match.task ? tasksById.get(match.task.id)?.parentId : undefined,
			),
		);
	};

	const openPreview = () => {
		const previewRows = buildPreviewRows(threshold);
		if (!previewRows) return;
		setPreview(previewRows);
		setSelectedLines(previewRows.map((row) => row.line));
		setQuickFilter("");
		setJournal(null);
	};

	const changeThreshold = (next: number) => {
		setThreshold(next);
		const previewRows = buildPreviewRows(next);
		if (!previewRows) return;
		setPreview((current) => {
			const previous = new Map((current ?? []).map((row) => [row.line, row]));
			return previewRows.map((row) => overlayPreviewEdits(row, previous.get(row.line)));
		});
	};

	const selectedRows = useMemo(() => {
		const selected = new Set(selectedLines);
		return (preview ?? []).filter((row) => selected.has(row.line));
	}, [preview, selectedLines]);

	const previewColumns = useMemo<ColDef<ImportPreviewRow>[]>(() => {
		const columns = columnsQuery.data ?? [];
		const statusIds = columns.map((column) => column.id);
		const statusTitle = (id: string) =>
			columns.find((column) => column.id === id)?.title ?? id;
		const numberColumn = (
			field: (typeof ROLE_KEYS)[number],
			headerName: string,
		): ColDef<ImportPreviewRow> => ({
			field,
			headerName,
			editable: true,
			width: 130,
			cellEditor: "agNumberCellEditor",
			cellEditorParams: { min: 0, precision: 2 },
			valueParser: (params) => {
				if (params.newValue === "" || params.newValue == null) return null;
				const parsed = Number(String(params.newValue).replace(",", "."));
				return Number.isFinite(parsed) ? parsed : null;
			},
		});
		return [
			{
				field: "action",
				headerName: "Действие",
				width: 150,
				valueFormatter: (params) => actionLabel(params.value),
			},
			{
				field: "title",
				headerName: "Название",
				editable: true,
				flex: 1,
				minWidth: 260,
			},
			{
				field: "description",
				headerName: "Описание",
				editable: true,
				width: 220,
				cellEditor: "agLargeTextCellEditor",
				cellEditorPopup: true,
			},
			{
				field: "assigneesText",
				headerName: "Исполнители",
				editable: true,
				width: 200,
			},
			{
				field: "comment",
				headerName: "Комментарий",
				editable: true,
				width: 200,
				cellEditor: "agLargeTextCellEditor",
				cellEditorPopup: true,
			},
			{
				field: "statusId",
				headerName: "Статус",
				editable: true,
				width: 210,
				cellEditor: "agSelectCellEditor",
				cellEditorParams: { values: statusIds },
				valueFormatter: (params) => statusTitle(String(params.value ?? "")),
			},
			{
				field: "sprintCode",
				headerName: "Спринт",
				editable: true,
				width: 150,
			},
			numberColumn("analyst", "Аналитик, чд"),
			numberColumn("developer", "Разработчик, чд"),
			numberColumn("qa", "Тестировщик, чд"),
			numberColumn("debug", "Отладка, чд"),
			numberColumn("devops", "DevOps, чд"),
			numberColumn("architect", "Архитектор, чд"),
			{
				field: "systemId",
				headerName: "Система",
				editable: true,
				width: 170,
				cellEditor: "agSelectCellEditor",
				cellEditorParams: {
					values: ["", ...KANBAN_BOARD_SYSTEMS.map((system) => system.id)],
				},
				valueFormatter: (params) =>
					planningSystemTitle((params.value || null) as KanbanBoardSystemId | null) ||
					"без группы",
			},
			{
				colId: "match",
				headerName: "Совпадение",
				pinned: "right",
				lockPinned: true,
				width: 180,
				valueGetter: (params) =>
					params.data?.matchedTaskKey
						? `${params.data.score}% · ${params.data.matchedTaskKey}`
						: "нет",
			},
		];
	}, [columnsQuery.data]);

	const counts = useMemo(() => {
		const included = selectedRows;
		return {
			create: included.filter((row) => row.action === "create").length,
			update: included.filter((row) => row.action === "update").length,
			unchanged: included.filter((row) => row.action === "unchanged").length,
			sprintMissing: included.filter(
				(row) =>
					Boolean(row.sprintCode.trim()) &&
					!(sprintsQuery.data ?? []).some(
						(sprint) =>
							sprint.code.localeCompare(row.sprintCode.trim(), undefined, {
								sensitivity: "accent",
							}) === 0,
					),
			).length,
			comments: included.filter((row) => row.comment.trim()).length,
		};
	}, [selectedRows, sprintsQuery.data]);

	const applyPreview = async () => {
		if (!preview) return;
		const included = selectedRows;
		if (!included.length) {
			toast.error("Не выбрано ни одной строки");
			return;
		}
		const tasksById = new Map(
			(tasksQuery.data ?? []).map((task) => [task.id, task]),
		);
		const missingTask = included.find((row) => {
			if (row.action !== "update" || !row.matchedTaskId) return false;
			const task = tasksById.get(row.matchedTaskId);
			return !task || task.boardId !== selectedBoardId;
		});
		if (missingTask) {
			toast.error(
				`Задача ${missingTask.matchedTaskKey || missingTask.title} не на выбранной доске`,
			);
			return;
		}
		const nextJournal = emptyJournal();
		setBusy(true);
		setJournal(null);
		try {
			let planningId = existingPlanningId;
			const existingMemberIds = new Set(
				(planningDetailQuery.data?.tasks ?? []).map((item) => item.taskId),
			);
			if (planningChoice === PLANNING_NEW) {
				setProgress("Создаём планирование");
				const created = await apiClient<KanbanBoardPlanningDetailDto>({
					url: "/kanban-board/plannings",
					method: "POST",
					data: {
						code: planningCode(),
						name: planningName.trim(),
					} satisfies CreateKanbanBoardPlanningRequestDto,
				});
				planningId = created.id;
				nextJournal.createdPlanningId = created.id;
			}

			const taskIdByLine = new Map<number, string>();
			const sprintByCode = (code: string) => {
				const trimmed = code.trim();
				if (!trimmed) return undefined;
				return (sprintsQuery.data ?? []).find(
					(sprint) =>
						sprint.code.localeCompare(trimmed, undefined, {
							sensitivity: "accent",
						}) === 0,
				);
			};
			for (let index = 0; index < included.length; index += 1) {
				const row = included[index];
				if (!row) continue;
				setProgress(`Задачи ${index + 1} / ${included.length}`);
				const sprint = sprintByCode(row.sprintCode);
				const assignees = assigneesFromText(row.assigneesText);
				const estimates = estimatesFromRow(row);
				const edited = new Set(row.editedFields);
				if (row.action === "create") {
					const created = await apiClient<KanbanBoardTaskRegistryDto>({
						url: "/kanban-board/tasks",
						method: "POST",
						data: {
							boardId: selectedBoardId,
							parentId: row.statusId,
							createdBy: authorName || null,
							content: normalizeKanbanBoardTaskContent({
								title: row.title.trim(),
								description: row.description.trim() || undefined,
								assignees: assignees.length ? assignees : undefined,
								currentAssignee: assignees[0],
								roleEstimates: estimates,
								sprintId: sprint?.id,
								taskType: "task",
								priority: "medium",
							}),
						} satisfies CreateKanbanBoardTaskRequestDto,
					});
					nextJournal.createdTaskIds.push(created.id);
					taskIdByLine.set(row.line, created.id);
					tasksById.set(created.id, created);
				} else if (row.matchedTaskId && row.action === "update") {
					const current = tasksById.get(row.matchedTaskId);
					if (!current || current.boardId !== selectedBoardId) {
						throw new Error(
							`Задача ${row.matchedTaskKey || row.title} не на выбранной доске`,
						);
					}
					nextJournal.updates.push({
						id: current.id,
						content: current.content,
					});
					const updated = await apiClient<KanbanBoardTaskRegistryDto>({
						url: `/kanban-board/tasks/${current.id}`,
						method: "PUT",
						data: {
							parentId:
								edited.has("statusId") && row.statusId !== current.parentId
									? row.statusId
									: undefined,
							content: normalizeKanbanBoardTaskContent({
								...current.content,
								title: edited.has("title")
									? row.title.trim() || current.content.title
									: current.content.title,
								description: edited.has("description")
									? row.description.trim() || undefined
									: current.content.description,
								assignees: edited.has("assigneesText")
									? assignees
									: current.content.assignees,
								currentAssignee: edited.has("assigneesText")
									? assignees[0]
									: current.content.currentAssignee,
								roleEstimates: estimates ?? current.content.roleEstimates,
								sprintId: sprint?.id ?? current.content.sprintId,
							}),
							expectedUpdatedAt: current.updatedAt,
							forceOverwrite: true,
							lockHolderLabel: authorName || undefined,
						} satisfies UpdateKanbanBoardTaskRequestDto,
					});
					tasksById.set(updated.id, updated);
					taskIdByLine.set(row.line, updated.id);
				} else if (row.matchedTaskId) {
					taskIdByLine.set(row.line, row.matchedTaskId);
				}

				const taskId = taskIdByLine.get(row.line);
				if (taskId && row.comment.trim() && authorName) {
					const comment = await apiClient<KanbanBoardTaskCommentDto>({
						url: `/kanban-board/tasks/${taskId}/comments`,
						method: "POST",
						data: {
							body: row.comment.trim(),
							authorName,
						} satisfies CreateKanbanBoardTaskCommentRequestDto,
					});
					nextJournal.comments.push({ taskId, commentId: comment.id });
				}
			}

			if (planningId) {
				const themeBySystem = new Map<string, string>();
				if (groupBySystem) {
					const systems = [
						...new Set(
							included
								.map((row) => row.systemId)
								.filter((id): id is KanbanBoardSystemId => Boolean(id)),
						),
					];
					for (const systemId of systems) {
						setProgress(`Группа ${planningSystemTitle(systemId)}`);
						const theme = await apiClient<KanbanBoardReleaseThemeDto>({
							url: `/kanban-board/plannings/${planningId}/themes`,
							method: "POST",
							data: {
								name: planningSystemTitle(systemId),
								color: KANBAN_BOARD_SYSTEM_COLORS[systemId],
							} satisfies CreateKanbanBoardReleaseThemeRequestDto,
						});
						themeBySystem.set(systemId, theme.id);
						nextJournal.createdThemeIds.push({
							planningId,
							themeId: theme.id,
						});
					}
				}
				const buckets = new Map<string | null, string[]>();
				for (const row of included) {
					const taskId = taskIdByLine.get(row.line);
					if (!taskId || existingMemberIds.has(taskId)) continue;
					const themeKey =
						groupBySystem && row.systemId
							? (themeBySystem.get(row.systemId) ?? null)
							: null;
					const bucket = buckets.get(themeKey) ?? [];
					bucket.push(taskId);
					buckets.set(themeKey, bucket);
				}
				for (const [themeId, taskIds] of buckets) {
					if (!taskIds.length) continue;
					setProgress("Добавляем задачи в планирование");
					await apiClient({
						url: `/kanban-board/plannings/${planningId}/tasks`,
						method: "POST",
						data: { taskIds, themeId },
					});
					for (const taskId of taskIds) {
						nextJournal.attached.push({ planningId, taskId });
					}
				}
			}

			setJournal(nextJournal);
			await queryClient.invalidateQueries({ queryKey: ["kanbanBoardTasksRegistry"] });
			await queryClient.invalidateQueries({ queryKey: ["kanbanBoardTasks"] });
			await queryClient.invalidateQueries({ queryKey: ["kanbanBoardPlannings"] });
			await queryClient.invalidateQueries({ queryKey: ["kanbanBoardPlanning"] });
			toast.success("Импорт применён");
			setProgress("");
		} catch (error) {
			const message = apiErrorMessage(error);
			if (importJournalIsEmpty(nextJournal)) {
				setProgress("");
				toast.error(message);
			} else {
				setProgress("Откатываем импорт");
				try {
					await revertImportJournal(nextJournal, authorName);
					await invalidateImportQueries();
					setJournal(null);
					setProgress("");
					toast.error("Импорт не выполнен, ничего не записано.", {
						description: message,
					});
				} catch (rollbackError) {
					setJournal(nextJournal);
					setProgress("");
					toast.error(
						"Импорт остановился, и откат не завершился. Нажмите «Откатить импорт» в этом окне.",
						{ description: apiErrorMessage(rollbackError) },
					);
				}
			}
		} finally {
			setBusy(false);
		}
	};

	const invalidateImportQueries = async () => {
		await queryClient.invalidateQueries({ queryKey: ["kanbanBoardTasksRegistry"] });
		await queryClient.invalidateQueries({ queryKey: ["kanbanBoardTasks"] });
		await queryClient.invalidateQueries({ queryKey: ["kanbanBoardPlannings"] });
		await queryClient.invalidateQueries({ queryKey: ["kanbanBoardPlanning"] });
	};

	const rollback = async () => {
		if (!journal) return;
		setBusy(true);
		setProgress("Откатываем импорт");
		try {
			await revertImportJournal(journal, authorName);
			setJournal(null);
			await invalidateImportQueries();
			toast.success("Импорт откатан");
			setProgress("");
		} catch (error) {
			setProgress("");
			toast.error("Не удалось откатить импорт целиком", {
				description: apiErrorMessage(error),
			});
		} finally {
			setBusy(false);
		}
	};

	return (
		<Flex flexDirection="column" gap={12}>
			<input
				ref={fileRef}
				type="file"
				accept=".csv,text/csv"
				hidden
				onChange={(event) => {
					const file = event.target.files?.[0];
					if (!file) return;
					setFileName(file.name);
					if (!planningName.trim()) {
						setPlanningName(file.name.replace(/\.csv$/i, ""));
					}
					void file.text().then(setCsvText);
				}}
			/>
			<Flex gap={12} wrap="wrap" alignItems="center">
				<Button variant="outlined" onClick={() => fileRef.current?.click()}>
					Выбрать CSV
				</Button>
				<Typography variant="body2" color="text.secondary">
					{fileName || "Файл не выбран"}
				</Typography>
			</Flex>
			<TextField
				select
				label="Доска для новых задач"
				value={selectedBoardId}
				onChange={(event) => setBoardId(event.target.value)}
				fullWidth
				disabled={boardsQuery.isLoading}
			>
				{boards.map((board) => (
					<MenuItem key={board.id} value={board.id}>
						{board.name} ({board.boardKey})
					</MenuItem>
				))}
			</TextField>
			<TextField
				select
				label="Планирование"
				value={planningChoice}
				onChange={(event) => setPlanningChoice(event.target.value)}
				fullWidth
			>
				<MenuItem value={PLANNING_NEW}>Создать новое</MenuItem>
				<MenuItem value="">Не добавлять в планирование</MenuItem>
				{(planningsQuery.data ?? []).map((planning) => (
					<MenuItem key={planning.id} value={planning.id}>
						{planning.code} — {planning.name}
					</MenuItem>
				))}
			</TextField>
			{planningChoice === PLANNING_NEW ? (
				<TextField
					label="Название планирования"
					value={planningName}
					onChange={(event) => setPlanningName(event.target.value)}
					fullWidth
				/>
			) : null}
			<Flex alignItems="center" gap={4}>
				<Checkbox
					checked={groupBySystem}
					onChange={(event) => setGroupBySystem(event.target.checked)}
					disabled={!planningChoice}
				/>
				<Typography variant="body2">
					Создать группы планирования по системам, если система читается из названия
				</Typography>
			</Flex>
			<Flex gap={12} wrap="wrap" alignItems="center">
				<Button
					variant="contained"
					onClick={openPreview}
					disabled={!csvText || tasksQuery.isLoading || columnsQuery.isLoading}
				>
					Предпросмотр
				</Button>
				{journal ? (
					<Button variant="outlined" color="warning" onClick={() => void rollback()} disabled={busy}>
						Откатить импорт
					</Button>
				) : null}
			</Flex>
			<Dialog
				open={preview !== null}
				onClose={() => {
					if (!busy) setPreview(null);
				}}
				maxWidth="xl"
				fullWidth
			>
				<DialogTitle>Предпросмотр импорта</DialogTitle>
				<DialogContent sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
					<Typography variant="body2" color="text.secondary">
						Создать {counts.create}, обновить {counts.update}, без изменений{" "}
						{counts.unchanged}
						{counts.sprintMissing
							? `. Спринт не найден и не запишется: ${counts.sprintMissing}`
							: ""}
						{counts.comments && !authorName
							? ". Комментарии не запишутся, пока не указан «Я — исполнитель»"
							: ""}
						. Ячейки правятся кликом, в импорт попадают отмеченные строки.
					</Typography>
					{progress ? (
						<Typography variant="body2">{progress}</Typography>
					) : null}
					<Flex gap={16} alignItems="center">
						<TextField
							size="small"
							placeholder="Поиск"
							value={quickFilter}
							onChange={(event) => setQuickFilter(event.target.value)}
							inputProps={{ "aria-label": "Поиск по предпросмотру" }}
							sx={{ width: 280, flexShrink: 0 }}
						/>
						<Typography variant="body2" sx={{ whiteSpace: "nowrap" }}>
							Порог совпадения {threshold}%
						</Typography>
						<Slider
							min={50}
							max={100}
							step={1}
							value={threshold}
							onChange={(_, value) =>
								changeThreshold(Array.isArray(value) ? value[0] : value)
							}
							valueLabelDisplay="auto"
							aria-label="Порог совпадения названия"
							size="small"
							sx={{ flexGrow: 1, minWidth: 160 }}
						/>
					</Flex>
					<Flex flexDirection="column" flexGrow={1} minHeight="0" height="62vh">
						<TrackerRegistryGrid<ImportPreviewRow>
							gridStateKey="tracker.planning.csv-import.preview.v2"
							rowData={preview ?? []}
							columnDefs={previewColumns}
							quickFilter={quickFilter}
							pagination={false}
							selectAllOnReady
							stopEditingWhenCellsLoseFocus
							getRowId={(params) => String(params.data.line)}
							onSelectionChange={(rows) =>
								setSelectedLines(rows.map((row) => row.line))
							}
							onCellValueChanged={(row, field) => {
								if (!row.editedFields.includes(field)) {
									row.editedFields.push(field);
								}
								setPreview((current) => (current ? [...current] : null));
							}}
						/>
					</Flex>
				</DialogContent>
				<DialogActions>
					{journal ? (
						<Button
							variant="outlined"
							color="warning"
							onClick={() => void rollback()}
							disabled={busy}
						>
							Откатить импорт
						</Button>
					) : null}
					<Button onClick={() => setPreview(null)} disabled={busy}>
						Закрыть
					</Button>
					<Button
						variant="contained"
						onClick={() => void applyPreview()}
						disabled={busy || !counts.create && !counts.update && !counts.unchanged}
					>
						Применить
					</Button>
				</DialogActions>
			</Dialog>
		</Flex>
	);
}
