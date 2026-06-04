import { toast } from "@react-client/common/toasts";

const UNDO_DURATION_MS = 30_000;

export function toastWithUndo(
	message: string,
	undo: () => void | Promise<void>,
	options?: { description?: string },
): void {
	const description = options?.description
		? `${options.description}. Отменить можно в течение 30 сек.`
		: "Отменить можно в течение 30 сек.";

	toast.success(message, {
		duration: UNDO_DURATION_MS,
		description,
		actions: [
			{
				label: "Отменить",
				countdownDurationMs: UNDO_DURATION_MS,
				onClick: () => {
					void undo();
				},
			},
			{
				label: "Точно удалить",
				title: "Подтвердить удаление и закрыть без отмены",
				onClick: () => {
					// Досрочно подтвердить удаление — закрыть тост без отмены.
				},
			},
		],
	});
}
