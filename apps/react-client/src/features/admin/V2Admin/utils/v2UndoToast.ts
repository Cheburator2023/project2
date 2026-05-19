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
		action: {
			label: "Отменить",
			countdownDurationMs: UNDO_DURATION_MS,
			onClick: () => {
				void undo();
			},
		},
	});
}
