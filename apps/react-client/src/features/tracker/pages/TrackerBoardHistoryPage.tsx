import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import HistoryIcon from "@mui/icons-material/History";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import FormControl from "@mui/material/FormControl";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type {
	KanbanBoardHistoryDayGroupDto,
	KanbanBoardHistoryPreviewDto,
	KanbanBoardTaskHistoryEntryDto,
} from "@smart-anketa/api-contract";
import {
	formatKanbanBoardHistoryValue,
	KANBAN_BOARD_HISTORY_OVERVIEW_PREVIEW_LIMIT,
	KANBAN_BOARD_TASK_HISTORY_MAX_PER_TASK,
	normalizeTrackerCode,
} from "@smart-anketa/api-contract";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import { useMemo } from "react";
import { useNavigate, useParams } from "react-router";
import { Card } from "@react-client/common/muiCustom/Card";
import { Flex } from "@react-client/common/primitives/Flex";
import { Header } from "@react-client/common/navigation/organisms/Header";
import {
	useKanbanBoardBoards,
	useKanbanBoardHistory,
	useKanbanBoardHistoryOverview,
} from "@react-client/common/api/queries/kanban-board";
import {
	trackerBoardHistoryPath,
	trackerBoardPath,
	trackerTaskPath,
} from "@react-client/features/kanban-board/kanban-task-paths";

const formatDayLabel = (date: string) => {
	try {
		return format(parseISO(date), "d MMMM yyyy", { locale: ru });
	} catch {
		return date;
	}
};

const formatTime = (iso: string) => {
	try {
		return format(parseISO(iso), "HH:mm");
	} catch {
		return "";
	}
};

function HistoryChangeRow({
	change,
}: {
	change: KanbanBoardTaskHistoryEntryDto["changes"][number];
}) {
	return (
		<Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
			<Typography variant="body2" color="text.secondary" sx={{ minWidth: 120 }}>
				{change.label}:
			</Typography>
			<Typography
				variant="body2"
				sx={{ textDecoration: change.from ? "line-through" : "none" }}
				color={change.from ? "text.secondary" : "text.primary"}
			>
				{formatKanbanBoardHistoryValue(change.from) ?? "—"}
			</Typography>
			<Typography variant="body2" color="text.secondary">
				→
			</Typography>
			<Typography variant="body2" fontWeight={500}>
				{formatKanbanBoardHistoryValue(change.to) ?? "—"}
			</Typography>
		</Stack>
	);
}

function HistoryEntryCard({
	entry,
}: {
	entry: KanbanBoardTaskHistoryEntryDto;
}) {
	return (
		<Box
			sx={{
				borderLeft: 3,
				borderColor: "primary.main",
				pl: 2,
				py: 1,
			}}
		>
			<Stack spacing={0.75}>
				<Stack
					direction="row"
					spacing={1}
					alignItems="center"
					flexWrap="wrap"
					useFlexGap
				>
					<Chip
						label={entry.taskKey}
						size="small"
						variant="outlined"
						sx={{ fontFamily: "monospace" }}
					/>
					<Typography variant="subtitle2" fontWeight={600}>
						{entry.taskTitle || "Без названия"}
					</Typography>
					<Typography variant="caption" color="text.secondary">
						{formatTime(entry.createdAt)}
					</Typography>
					{entry.createdBy ? (
						<Typography variant="caption" color="text.secondary">
							· {entry.createdBy}
						</Typography>
					) : null}
				</Stack>
				<Stack spacing={0.5}>
					{entry.changes.map((change) => (
						<HistoryChangeRow
							key={`${entry.id}-${change.field}`}
							change={change}
						/>
					))}
				</Stack>
			</Stack>
		</Box>
	);
}

function HistoryDaySection({
	day,
	onOpenTask,
}: {
	day: KanbanBoardHistoryDayGroupDto;
	onOpenTask: (taskKey: string) => void;
}) {
	const byTask = useMemo(() => {
		const map = new Map<string, KanbanBoardTaskHistoryEntryDto[]>();
		for (const entry of day.entries) {
			const list = map.get(entry.taskId) ?? [];
			list.push(entry);
			map.set(entry.taskId, list);
		}
		return [...map.values()];
	}, [day.entries]);

	return (
		<Box>
			<Typography variant="h6" sx={{ mb: 1.5 }}>
				{formatDayLabel(day.date)}
			</Typography>
			<Stack spacing={2}>
				{byTask.map((entries) => (
					<Card key={entries[0]?.taskId} sx={{ p: 2 }}>
						<Stack spacing={1.5} divider={<Divider flexItem />}>
							{entries.map((entry) => (
								<HistoryEntryCard key={entry.id} entry={entry} />
							))}
						</Stack>
					</Card>
				))}
			</Stack>
		</Box>
	);
}

function HistoryBoardPreviewAccordion({
	board,
	onOpenBoardHistory,
}: {
	board: KanbanBoardHistoryPreviewDto;
	onOpenBoardHistory: (boardKey: string) => void;
}) {
	return (
		<Accordion
			defaultExpanded
			disableGutters
			elevation={0}
			sx={{ "&::before": { display: "none" } }}
		>
			<AccordionSummary expandIcon={<ExpandMoreIcon />}>
				<Stack spacing={0.25}>
					<Typography variant="subtitle2" fontWeight={600}>
						{board.boardKey} · {board.boardName}
					</Typography>
					<Typography variant="caption" color="text.secondary">
						{board.entries.length} последних изменений
					</Typography>
				</Stack>
			</AccordionSummary>
			<AccordionDetails>
				<Stack spacing={1.5} divider={<Divider flexItem />}>
					{board.entries.map((entry) => (
						<HistoryEntryCard key={entry.id} entry={entry} />
					))}
				</Stack>
				<Typography
					variant="body2"
					color="primary"
					sx={{ mt: 1.5, cursor: "pointer", width: "fit-content" }}
					onClick={() => onOpenBoardHistory(board.boardKey)}
				>
					Вся история доски →
				</Typography>
			</AccordionDetails>
		</Accordion>
	);
}

function HistoryOverview({
	onOpenBoardHistory,
}: {
	onOpenBoardHistory: (boardKey: string) => void;
}) {
	const overviewQuery = useKanbanBoardHistoryOverview();

	if (overviewQuery.isLoading) {
		return <Alert severity="info">Загрузка истории…</Alert>;
	}
	if (overviewQuery.isError) {
		return <Alert severity="error">Не удалось загрузить историю</Alert>;
	}
	if (!overviewQuery.data?.boards.length) {
		return (
			<Alert severity="info" icon={<HistoryIcon />}>
				Пока нет записей истории. Изменения появятся после редактирования задач
				на досках.
			</Alert>
		);
	}

	return (
		<>
			{overviewQuery.data.boards.map((board) => (
				<Card key={board.boardId} sx={{ overflow: "hidden" }}>
					<HistoryBoardPreviewAccordion
						board={board}
						onOpenBoardHistory={onOpenBoardHistory}
					/>
				</Card>
			))}
		</>
	);
}

export function TrackerBoardHistoryPage() {
	const navigate = useNavigate();
	const { boardKey: boardKeyParam = "" } = useParams<{ boardKey?: string }>();
	const boardsQuery = useKanbanBoardBoards();
	const selectedBoardKey = normalizeTrackerCode(boardKeyParam);
	const boardMeta = boardsQuery.data?.find(
		(board) => board.boardKey === selectedBoardKey,
	);
	const boardRef = boardMeta?.boardKey ?? selectedBoardKey;
	const historyQuery = useKanbanBoardHistory(
		selectedBoardKey ? boardRef : undefined,
	);

	const boardOptions = useMemo(
		() => boardsQuery.data ?? [],
		[boardsQuery.data],
	);

	const displayBoardKey =
		historyQuery.data?.boardKey ?? boardMeta?.boardKey ?? selectedBoardKey;
	const displayBoardName =
		historyQuery.data?.boardName ?? boardMeta?.name ?? "";

	return (
		<Flex flexDirection="column" flexGrow={1} minHeight={"0"} gap={2}>
			<Header
				leadingAccessory={
					selectedBoardKey ? (
						<Typography variant="body2" color="text.secondary" noWrap>
							{displayBoardKey}
							{displayBoardName ? ` · ${displayBoardName}` : ""}
							{" · до "}
							{KANBAN_BOARD_TASK_HISTORY_MAX_PER_TASK} изменений/задачу
							{" · "}
							<Typography
								component="span"
								variant="body2"
								color="primary"
								sx={{ cursor: "pointer" }}
								onClick={() => navigate(trackerBoardPath(selectedBoardKey))}
							>
								Открыть доску
							</Typography>
						</Typography>
					) : (
						<Typography variant="body2" color="text.secondary">
							Последние изменения по доскам (до{" "}
							{KANBAN_BOARD_HISTORY_OVERVIEW_PREVIEW_LIMIT} на доску)
						</Typography>
					)
				}
			>
				<FormControl size="small" sx={{ minWidth: 280 }}>
					<Select
						labelId="tracker-history-board-label"
						label="Доска"
						value={selectedBoardKey || ""}
						onChange={(event) => {
							const next = event.target.value;
							navigate(
								next ? trackerBoardHistoryPath(next) : "/tracker/history",
							);
						}}
					>
						<MenuItem value="">
							<em>Все доски</em>
						</MenuItem>
						{boardOptions.map((board) => (
							<MenuItem key={board.id} value={board.boardKey}>
								{board.boardKey} — {board.name}
							</MenuItem>
						))}
					</Select>
				</FormControl>
			</Header>

			{!selectedBoardKey ? (
				<HistoryOverview
					onOpenBoardHistory={(boardKey) =>
						navigate(trackerBoardHistoryPath(boardKey))
					}
				/>
			) : historyQuery.isLoading ? (
				<Alert severity="info">Загрузка истории…</Alert>
			) : historyQuery.isError ? (
				<Alert severity="error">Не удалось загрузить историю доски</Alert>
			) : !historyQuery.data?.days.length ? (
				<Alert severity="info">
					Пока нет записей истории. Изменения появятся после редактирования
					задач.
				</Alert>
			) : (
				<Box sx={{ flex: 1, overflow: "auto", pr: 1 }}>
					<Stack spacing={3}>
						{historyQuery.data.days.map((day) => (
							<HistoryDaySection
								key={day.date}
								day={day}
								onOpenTask={(taskKey) => navigate(trackerTaskPath(taskKey))}
							/>
						))}
					</Stack>
				</Box>
			)}
		</Flex>
	);
}
