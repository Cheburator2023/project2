import type { V2QuestionnaireEditLockDto } from "@smart-anketa/api-contract";

/**
 * Свой ли это lock (по label из userStore).
 * Без userId на клиенте — как в kanban: сравнение lockedByLabel.
 */
export function isOwnV2QuestionnaireEditLock(
	lock: V2QuestionnaireEditLockDto | null | undefined,
	username: string | null | undefined,
): boolean {
	if (!lock) return false;
	const mine = username?.trim();
	if (!mine) return false;
	return lock.lockedByLabel.trim() === mine;
}
