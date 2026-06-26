import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import { useKanbanBoardBoards } from "@react-client/common/api/queries/kanban-board";
import { useMemo, useState } from "react";

type Props = {
	open: boolean;
	taskCount: number;
	isSubmitting?: boolean;
	onClose: () => void;
	onConfirm: (boardId: string) => void;
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

	const boardOptions = useMemo(
		() =>
			(boardsQuery.data ?? []).map((board) => ({
				value: board.id,
				label: `${board.projectCode}/${board.slug} — ${board.name}`,
			})),
		[boardsQuery.data],
	);

	return (
		<Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
			<DialogTitle>Добавить задачи на доску</DialogTitle>
			<DialogContent>
				<DialogContentText sx={{ mb: 2 }}>
					Выбрано задач: {taskCount}. Задачи будут перенесены на выбранную доску с
					сохранением статуса (колонки), где это возможно.
				</DialogContentText>
				<TextField
					select
					fullWidth
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
			</DialogContent>
			<DialogActions>
				<Button onClick={onClose} disabled={isSubmitting}>
					Отмена
				</Button>
				<Button
					variant="contained"
					disabled={!boardId || isSubmitting}
					onClick={() => onConfirm(boardId)}
				>
					{isSubmitting ? "Перенос…" : "Добавить на доску"}
				</Button>
			</DialogActions>
		</Dialog>
	);
}
