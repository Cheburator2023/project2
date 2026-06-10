import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Typography from "@mui/material/Typography";
import { V2_TEMPLATE_EDIT_TEST_IDS } from "../testIds";

type Props = {
	open: boolean;
	onStay: () => void;
	onLeave: () => void;
};

export function SchemaEditorLeaveDialog({ open, onStay, onLeave }: Props) {
	return (
		<Dialog
			open={open}
			onClose={onStay}
			maxWidth="xs"
			fullWidth
			data-test-id={V2_TEMPLATE_EDIT_TEST_IDS.editorLeaveConfirm}
		>
			<DialogTitle>Несохранённые изменения</DialogTitle>
			<DialogContent>
				<Typography variant="body2">
					Черновик сохранён в браузере, но на сервер он ещё не записан. Уйти со
					страницы без сохранения на сервер?
				</Typography>
			</DialogContent>
			<DialogActions>
				<Button onClick={onStay}>Остаться</Button>
				<Button
					variant="contained"
					color="warning"
					data-test-id={V2_TEMPLATE_EDIT_TEST_IDS.editorLeaveConfirmSubmit}
					onClick={onLeave}
				>
					Уйти без сохранения
				</Button>
			</DialogActions>
		</Dialog>
	);
}
