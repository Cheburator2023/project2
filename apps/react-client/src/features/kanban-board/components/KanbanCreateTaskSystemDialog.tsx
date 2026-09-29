import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import { Spacer } from "@react-client/common/primitives/Spacer";
import { KanbanTaskMultiSelectField } from "@react-client/features/kanban-board/components/KanbanTaskSelectField";
import {
	KANBAN_BOARD_SYSTEMS,
	kanbanBoardSystemColor,
	type KanbanBoardSystemId,
} from "@smart-anketa/api-contract";
import { useEffect, useState } from "react";

const SYSTEM_OPTIONS = KANBAN_BOARD_SYSTEMS.map((option) => ({
	value: option.id,
	label: option.title,
	color: kanbanBoardSystemColor(option.id),
}));

type Props = {
	open: boolean;
	isSubmitting?: boolean;
	onClose: () => void;
	onConfirm: (systems: KanbanBoardSystemId[]) => void;
};

export function KanbanCreateTaskSystemDialog({
	open,
	isSubmitting = false,
	onClose,
	onConfirm,
}: Props) {
	const [systems, setSystems] = useState<string[]>([]);

	useEffect(() => {
		if (!open) return;
		setSystems([]);
	}, [open]);

	const canConfirm = systems.length > 0 && !isSubmitting;

	return (
		<Dialog
			open={open}
			onClose={isSubmitting ? undefined : onClose}
			maxWidth="sm"
			fullWidth
			data-test-id="kanban-create-task-system-dialog"
		>
			<DialogTitle>Новая задача</DialogTitle>
			<DialogContent>
				<DialogContentText>
					Выберите систему / приложение — без этого задача не будет создана.
				</DialogContentText>
				<Spacer space={16} />
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
			</DialogContent>
			<DialogActions>
				<Button onClick={onClose} disabled={isSubmitting}>
					Отмена
				</Button>
				<Button
					variant="contained"
					disabled={!canConfirm}
					onClick={() => {
						if (!systems.length) return;
						onConfirm(systems as KanbanBoardSystemId[]);
					}}
				>
					{isSubmitting ? "Создание…" : "Создать"}
				</Button>
			</DialogActions>
		</Dialog>
	);
}
