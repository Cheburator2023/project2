import type { V2EditLockJoinAck, V2QuestionnaireEditLockDto } from "@smart-anketa/api-contract";

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

/**
 * Чужой редактор — только если сервер прислал lock.
 * «Анкета не найдена» без lock — не occupancy, иначе баннер «другой пользователь».
 */
export function isForeignV2EditLockJoinDenial(
	ack: V2EditLockJoinAck,
): ack is Extract<V2EditLockJoinAck, { ok: false }> & {
	lock: V2QuestionnaireEditLockDto;
} {
	return !ack.ok && Boolean(ack.lock) && ack.reason !== "not_found";
}
