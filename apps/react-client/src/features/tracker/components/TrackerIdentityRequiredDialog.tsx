import Alert from "@mui/material/Alert";
import Autocomplete from "@mui/material/Autocomplete";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import TextField from "@mui/material/TextField";
import {
	useCreateKanbanBoardAssignee,
	useKanbanBoardAssignees,
} from "@react-client/common/api/queries/kanban-board";
import { apiErrorMessage } from "@react-client/common/api/helpers/apiErrorMessage";
import { toast } from "@react-client/common/toasts";
import { saveTrackerEditIdentity } from "@react-client/features/tracker/hooks/useTrackerEditIdentity";
import { generateTrackerAutoCode } from "@react-client/features/tracker/trackerAutoCode";
import { useMemo, useState } from "react";

type Props = {
	open: boolean;
	onCancel: () => void;
	onSaved: (name: string) => void;
};

export function TrackerIdentityRequiredDialog({
	open,
	onCancel,
	onSaved,
}: Props) {
	const assigneesQuery = useKanbanBoardAssignees();
	const createAssignee = useCreateKanbanBoardAssignee();
	const [name, setName] = useState("");
	const [error, setError] = useState<string | null>(null);

	const assigneeNames = useMemo(
		() =>
			(assigneesQuery.data ?? [])
				.map((item) => item.name.trim())
				.filter(Boolean)
				.sort((a, b) => a.localeCompare(b, "ru")),
		[assigneesQuery.data],
	);

	const trimmed = name.trim();
	const existing = useMemo(() => {
		if (!trimmed) return null;
		const lower = trimmed.toLowerCase();
		return (
			(assigneesQuery.data ?? []).find(
				(item) => item.name.trim().toLowerCase() === lower,
			) ?? null
		);
	}, [assigneesQuery.data, trimmed]);

	const busy = createAssignee.isPending;
	const canSubmit = trimmed.length > 0 && !busy;

	const handleSubmit = async () => {
		setError(null);
		if (!trimmed) {
			setError("Укажите ФИО");
			return;
		}
		try {
			const resolvedName = existing?.name.trim() || trimmed;
			if (!existing) {
				await createAssignee.mutateAsync({
					code: generateTrackerAutoCode("USR"),
					name: resolvedName,
				});
			}
			saveTrackerEditIdentity(resolvedName);
			toast.success(
				existing
					? "Профиль в трекере сохранён"
					: "Исполнитель добавлен, профиль сохранён",
			);
			onSaved(resolvedName);
		} catch (err) {
			setError(apiErrorMessage(err) || "Не удалось сохранить");
		}
	};

	return (
		<Dialog
			open={open}
			onClose={(_, reason) => {
				if (reason === "backdropClick" || reason === "escapeKeyDown") return;
				onCancel();
			}}
			disableEscapeKeyDown
			fullWidth
			maxWidth="sm"
		>
			<DialogTitle>Кто вы в трекере?</DialogTitle>
			<DialogContent>
				<DialogContentText sx={{ mb: 2 }}>
					Укажите себя как исполнителя — имя сохранится в этом браузере и будет
					использоваться для комментариев, блокировки редактирования и фильтра
					«Мои задачи».
				</DialogContentText>
				<Autocomplete
					freeSolo
					options={assigneeNames}
					inputValue={name}
					onInputChange={(_, value) => setName(value)}
					disabled={busy}
					renderInput={(params) => (
						<TextField
							{...params}
							autoFocus
							label="ФИО"
							margin="dense"
							fullWidth
						/>
					)}
				/>
				{error ? (
					<Alert severity="error" sx={{ mt: 1 }}>
						{error}
					</Alert>
				) : null}
			</DialogContent>
			<DialogActions>
				<Button onClick={onCancel} disabled={busy}>
					Отмена
				</Button>
				<Button
					variant="contained"
					disabled={!canSubmit}
					onClick={() => void handleSubmit()}
				>
					Сохранить
				</Button>
			</DialogActions>
		</Dialog>
	);
}
