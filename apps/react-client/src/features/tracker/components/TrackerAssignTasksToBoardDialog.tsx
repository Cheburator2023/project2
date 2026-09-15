import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import { useKanbanBoardBoards } from "@react-client/common/api/queries/kanban-board";
import { Flex } from "@react-client/common/primitives/Flex";
import { Spacer } from "@react-client/common/primitives/Spacer";
import { KanbanTaskMultiSelectField } from "@react-client/features/kanban-board/components/KanbanTaskSelectField";
import {
	KANBAN_BOARD_SYSTEMS,
	kanbanBoardSystemColor,
	type KanbanBoardSystemId,
} from "@smart-anketa/api-contract";
import { useEffect, useMemo, useState } from "react";

const SYSTEM_OPTIONS = KANBAN_BOARD_SYSTEMS.map((option) => ({
	value: option.id,
	label: option.title,
	color: kanbanBoardSystemColor(option.id),
}));

type Props = {
	open: boolean;
	taskCount: number;
	isSubmitting?: boolean;
	onClose: () => void;
	onConfirm: (boardId: string, systems: KanbanBoardSystemId[]) => void;
};

export function TrackerAssignTasksToBoardDialog({
	open,
	taskCount,
	isSubmitting = false,
	onClose,
	onConfirm,
}: Props) {
	const boardsQuery = useKanbanBoardBoards();
	const [boardId, setBoardId] = useState("");
	const [systems, setSystems] = useState<string[]>([]);

	const boardOptions = useMemo(
		() =>
			(boardsQuery.data ?? []).map((board) => ({
				value: board.id,
				label: `${board.projectCode}/${board.slug} — ${board.name}`,
			})),
		[boardsQuery.data],
	);

	useEffect(() => {
		if (!open) return;
		setSystems([]);
		setBoardId("");
	}, [open]);

	useEffect(() => {
		if (!open) return;
		if (!boardId && boardOptions[0]) setBoardId(boardOptions[0].value);
	}, [boardId, boardOptions, open]);

	const canConfirm = Boolean(boardId && systems.length) && !isSubmitting;

	return (
		<Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
			<DialogTitle>Добавить задачи на доску</DialogTitle>
			<DialogContent>
				<DialogContentText>
					Выбрано задач: {taskCount}. Задачи будут перенесены на выбранную доску с
					сохранением статуса (колонки), где это возможно. Система / приложение
					выставится всем переносимым задачам.
				</DialogContentText>
				<Spacer space={16} />
				<Flex flexDirection="column" gap={16}>
					<TextField
						select
						fullWidth
						required
						label="Доска"
						value={boardId}
						onChange={(event) => setBoardId(event.target.value)}
						disabled={boardsQuery.isLoading || isSubmitting}
					>
						{boardOptions.map((option) => (
							<MenuItem key={option.value} value={option.value}>
								{option.label}
							</MenuItem>
						))}
					</TextField>
					<KanbanTaskMultiSelectField
						label="Система / приложение"
						value={systems}
						options={SYSTEM_OPTIONS}
						onChange={setSystems}
						fullWidth
						required
						disabled={isSubmitting}
						emptyLabel="— выберите —"
					/>
				</Flex>
			</DialogContent>
			<DialogActions>
				<Button onClick={onClose} disabled={isSubmitting}>
					Отмена
				</Button>
				<Button
					variant="contained"
					disabled={!canConfirm}
					onClick={() => {
						if (!boardId || !systems.length) return;
						onConfirm(boardId, systems as KanbanBoardSystemId[]);
					}}
				>
					{isSubmitting ? "Перенос…" : "Добавить на доску"}
				</Button>
			</DialogActions>
		</Dialog>
	);
}
