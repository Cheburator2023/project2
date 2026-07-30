import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { V2QuestionnaireEditLockDto } from "@smart-anketa/api-contract";
import { V2_QUESTIONNAIRE_EDIT_LOCK_TTL_MS } from "@smart-anketa/api-contract";
import {
	useAcquireV2QuestionnaireEditLock,
	useReleaseV2QuestionnaireEditLock,
	useRenewV2QuestionnaireEditLock,
} from "@react-client/common/api/queries/v2-questionnaires";
import { useQuestionnaireEditLocksStore } from "../stores/questionnaireEditLocksStore";
import { useUserStore } from "@react-client/common/store/userStore";
import { apiErrorMessage } from "@react-client/common/api/helpers/apiErrorMessage";
import { useQueryClient } from "@tanstack/react-query";

const HEARTBEAT_MS = Math.max(
	30_000,
	Math.floor(V2_QUESTIONNAIRE_EDIT_LOCK_TTL_MS / 2),
);
const EDIT_LOCKS_QUERY_KEY = ["v2-questionnaires", "edit-locks"] as const;

type Options = {
	questionnaireId: string | null | undefined;
	enabled?: boolean;
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
 */
export function useQuestionnaireEditLock({
	questionnaireId,
	enabled = true,
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
	const heldRef = useRef(false);
	const labelRef = useRef(lockedByLabel);
	labelRef.current = lockedByLabel;

	const lockedByOther = Boolean(foreignLock);
	const readOnlyByLock = lockedByOther;

	const bumpRegistryLocks = useCallback(() => {
		void qc.invalidateQueries({ queryKey: EDIT_LOCKS_QUERY_KEY });
	}, [qc]);

	const tryAcquire = useCallback(async () => {
		if (!questionnaireId || !enabled) return;
		try {
			const lock = await acquire.mutateAsync({
				id: questionnaireId,
				body: { lockedByLabel: labelRef.current },
			});
			heldRef.current = true;
			setHolding(true);
			setForeignLock(null);
			setLockError(null);
			upsertLock(lock);
			bumpRegistryLocks();
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
		}
	}, [acquire, bumpRegistryLocks, enabled, questionnaireId, upsertLock]);

	useEffect(() => {
		heldRef.current = false;
		setHolding(false);
		setForeignLock(null);
		setLockError(null);
		if (!questionnaireId || !enabled) return;

		void tryAcquire();

		return () => {
			if (!questionnaireId || !heldRef.current) return;
			heldRef.current = false;
			setHolding(false);
			release.mutate(
				{ id: questionnaireId, body: { lockedByLabel: labelRef.current } },
				{
					onSuccess: () => {
						removeLock(questionnaireId);
						void qc.invalidateQueries({ queryKey: EDIT_LOCKS_QUERY_KEY });
					},
				},
			);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps -- acquire once per id/enabled
	}, [questionnaireId, enabled]);

	useEffect(() => {
		if (!questionnaireId || !enabled || !holding) return;
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
	}, [enabled, holding, questionnaireId, renew, tryAcquire, upsertLock]);

	useEffect(() => {
		if (!questionnaireId) return;
		const onUnload = () => {
			if (!heldRef.current) return;
			void release.mutateAsync({
				id: questionnaireId,
				body: { lockedByLabel: labelRef.current },
			});
		};
		window.addEventListener("pagehide", onUnload);
		return () => window.removeEventListener("pagehide", onUnload);
	}, [questionnaireId, release]);

	return {
		readOnlyByLock,
		foreignLock,
		lockError,
		lockedByLabel: foreignLock?.lockedByLabel ?? null,
	};
}
