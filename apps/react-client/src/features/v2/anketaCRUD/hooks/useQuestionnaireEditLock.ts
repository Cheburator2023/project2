import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { V2QuestionnaireEditLockDto } from "@smart-anketa/api-contract";
import {
	V2_QUESTIONNAIRE_EDIT_IDLE_TIMEOUT_MS,
	V2_QUESTIONNAIRE_EDIT_LOCK_TTL_MS,
} from "@smart-anketa/api-contract";
import {
	useAcquireV2QuestionnaireEditLock,
	useReleaseV2QuestionnaireEditLock,
	useRenewV2QuestionnaireEditLock,
} from "@react-client/common/api/queries/v2-questionnaires";
import { useQuestionnaireEditLocksStore } from "../stores/questionnaireEditLocksStore";
import { releaseV2QuestionnaireEditLockOnUnload } from "../utils/releaseV2QuestionnaireEditLockOnUnload";
import { useUserStore } from "@react-client/common/store/userStore";
import { apiErrorMessage } from "@react-client/common/api/helpers/apiErrorMessage";
import { useQueryClient } from "@tanstack/react-query";

const HEARTBEAT_MS = Math.max(
	30_000,
	Math.floor(V2_QUESTIONNAIRE_EDIT_LOCK_TTL_MS / 2),
);
const IDLE_CHECK_MS = 15_000;
const EDIT_LOCKS_QUERY_KEY = ["v2-questionnaires", "edit-locks"] as const;

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
	/** Бездействие до принудительного выхода (по умолчанию 30 мин). */
	idleTimeoutMs?: number;
};

function lockFromAxiosError(
	err: unknown,
): V2QuestionnaireEditLockDto | undefined {
	const payload = (
		err as {
			response?: {
				data?: {
					lock?: V2QuestionnaireEditLockDto;
					message?:
						| string
						| {
								lock?: V2QuestionnaireEditLockDto;
								message?: string;
						  };
				};
			};
		}
	)?.response?.data;
	return (
		payload?.lock ??
		(typeof payload?.message === "object" ? payload.message?.lock : undefined)
	);
}

/**
 * Захват / heartbeat / release блокировки редактирования анкеты.
 * При конфликте — readOnly + сообщение.
 * При бездействии idleTimeoutMs — снимаем lock и сигналим sessionTimedOut.
 */
export function useQuestionnaireEditLock({
	questionnaireId,
	enabled = true,
	idleTimeoutMs = V2_QUESTIONNAIRE_EDIT_IDLE_TIMEOUT_MS,
}: Options) {
	const qc = useQueryClient();
	const username = useUserStore((s) => s.username);
	const lockedByLabel = useMemo(
		() => (username?.trim() ? username.trim() : "Пользователь"),
		[username],
	);
	const upsertLock = useQuestionnaireEditLocksStore((s) => s.upsertLock);
	const removeLock = useQuestionnaireEditLocksStore((s) => s.removeLock);
	const acquire = useAcquireV2QuestionnaireEditLock();
	const renew = useRenewV2QuestionnaireEditLock();
	const release = useReleaseV2QuestionnaireEditLock();
	const [foreignLock, setForeignLock] = useState<V2QuestionnaireEditLockDto | null>(
		null,
	);
	const [lockError, setLockError] = useState<string | null>(null);
	/** Реактивный флаг: иначе heartbeat не стартует после async acquire. */
	const [holding, setHolding] = useState(false);
	const [sessionTimedOut, setSessionTimedOut] = useState(false);
	const heldRef = useRef(false);
	const lastActivityAtRef = useRef(Date.now());
	const labelRef = useRef(lockedByLabel);
	labelRef.current = lockedByLabel;

	const lockedByOther = Boolean(foreignLock);
	const readOnlyByLock = lockedByOther || sessionTimedOut;

	const bumpRegistryLocks = useCallback(() => {
		void qc.invalidateQueries({ queryKey: EDIT_LOCKS_QUERY_KEY });
	}, [qc]);

	const releaseHeldLock = useCallback(() => {
		if (!questionnaireId || !heldRef.current) return;
		heldRef.current = false;
		setHolding(false);
		removeLock(questionnaireId);
		release.mutate(
			{ id: questionnaireId, body: { lockedByLabel: labelRef.current } },
			{ onSettled: () => bumpRegistryLocks() },
		);
	}, [bumpRegistryLocks, questionnaireId, release, removeLock]);

	const tryAcquire = useCallback(async () => {
		if (!questionnaireId || !enabled) return false;
		try {
			const lock = await acquire.mutateAsync({
				id: questionnaireId,
				body: { lockedByLabel: labelRef.current },
			});
			heldRef.current = true;
			setHolding(true);
			setForeignLock(null);
			setLockError(null);
			setSessionTimedOut(false);
			lastActivityAtRef.current = Date.now();
			upsertLock(lock);
			bumpRegistryLocks();
			return true;
		} catch (err) {
			heldRef.current = false;
			setHolding(false);
			const message = apiErrorMessage(err);
			setLockError(message);
			const lockFromError = lockFromAxiosError(err);
			if (lockFromError) {
				setForeignLock(lockFromError);
				upsertLock(lockFromError);
			} else if (questionnaireId) {
				setForeignLock({
					questionnaireId,
					lockedByLabel: "другой пользователь",
					lockedByUserId: null,
					expiresAt: new Date(
						Date.now() + V2_QUESTIONNAIRE_EDIT_LOCK_TTL_MS,
					).toISOString(),
				});
			}
			bumpRegistryLocks();
			return false;
		}
	}, [acquire, bumpRegistryLocks, enabled, questionnaireId, upsertLock]);

	const resumeAfterTimeout = useCallback(async () => {
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
		lastActivityAtRef.current = Date.now();
		if (!questionnaireId || !enabled) return;

		void (async () => {
			try {
				const lock = await acquire.mutateAsync({
					id: questionnaireId,
					body: { lockedByLabel: labelRef.current },
				});
				if (cancelled) {
					removeLock(questionnaireId);
					release.mutate(
						{
							id: questionnaireId,
							body: { lockedByLabel: labelRef.current },
						},
						{ onSettled: () => bumpRegistryLocks() },
					);
					return;
				}
				heldRef.current = true;
				setHolding(true);
				setForeignLock(null);
				setLockError(null);
				upsertLock(lock);
				bumpRegistryLocks();
			} catch (err) {
				if (cancelled) return;
				heldRef.current = false;
				setHolding(false);
				const message = apiErrorMessage(err);
				setLockError(message);
				const lockFromError = lockFromAxiosError(err);
				if (lockFromError) {
					setForeignLock(lockFromError);
					upsertLock(lockFromError);
				} else {
					setForeignLock({
						questionnaireId,
						lockedByLabel: "другой пользователь",
						lockedByUserId: null,
						expiresAt: new Date(
							Date.now() + V2_QUESTIONNAIRE_EDIT_LOCK_TTL_MS,
						).toISOString(),
					});
				}
				bumpRegistryLocks();
			}
		})();

		return () => {
			cancelled = true;
			if (!questionnaireId || !heldRef.current) return;
			heldRef.current = false;
			setHolding(false);
			removeLock(questionnaireId);
			release.mutate(
				{ id: questionnaireId, body: { lockedByLabel: labelRef.current } },
				{ onSettled: () => bumpRegistryLocks() },
			);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps -- acquire once per id/enabled
	}, [questionnaireId, enabled]);

	useEffect(() => {
		if (!questionnaireId || !enabled || !holding || sessionTimedOut) return;
		const timer = window.setInterval(() => {
			if (!heldRef.current) return;
			renew.mutate(
				{ id: questionnaireId, body: { lockedByLabel: labelRef.current } },
				{
					onSuccess: (lock) => upsertLock(lock),
					onError: () => {
						heldRef.current = false;
						setHolding(false);
						void tryAcquire();
					},
				},
			);
		}, HEARTBEAT_MS);
		return () => window.clearInterval(timer);
	}, [
		enabled,
		holding,
		questionnaireId,
		renew,
		sessionTimedOut,
		tryAcquire,
		upsertLock,
	]);

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
		// pagehide надёжнее beforeunload; оба — на случай разных браузеров.
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
