import { create } from "zustand";
import type { KanbanBoardTaskLockDto } from "@smart-anketa/api-contract";

type KanbanTaskLocksState = {
	locksById: Record<string, KanbanBoardTaskLockDto>;
	setLocks: (locks: KanbanBoardTaskLockDto[]) => void;
	upsertLock: (lock: KanbanBoardTaskLockDto) => void;
	removeLock: (taskId: string) => void;
};

export const useKanbanTaskLocksStore = create<KanbanTaskLocksState>((set) => ({
	locksById: {},
	setLocks: (locks) =>
		set({
			locksById: Object.fromEntries(locks.map((lock) => [lock.taskId, lock])),
		}),
	upsertLock: (lock) =>
		set((state) => ({
			locksById: { ...state.locksById, [lock.taskId]: lock },
		})),
	removeLock: (taskId) =>
		set((state) => {
			const next = { ...state.locksById };
			delete next[taskId];
			return { locksById: next };
		}),
}));
