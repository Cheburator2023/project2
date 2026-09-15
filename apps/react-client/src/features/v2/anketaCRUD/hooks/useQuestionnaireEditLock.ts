import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { V2QuestionnaireEditLockDto } from "@smart-anketa/api-contract";
import {
	V2_EDIT_LOCK_WS_EVENTS,
	V2_QUESTIONNAIRE_EDIT_IDLE_TIMEOUT_MS,
	type V2EditLockChangedPayload,
} from "@smart-anketa/api-contract";
import { useQuestionnaireEditLocksStore } from "../stores/questionnaireEditLocksStore";
import { releaseV2QuestionnaireEditLockOnUnload } from "../utils/releaseV2QuestionnaireEditLockOnUnload";
import {
	connectV2EditLockSocket,
	joinV2QuestionnaireEditLock,
	leaveV2QuestionnaireEditLock,
} from "../utils/v2EditLockSocket";
import {
	isForeignV2EditLockJoinDenial,
	isOwnV2QuestionnaireEditLock,
} from "../utils/isOwnV2QuestionnaireEditLock";
import { useUserStore } from "@react-client/common/store/userStore";

const IDLE_CHECK_MS = 15_000;

const ACTIVITY_EVENTS = [
	"pointerdown",
	"keydown",
	"touchstart",
	"scroll",
	"mousemove",
] as const;

type Options = {
	questionnaireId: string | null | undefined;
	enabled?: boolean;
	/** Бездействие до принудительного выхода (по умолчанию 3 мин). */
	idleTimeoutMs?: number;
};

/**
 * Occupancy через Socket.IO: join при входе, leave / disconnect снимает lock.
 * HTTP-heartbeat больше не нужен — TTL продлевает сервер, пока сокет жив.
 */
export function useQuestionnaireEditLock({
	questionnaireId,
	enabled = true,
	idleTimeoutMs = V2_QUESTIONNAIRE_EDIT_IDLE_TIMEOUT_MS,
}: Options) {
	const username = useUserStore((s) => s.username);
	const lockedByLabel = useMemo(
		() => (username?.trim() ? username.trim() : "Пользователь"),
		[username],
	);
	const upsertLock = useQuestionnaireEditLocksStore((s) => s.upsertLock);
	const removeLock = useQuestionnaireEditLocksStore((s) => s.removeLock);
	const [foreignLock, setForeignLock] = useState<V2QuestionnaireEditLockDto | null>(
		null,
	);
	const [lockError, setLockError] = useState<string | null>(null);
	const [holding, setHolding] = useState(false);
	const [sessionTimedOut, setSessionTimedOut] = useState(false);
	const heldRef = useRef(false);
	const lastActivityAtRef = useRef(Date.now());
	const labelRef = useRef(lockedByLabel);
	const sessionTimedOutRef = useRef(false);
	labelRef.current = lockedByLabel;

	const lockedByOther = Boolean(foreignLock);
	const readOnlyByLock = lockedByOther || sessionTimedOut;

	const applyDenied = useCallback(
		(lock: V2QuestionnaireEditLockDto | undefined, message: string) => {
			heldRef.current = false;
			setHolding(false);
			setLockError(message);
			const occupancy =
				lock ??
				(questionnaireId
					? {
							questionnaireId,
							lockedByLabel: "другой пользователь",
							lockedByUserId: null,
							expiresAt: new Date(Date.now() + 60_000).toISOString(),
						}
					: null);
			setForeignLock(occupancy);
			if (lock) upsertLock(lock);
		},
		[questionnaireId, upsertLock],
	);

	const tryAcquire = useCallback(async () => {
		if (!questionnaireId || !enabled) return false;
		try {
			let ack = await joinV2QuestionnaireEditLock(
				questionnaireId,
				labelRef.current,
			);
			for (let attempt = 0; attempt < 4; attempt += 1) {
				if (
					!ack ||
					ack.ok ||
					ack.lock ||
					(ack.reason !== "not_found" &&
						ack.message !== "Анкета не найдена")
				) {
					break;
				}
				await new Promise((resolve) => {
					window.setTimeout(resolve, 200 * (attempt + 1));
				});
				ack = await joinV2QuestionnaireEditLock(
					questionnaireId,
					labelRef.current,
				);
			}
			if (!ack.ok) {
				if (isForeignV2EditLockJoinDenial(ack)) {
					applyDenied(ack.lock, ack.message);
					return false;
				}
				heldRef.current = false;
				setHolding(false);
				setLockError(ack.message || "Не удалось захватить анкету");
				return false;
			}
			heldRef.current = true;
			setHolding(true);
			setForeignLock(null);
			setLockError(null);
			setSessionTimedOut(false);
			lastActivityAtRef.current = Date.now();
			upsertLock(ack.lock);
			return true;
		} catch (err) {
			heldRef.current = false;
			setHolding(false);
			setLockError(
				err instanceof Error ? err.message : "Не удалось захватить анкету",
			);
			return false;
		}
	}, [applyDenied, enabled, questionnaireId, upsertLock]);

	const releaseHeldLock = useCallback(() => {
		if (!questionnaireId || !heldRef.current) return;
		heldRef.current = false;
		setHolding(false);
		removeLock(questionnaireId);
		void leaveV2QuestionnaireEditLock(questionnaireId);
	}, [questionnaireId, removeLock]);

	const resumeAfterTimeout = useCallback(async () => {
		sessionTimedOutRef.current = false;
		setSessionTimedOut(false);
		return tryAcquire();
	}, [tryAcquire]);

	useEffect(() => {
		let cancelled = false;
		heldRef.current = false;
		setHolding(false);
		setForeignLock(null);
		setLockError(null);
		setSessionTimedOut(false);
		sessionTimedOutRef.current = false;
		lastActivityAtRef.current = Date.now();
		if (!questionnaireId || !enabled) return;

		void (async () => {
			const ok = await tryAcquire();
			if (cancelled && ok) {
				heldRef.current = false;
				setHolding(false);
				removeLock(questionnaireId);
				void leaveV2QuestionnaireEditLock(questionnaireId);
			}
		})();

		return () => {
			cancelled = true;
			if (!questionnaireId || !heldRef.current) return;
			heldRef.current = false;
			setHolding(false);
			removeLock(questionnaireId);
			void leaveV2QuestionnaireEditLock(questionnaireId);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps -- acquire once per id/enabled
	}, [questionnaireId, enabled]);

	useEffect(() => {
		if (!questionnaireId || !enabled) return;
		const client = connectV2EditLockSocket(labelRef.current);

		const onReconnect = () => {
			if (sessionTimedOutRef.current) return;
			void tryAcquire();
		};
		const onChanged = (payload: V2EditLockChangedPayload) => {
			if (payload.type === "export") return;
			if (payload.type === "released") {
				if (payload.questionnaireId !== questionnaireId) return;
				if (heldRef.current || sessionTimedOutRef.current) return;
				setForeignLock(null);
				void tryAcquire();
				return;
			}
			if (payload.lock.questionnaireId !== questionnaireId) return;
			if (isOwnV2QuestionnaireEditLock(payload.lock, labelRef.current)) return;
			if (heldRef.current) return;
			setForeignLock(payload.lock);
		};

		client.io.on("reconnect", onReconnect);
		client.on(V2_EDIT_LOCK_WS_EVENTS.changed, onChanged);
		return () => {
			client.io.off("reconnect", onReconnect);
			client.off(V2_EDIT_LOCK_WS_EVENTS.changed, onChanged);
		};
	}, [enabled, questionnaireId, tryAcquire]);

	useEffect(() => {
		if (!questionnaireId || !enabled || !holding || sessionTimedOut) return;

		const markActivity = () => {
			lastActivityAtRef.current = Date.now();
		};
		for (const eventName of ACTIVITY_EVENTS) {
			window.addEventListener(eventName, markActivity, {
				passive: true,
				capture: true,
			});
		}

		const timer = window.setInterval(() => {
			if (!heldRef.current) return;
			if (Date.now() - lastActivityAtRef.current < idleTimeoutMs) return;
			releaseHeldLock();
			sessionTimedOutRef.current = true;
			setSessionTimedOut(true);
		}, IDLE_CHECK_MS);

		return () => {
			window.clearInterval(timer);
			for (const eventName of ACTIVITY_EVENTS) {
				window.removeEventListener(eventName, markActivity, true);
			}
		};
	}, [
		enabled,
		holding,
		idleTimeoutMs,
		questionnaireId,
		releaseHeldLock,
		sessionTimedOut,
	]);

	useEffect(() => {
		if (!questionnaireId) return;
		const onUnload = () => {
			if (!heldRef.current) return;
			heldRef.current = false;
			setHolding(false);
			removeLock(questionnaireId);
			releaseV2QuestionnaireEditLockOnUnload(
				questionnaireId,
				labelRef.current,
			);
		};
		window.addEventListener("pagehide", onUnload);
		window.addEventListener("beforeunload", onUnload);
		return () => {
			window.removeEventListener("pagehide", onUnload);
			window.removeEventListener("beforeunload", onUnload);
		};
	}, [questionnaireId, removeLock]);

	return {
		readOnlyByLock,
		foreignLock,
		lockError,
		lockedByLabel: foreignLock?.lockedByLabel ?? null,
		sessionTimedOut,
		resumeAfterTimeout,
	};
}
