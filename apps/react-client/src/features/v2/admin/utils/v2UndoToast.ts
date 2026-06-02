import { toast } from "@react-client/common/toasts";

const UNDO_DURATION_MS = 30_000;

export function toastWithUndo(
	message: string,
	undo: () => void | Promise<void>,
	options?: { description?: string },
): void {
	toast.success(message, {
		duration: UNDO_DURATION_MS,
		description: options?.description,
		actions: [
			{
				label: "Отменить",
				countdownDurationMs: UNDO_DURATION_MS,
				onClick: () => {
					void undo();
				},
			},
			{
				label: "Удалить",
				title: "Подтвердить удаление и закрыть без отмены",
				onClick: () => {
					// Досрочно подтвердить удаление — закрыть тост без отмены.
				},
			},
		],
	});
}
