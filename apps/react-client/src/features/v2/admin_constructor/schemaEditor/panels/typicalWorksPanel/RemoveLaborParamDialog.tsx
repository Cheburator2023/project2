import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Typography from "@mui/material/Typography";

type RemoveLaborParamDialogProps = {
	open: boolean;
	paramName: string;
	pending?: boolean;
	onClose: () => void;
	onConfirm: () => void;
};

export function RemoveLaborParamDialog({
	open,
	paramName,
	pending = false,
	onClose,
	onConfirm,
}: RemoveLaborParamDialogProps) {
	return (
		<Dialog open={open} onClose={pending ? undefined : onClose} maxWidth="xs" fullWidth>
			<DialogTitle>Удалить параметр трудоёмкости?</DialogTitle>
			<DialogContent>
				<Typography variant="body2" color="text.secondary">
					«{paramName}» используется в формуле. После удаления ссылка в формуле будет
					помечена как невалидная, а превью расчёта покажет ошибку, пока вы не
					исправите формулу.
				</Typography>
			</DialogContent>
			<DialogActions>
				<Button onClick={onClose} disabled={pending}>
					Отмена
				</Button>
				<Button color="error" variant="contained" disabled={pending} onClick={onConfirm}>
					Удалить
				</Button>
			</DialogActions>
		</Dialog>
	);
}
