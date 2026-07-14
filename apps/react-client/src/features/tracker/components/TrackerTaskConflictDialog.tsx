import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Typography from "@mui/material/Typography";
import type { KanbanBoardTaskEditBlockedErrorDto } from "@smart-anketa/api-contract";

type Props = {
	open: boolean;
	error: KanbanBoardTaskEditBlockedErrorDto | null;
	onRefresh: () => void;
	onForceOverwrite: () => void;
	onClose: () => void;
};

export function TrackerTaskConflictDialog({
	open,
	error,
	onRefresh,
	onForceOverwrite,
	onClose,
}: Props) {
	if (!error) return null;

	const conflicts = error.conflicts ?? [];
	const isLock = error.reason === "lock";

	return (
		<Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
			<DialogTitle>
				{isLock ? "Задача занята" : "Конфликт версий"}
			</DialogTitle>
			<DialogContent>
				<Typography variant="body2" sx={{ mb: conflicts.length ? 1.5 : 0 }}>
					{error.message}
				</Typography>
				{isLock && error.lock ? (
					<Typography variant="body2" color="text.secondary">
						Редактирует: {error.lock.lockedByLabel}
					</Typography>
				) : null}
				{conflicts.length ? (
					<Typography variant="body2" component="div" color="text.secondary">
						{conflicts.slice(0, 5).map((item) => (
							<span key={item.taskId}>
								{item.taskKey ?? item.taskTitle ?? item.taskId}
								<br />
							</span>
						))}
						{conflicts.length > 5 ? `…и ещё ${conflicts.length - 5}` : null}
					</Typography>
				) : null}
			</DialogContent>
			<DialogActions>
				<Button onClick={onClose}>Отмена</Button>
				<Button onClick={onRefresh} variant="outlined">
					Обновить
				</Button>
				{!isLock ? (
					<Button onClick={onForceOverwrite} variant="contained" color="warning">
						Перезаписать
					</Button>
				) : null}
			</DialogActions>
		</Dialog>
	);
}
