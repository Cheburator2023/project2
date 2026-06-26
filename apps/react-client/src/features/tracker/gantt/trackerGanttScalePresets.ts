import type { IScaleConfig } from "@svar-ui/react-gantt";

export type TrackerGanttScalePresetId = "day" | "week" | "month" | "quarter";

export type TrackerGanttScalePreset = {
	id: TrackerGanttScalePresetId;
	label: string;
	cellWidth: number;
	scales: IScaleConfig[];
};

export const TRACKER_GANTT_SCALE_PRESETS: TrackerGanttScalePreset[] = [
	{
		id: "day",
		label: "Дни",
		cellWidth: 36,
		scales: [
			{ unit: "month", step: 1, format: "%F %Y" },
			{ unit: "day", step: 1, format: "%d" },
		],
	},
	{
		id: "week",
		label: "Недели",
		cellWidth: 48,
		scales: [
			{ unit: "month", step: 1, format: "%F %Y" },
			{ unit: "week", step: 1, format: "Нед. %w" },
		],
	},
	{
		id: "month",
		label: "Месяцы",
		cellWidth: 64,
		scales: [
			{ unit: "year", step: 1, format: "%Y" },
			{ unit: "month", step: 1, format: "%F" },
		],
	},
	{
		id: "quarter",
		label: "Кварталы",
		cellWidth: 72,
		scales: [
			{ unit: "year", step: 1, format: "%Y" },
			{ unit: "quarter", step: 1, format: "%Q" },
		],
	},
];

export const TRACKER_GANTT_SCALE_PRESET_DEFAULT: TrackerGanttScalePresetId = "week";

export function resolveTrackerGanttScalePreset(
	id: TrackerGanttScalePresetId,
): TrackerGanttScalePreset {
	return (
		TRACKER_GANTT_SCALE_PRESETS.find((preset) => preset.id === id) ??
		TRACKER_GANTT_SCALE_PRESETS.find(
			(preset) => preset.id === TRACKER_GANTT_SCALE_PRESET_DEFAULT,
		)!
	);
}
