import {
	useAcquireKanbanBoardTaskLock,
	useKanbanBoardTaskLock,
	useReleaseKanbanBoardTaskLock,
	useRenewKanbanBoardTaskLock,
} from "@react-client/common/api/queries/kanban-board";
import { publishAppSync } from "@react-client/common/crossTab/appBroadcast";
import {
	KANBAN_BOARD_TASK_EDIT_IDLE_TIMEOUT_MS,
	KANBAN_BOARD_TASK_LOCK_TTL_MS,
	parseKanbanBoardTaskEditBlockedError,
	type KanbanBoardTaskLockDto,
} from "@smart-anketa/api-contract";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTrackerEditIdentity } from "./useTrackerEditIdentity";

const RENEW_MS = Math.max(30_000, Math.floor(KANBAN_BOARD_TASK_LOCK_TTL_MS / 2));
const IDLE_CHECK_MS = 15_000;
const ACTIVITY_EVENTS = [
	"pointerdown",
	"keydown",
	"touchstart",
	"scroll",
	"mousemove",
] as const;

type Options = {
	idleTimeoutMs?: number;
	onIdleTimeout?: () => void;
};

export function useKanbanTaskEditLock(
	taskId: string | undefined,
	enabled: boolean,
	options: Options = {},
) {
	const {
		idleTimeoutMs = KANBAN_BOARD_TASK_EDIT_IDLE_TIMEOUT_MS,
		onIdleTimeout,
	} = options;
	const editLabel = useTrackerEditIdentity();
	const lockQuery = useKanbanBoardTaskLock(enabled ? taskId : undefined);
	const acquireLock = useAcquireKanbanBoardTaskLock();
	const renewLock = useRenewKanbanBoardTaskLock();
	const releaseLock = useReleaseKanbanBoardTaskLock();
	const holderRef = useRef(editLabel);
	const heldRef = useRef(false);
	const [holding, setHolding] = useState(false);
	const [blockedLock, setBlockedLock] = useState<KanbanBoardTaskLockDto | null>(
		null,
	);
	const [sessionTimedOut, setSessionTimedOut] = useState(false);
	const lastActivityAtRef = useRef(Date.now());
	const lastAcquireAtRef = useRef(0);
	const onIdleTimeoutRef = useRef(onIdleTimeout);
	onIdleTimeoutRef.current = onIdleTimeout;

	useEffect(() => {
		holderRef.current = editLabel;
	}, [editLabel]);

	const releaseHeldLock = useCallback(() => {
		if (!taskId || !heldRef.current || !holderRef.current) return;
		heldRef.current = false;
		setHolding(false);
		const label = holderRef.current;
		void releaseLock
			.mutateAsync({
				taskId,
				data: { lockedByLabel: label },
			})
			.then(() => {
				publishAppSync({
					type: "tracker:lock-changed",
					taskId,
					action: "released",
				});
			})
			.catch(() => undefined);
	}, [releaseLock, taskId]);

	const tryAcquire = useCallback(async () => {
		if (!enabled || !taskId || !editLabel || sessionTimedOut) return false;
		const now = Date.now();
		if (now - lastAcquireAtRef.current < 2_500) return false;
		lastAcquireAtRef.current = now;
		try {
			await acquireLock.mutateAsync({
				taskId,
				data: { lockedByLabel: editLabel },
			});
			heldRef.current = true;
			setHolding(true);
			setBlockedLock(null);
			lastActivityAtRef.current = Date.now();
			publishAppSync({
				type: "tracker:lock-changed",
				taskId,
				action: "acquired",
			});
			return true;
		} catch (error) {
			heldRef.current = false;
			setHolding(false);
			const blocked = parseKanbanBoardTaskEditBlockedError(error);
			if (blocked?.reason === "lock") {
				setBlockedLock(
					blocked.lock ?? {
						taskId,
						lockedByLabel: "другой пользователь",
						lockedByUserId: null,
						expiresAt: new Date(
							Date.now() + KANBAN_BOARD_TASK_LOCK_TTL_MS,
						).toISOString(),
					},
				);
				publishAppSync({
					type: "tracker:lock-changed",
					taskId,
					action: "blocked",
				});
			}
			return false;
		}
	}, [acquireLock, editLabel, enabled, sessionTimedOut, taskId]);

	useEffect(() => {
		heldRef.current = false;
		setHolding(false);
		setBlockedLock(null);
		setSessionTimedOut(false);
		lastActivityAtRef.current = Date.now();
		if (!enabled || !taskId || !editLabel) return;

		void tryAcquire();

		return () => {
			if (!heldRef.current) return;
			heldRef.current = false;
			setHolding(false);
			const label = holderRef.current;
			if (!label) return;
			void releaseLock
				.mutateAsync({
					taskId,
					data: { lockedByLabel: label },
				})
				.then(() => {
					publishAppSync({
						type: "tracker:lock-changed",
						taskId,
						action: "released",
					});
				})
				.catch(() => undefined);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps -- mount/unmount per task
	}, [enabled, taskId, editLabel]);

	useEffect(() => {
		if (!enabled || !taskId || !editLabel || !holding || sessionTimedOut) return;
		const timer = window.setInterval(() => {
			if (!heldRef.current) return;
			void renewLock
				.mutateAsync({
					taskId,
					data: { lockedByLabel: holderRef.current },
				})
				.catch(() => {
					heldRef.current = false;
					setHolding(false);
					void tryAcquire();
				});
		}, RENEW_MS);
		return () => window.clearInterval(timer);
	}, [
		editLabel,
		enabled,
		holding,
		renewLock,
		sessionTimedOut,
		taskId,
		tryAcquire,
	]);

	/** Если чужой lock исчез — пробуем захватить снова. */
	useEffect(() => {
		if (!enabled || !taskId || !editLabel || holding || sessionTimedOut) return;
		if (lockQuery.isLoading) return;
		const lock = lockQuery.data ?? null;
		if (lock && lock.lockedByLabel !== editLabel) {
			setBlockedLock(lock);
			return;
		}
		if (!blockedLock) return;
		setBlockedLock(null);
		void tryAcquire();
	}, [
		blockedLock,
		editLabel,
		enabled,
		holding,
		lockQuery.data,
		lockQuery.isLoading,
		sessionTimedOut,
		taskId,
		tryAcquire,
	]);

	useEffect(() => {
		if (!enabled || !taskId || !holding || sessionTimedOut) return;

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
			onIdleTimeoutRef.current?.();
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
		releaseHeldLock,
		sessionTimedOut,
		taskId,
	]);

	const foreignLock = useMemo(() => {
		if (blockedLock && blockedLock.lockedByLabel !== editLabel) {
			return blockedLock;
		}
		const lock = lockQuery.data;
		if (!lock || !editLabel) return null;
		if (lock.lockedByLabel === editLabel) return null;
		return lock;
	}, [blockedLock, editLabel, lockQuery.data]);

	return {
		editLabel,
		lock: lockQuery.data,
		foreignLock,
		isLockedByOther: Boolean(foreignLock) && !holding,
		holding,
		sessionTimedOut,
	};
}
