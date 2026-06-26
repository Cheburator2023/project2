import { defaultToolbarButtons } from "@svar-ui/react-gantt";

const TRACKER_GANTT_DISABLED_TOOLBAR_IDS = new Set([
	"add-task",
	"edit-task",
	"delete-task",
	"copy-task",
	"cut-task",
	"paste-task",
]);

/** Без создания/удаления/копирования — задачи живут в реестре трекера. */
export const TRACKER_GANTT_TOOLBAR_ITEMS = defaultToolbarButtons.filter(
	(item) => !item.id || !TRACKER_GANTT_DISABLED_TOOLBAR_IDS.has(item.id),
);
