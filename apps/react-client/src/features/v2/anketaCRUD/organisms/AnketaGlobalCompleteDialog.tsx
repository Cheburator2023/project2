import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import Stack from "@mui/material/Stack";
import { V2_ANKETA_GLOBAL_COMPLETE_LABEL } from "@smart-anketa/api-contract";

export type AnketaGlobalCompleteDialogPhase = "confirm" | "next";

type Props = {
	open: boolean;
	phase: AnketaGlobalCompleteDialogPhase;
	onClose: () => void;
	canSave: boolean;
	savePending?: boolean;
	hasQuestionnaireId: boolean;
	createCopyPending?: boolean;
	onConfirmComplete: () => void;
	onConfirmCompleteAndSave: () => void;
	onSave: () => void;
	onCreateCopy: () => void;
	onNewVersion: () => void;
	onGoToRegistry: () => void;
	"data-test-id"?: string;
};

export function AnketaGlobalCompleteDialog({
	open,
	phase,
	onClose,
	canSave,
	savePending = false,
	hasQuestionnaireId,
	createCopyPending = false,
	onConfirmComplete,
	onConfirmCompleteAndSave,
	onSave,
	onCreateCopy,
	onNewVersion,
	onGoToRegistry,
	"data-test-id": dataTestId = "anketa-global-complete-dialog",
}: Props) {
	const busy = savePending || createCopyPending;

	if (phase === "next") {
		return (
			<Dialog
				open={open}
				onClose={onClose}
				maxWidth="sm"
				fullWidth
				data-test-id={dataTestId}
			>
				<DialogTitle>Анкета заполнена</DialogTitle>
				<DialogContent>
					<DialogContentText sx={{ mb: 2 }}>
						Статус анкеты — «Заполнено». Редактирование полей заблокировано.
						Выберите дальнейшее действие.
					</DialogContentText>
					<Stack spacing={1}>
						{canSave ? (
							<Button
								variant="outlined"
								disabled={busy}
								onClick={onSave}
								data-test-id={`${dataTestId}--save`}
							>
								Сохранить анкету
							</Button>
						) : null}
						{hasQuestionnaireId ? (
							<>
								<Button
									variant="outlined"
									disabled={busy}
									onClick={onCreateCopy}
									data-test-id={`${dataTestId}--copy`}
								>
									Создать копию (черновик)
								</Button>
								<Button
									variant="outlined"
									disabled={busy}
									onClick={onNewVersion}
									data-test-id={`${dataTestId}--new-version`}
								>
									Новая версия анкеты
								</Button>
							</>
						) : null}
						<Button
							variant="outlined"
							disabled={busy}
							onClick={onGoToRegistry}
							data-test-id={`${dataTestId}--registry`}
						>
							Перейти в реестр анкет
						</Button>
					</Stack>
				</DialogContent>
				<DialogActions>
					<Button onClick={onClose} disabled={busy} data-test-id={`${dataTestId}--stay`}>
						Остаться на странице
					</Button>
				</DialogActions>
			</Dialog>
		);
	}

	return (
		<Dialog
			open={open}
			onClose={onClose}
			maxWidth="sm"
			fullWidth
			data-test-id={dataTestId}
		>
			<DialogTitle>{V2_ANKETA_GLOBAL_COMPLETE_LABEL}?</DialogTitle>
			<DialogContent>
				<DialogContentText>
					Все основные разделы подтверждены. После завершения анкета перейдёт в
					статус «Заполнено», редактирование полей будет заблокировано. Для
					корректировки данных создайте копию или новую версию анкеты.
				</DialogContentText>
			</DialogContent>
			<DialogActions sx={{ flexWrap: "wrap", gap: 1, px: 3, pb: 2 }}>
				<Button onClick={onClose} disabled={busy} data-test-id={`${dataTestId}--cancel`}>
					Отмена
				</Button>
				<Button
					variant="outlined"
					disabled={busy}
					onClick={onConfirmComplete}
					data-test-id={`${dataTestId}--complete`}
				>
					Завершить
				</Button>
				{canSave ? (
					<Button
						variant="contained"
						disabled={busy}
						onClick={onConfirmCompleteAndSave}
						data-test-id={`${dataTestId}--complete-and-save`}
					>
						Завершить и сохранить
					</Button>
				) : (
					<Button
						variant="contained"
						disabled={busy}
						onClick={onConfirmComplete}
						data-test-id={`${dataTestId}--complete-primary`}
					>
						Завершить
					</Button>
				)}
			</DialogActions>
		</Dialog>
	);
}
