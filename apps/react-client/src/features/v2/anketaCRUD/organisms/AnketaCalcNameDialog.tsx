import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import TextField from "@mui/material/TextField";
import { useEffect, useState } from "react";
import {
	isQuestionnaireCalcNameValid,
	normalizeQuestionnaireCalcName,
} from "../utils/anketaQuestionnaireMeta.util";

type Props = {
	open: boolean;
	title: string;
	confirmLabel?: string;
	cancelLabel?: string;
	initialCalcName?: string;
	helperText?: string;
	pending?: boolean;
	onCancel: () => void;
	onConfirm: (calcName: string) => void;
	"data-test-id"?: string;
};

/** Диалог ввода названия анкеты (создание, копия, версия, переименование). */
export function AnketaCalcNameDialog({
	open,
	title,
	confirmLabel = "Продолжить",
	cancelLabel = "Отмена",
	initialCalcName = "",
	helperText = "Название отображается в реестре и используется как заголовок анкеты",
	pending = false,
	onCancel,
	onConfirm,
	"data-test-id": dataTestId = "anketa-calc-name-dialog",
}: Props) {
	const [calcName, setCalcName] = useState(initialCalcName);
	const [touched, setTouched] = useState(false);

	useEffect(() => {
		if (!open) return;
		setCalcName(initialCalcName);
		setTouched(false);
	}, [open, initialCalcName]);

	const trimmed = normalizeQuestionnaireCalcName(calcName);
	const valid = isQuestionnaireCalcNameValid(calcName);
	const showError = touched && !valid;

	const handleConfirm = () => {
		setTouched(true);
		if (!valid || pending) return;
		onConfirm(trimmed);
	};

	return (
		<Dialog
			open={open}
			onClose={(_event, reason) => {
				if (pending) return;
				if (reason === "backdropClick" || reason === "escapeKeyDown") return;
				onCancel();
			}}
			maxWidth="sm"
			fullWidth
			disableEscapeKeyDown={pending}
			data-test-id={dataTestId}
		>
			<DialogTitle>{title}</DialogTitle>
			<DialogContent>
				<TextField
					autoFocus
					fullWidth
					required
					margin="dense"
					label="Название анкеты"
					value={calcName}
					onChange={(event) => setCalcName(event.target.value)}
					onBlur={() => setTouched(true)}
					error={showError}
					disabled={pending}
					helperText={
						showError
							? "Укажите название (от 1 до 255 символов)"
							: helperText
					}
					inputProps={{ maxLength: 255, "data-test-id": "anketa-calc-name-input" }}
					onKeyDown={(event) => {
						if (event.key === "Enter") {
							event.preventDefault();
							handleConfirm();
						}
					}}
					data-test-id={`${dataTestId}--calc-name`}
				/>
			</DialogContent>
			<DialogActions>
				<Button
					onClick={onCancel}
					disabled={pending}
					data-test-id={`${dataTestId}--cancel`}
				>
					{cancelLabel}
				</Button>
				<Button
					variant="contained"
					disabled={!valid || pending}
					onClick={handleConfirm}
					data-test-id={`${dataTestId}--confirm`}
				>
					{confirmLabel}
				</Button>
			</DialogActions>
		</Dialog>
	);
}
