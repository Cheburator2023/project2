import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";
import type { KanbanBoardTaskHistoryEntryDto } from "@smart-anketa/api-contract";
import { formatKanbanBoardHistoryValue } from "@smart-anketa/api-contract";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import { useKanbanBoardTaskHistory } from "@react-client/common/api/queries/kanban-board";
import { Flex } from "@react-client/common/primitives/Flex";

type Props = {
	taskId: string;
};

function formatEntryTime(iso: string): string {
	try {
		return format(parseISO(iso), "d MMM yyyy, HH:mm", { locale: ru });
	} catch {
		return iso;
	}
}

function HistoryEntry({ entry }: { entry: KanbanBoardTaskHistoryEntryDto }) {
	return (
		<Box
			sx={{
				borderLeft: 3,
				borderColor: "primary.main",
				pl: 1.5,
				py: 0.75,
			}}
		>
			<Flex flexDirection="column" gap={6}>
				<Flex alignItems="center" gap={8} wrap="wrap">
					<Typography variant="caption" color="text.secondary">
						{formatEntryTime(entry.createdAt)}
					</Typography>
					{entry.createdBy ? (
						<Typography variant="caption" color="text.secondary">
							· {entry.createdBy}
						</Typography>
					) : null}
				</Flex>
				{entry.changes.map((change, index) => (
					<Flex key={`${entry.id}-${change.field}-${index}`} gap={6} wrap="wrap">
						<Typography
							variant="body2"
							color="text.secondary"
							sx={{ minWidth: 110 }}
						>
							{change.label}:
						</Typography>
						<Typography
							variant="body2"
							sx={{
								textDecoration: change.from ? "line-through" : "none",
							}}
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
					</Flex>
				))}
			</Flex>
		</Box>
	);
}

export function KanbanTaskHistorySection({ taskId }: Props) {
	const historyQuery = useKanbanBoardTaskHistory(taskId);
	const entries = historyQuery.data ?? [];

	if (historyQuery.isLoading) {
		return (
			<Flex alignItems="center" justifyContent="center" sx={{ py: 3 }}>
				<CircularProgress size={24} />
			</Flex>
		);
	}

	if (historyQuery.isError) {
		return (
			<Alert severity="error">Не удалось загрузить историю изменений</Alert>
		);
	}

	if (!entries.length) {
		return (
			<Typography variant="body2" color="text.secondary">
				Пока нет записей об изменениях этой задачи
			</Typography>
		);
	}

	return (
		<Flex flexDirection="column" gap={12}>
			{entries.map((entry) => (
				<HistoryEntry key={entry.id} entry={entry} />
			))}
		</Flex>
	);
}
