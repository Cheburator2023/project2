import type { IColumnConfig } from "@svar-ui/react-gantt";

/** Компактная сетка: даты на таймлайне, не дублируем в колонках. */
export const TRACKER_GANTT_COLUMNS: IColumnConfig[] = [
	{ id: "text", header: "Задача", flexgrow: 1, resize: true },
	{ id: "duration", header: "Дн.", width: 52, resize: true },
];

export const TRACKER_GANTT_GRID_WIDTH = 320;
export const TRACKER_GANTT_TIMELINE_PADDING_DAYS = 7;
export const TRACKER_GANTT_MAX_TIMELINE_DAYS = 90;

/** MainLayout padding: 8px сверху и снизу. */
export const TRACKER_GANTT_PAGE_HEIGHT = "calc(100dvh - 16px)";
export const TRACKER_GANTT_BORDER_RADIUS = 8;
