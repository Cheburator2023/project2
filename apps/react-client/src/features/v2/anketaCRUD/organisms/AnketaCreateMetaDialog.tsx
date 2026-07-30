import { AnketaCalcNameDialog } from "./AnketaCalcNameDialog";

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
	return (
		<AnketaCalcNameDialog
			open={open}
			title="Новая анкета"
			confirmLabel="Создать"
			onCancel={onCancel}
			onConfirm={onConfirm}
			data-test-id={dataTestId}
		/>
	);
}
