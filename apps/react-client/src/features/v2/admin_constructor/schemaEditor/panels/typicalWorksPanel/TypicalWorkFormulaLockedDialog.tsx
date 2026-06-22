import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Typography from "@mui/material/Typography";

type TypicalWorkFormulaLockedDialogProps = {
	open: boolean;
	pending: boolean;
	onClose: () => void;
	onCreateDraft: () => void;
};

export function TypicalWorkFormulaLockedDialog({
	open,
	pending,
	onClose,
	onCreateDraft,
}: TypicalWorkFormulaLockedDialogProps) {
	return (
		<Dialog open={open} onClose={pending ? undefined : onClose} maxWidth="sm" fullWidth>
			<DialogTitle>Формула заблокирована</DialogTitle>
			<DialogContent>
				<Typography variant="body2" color="text.secondary">
					Формула и округление опубликованной версии шаблона нельзя изменить напрямую.
					Создайте минорную версию черновика — изменения формулы будут сохранены в ней.
				</Typography>
			</DialogContent>
			<DialogActions>
				<Button onClick={onClose} disabled={pending}>
					Отмена
				</Button>
				<Button variant="contained" onClick={onCreateDraft} disabled={pending}>
					Создать черновик
				</Button>
			</DialogActions>
		</Dialog>
	);
}
