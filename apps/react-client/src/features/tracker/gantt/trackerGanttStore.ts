import type { ITask, TID } from "@svar-ui/react-gantt";
import { create } from "zustand";
import { TRACKER_GANTT_COLUMNS } from "./trackerGanttConfig";

interface TrackerGanttStore {
	tasks: ITask[];
	columns: typeof TRACKER_GANTT_COLUMNS;
	selectedTaskId: TID | null;
	setTasks: (tasks: ITask[]) => void;
	taskSelected: (ev: { id: TID }) => void;
	clearSelection: () => void;
}

/** Данные для Gantt: initial load + фильтры. Runtime-состояние остаётся в компоненте Gantt. */
export const useTrackerGanttStore = create<TrackerGanttStore>()((set) => ({
	tasks: [],
	columns: TRACKER_GANTT_COLUMNS,
	selectedTaskId: null,
	setTasks: (tasks) => set({ tasks }),
	taskSelected: ({ id }) => set({ selectedTaskId: id }),
	clearSelection: () => set({ selectedTaskId: null }),
}));
