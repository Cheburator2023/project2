import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";

type Props = {
	open: boolean;
	pending?: boolean;
	onUseCurrent: () => void;
	onKeepSource: () => void;
	onCancel: () => void;
	"data-test-id"?: string;
};

/**
 * Выбор схемы при создании версии / копии, если исходная анкета
 * привязана к устаревшей версии схемы.
 */
export function AnketaSchemaCurrencyDialog({
	open,
	pending = false,
	onUseCurrent,
	onKeepSource,
	onCancel,
	"data-test-id": dataTestId = "anketa-schema-currency-dialog",
}: Props) {
	return (
		<Dialog
			open={open}
			onClose={pending ? undefined : onCancel}
			disableEscapeKeyDown={pending}
			fullWidth
			maxWidth="sm"
			data-test-id={dataTestId}
		>
			<DialogTitle>Версия схемы</DialogTitle>
			<DialogContent>
				<DialogContentText>
					Текущая Версия смарт-анкеты построена на неактуальной Версии
					Схема-в-админке. Использовать актуальный Схема-в-админке для
					создаваемой Версии анкеты?
				</DialogContentText>
			</DialogContent>
			<DialogActions>
				<Button onClick={onCancel} disabled={pending} color="inherit">
					Отмена
				</Button>
				<Button
					onClick={onKeepSource}
					disabled={pending}
					data-test-id={`${dataTestId}--no`}
				>
					Нет
				</Button>
				<Button
					onClick={onUseCurrent}
					disabled={pending}
					variant="contained"
					data-test-id={`${dataTestId}--yes`}
				>
					Да
				</Button>
			</DialogActions>
		</Dialog>
	);
}
