import { create } from "zustand";
import type { V2QuestionnaireEditLockDto } from "@smart-anketa/api-contract";

type QuestionnaireEditLocksState = {
	locksById: Record<string, V2QuestionnaireEditLockDto>;
	setLocks: (locks: V2QuestionnaireEditLockDto[]) => void;
	upsertLock: (lock: V2QuestionnaireEditLockDto) => void;
	removeLock: (questionnaireId: string) => void;
};

export const useQuestionnaireEditLocksStore = create<QuestionnaireEditLocksState>(
	(set) => ({
		locksById: {},
		setLocks: (locks) =>
			set({
				locksById: Object.fromEntries(
					locks.map((lock) => [lock.questionnaireId, lock]),
				),
			}),
		upsertLock: (lock) =>
			set((state) => ({
				locksById: { ...state.locksById, [lock.questionnaireId]: lock },
			})),
		removeLock: (questionnaireId) =>
			set((state) => {
				const next = { ...state.locksById };
				delete next[questionnaireId];
				return { locksById: next };
			}),
	}),
);
