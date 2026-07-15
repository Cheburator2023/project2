import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import TextField from "@mui/material/TextField";
import { useState } from "react";
import {
	isQuestionnaireCalcNameValid,
	normalizeQuestionnaireCalcName,
} from "../utils/anketaQuestionnaireMeta.util";

type Props = {
	open: boolean;
	onCancel: () => void;
	onConfirm: (calcName: string) => void;
	"data-test-id"?: string;
};

/** Обязательный ввод названия анкеты до открытия формы (вне схемы шаблона). */
export function AnketaCreateMetaDialog({
	open,
	onCancel,
	onConfirm,
	"data-test-id": dataTestId = "anketa-create-meta-dialog",
}: Props) {
	const [calcName, setCalcName] = useState("");
	const [touched, setTouched] = useState(false);

	const trimmed = normalizeQuestionnaireCalcName(calcName);
	const valid = isQuestionnaireCalcNameValid(calcName);
	const showError = touched && !valid;

	const handleConfirm = () => {
		setTouched(true);
		if (!valid) return;
		onConfirm(trimmed);
	};

	return (
		<Dialog
			open={open}
			onClose={(_event, reason) => {
				if (reason === "backdropClick" || reason === "escapeKeyDown") return;
				onCancel();
			}}
			maxWidth="sm"
			fullWidth
			disableEscapeKeyDown
			data-test-id={dataTestId}
		>
			<DialogTitle>Новая анкета</DialogTitle>
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
					helperText={
						showError
							? "Укажите название (от 1 до 255 символов)"
							: "Название отображается в реестре и используется как заголовок анкеты"
					}
					inputProps={{ maxLength: 255 }}
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
				<Button onClick={onCancel} data-test-id={`${dataTestId}--cancel`}>
					Отмена
				</Button>
				<Button
					variant="contained"
					disabled={!valid}
					onClick={handleConfirm}
					data-test-id={`${dataTestId}--confirm`}
				>
					Продолжить
				</Button>
			</DialogActions>
		</Dialog>
	);
}
