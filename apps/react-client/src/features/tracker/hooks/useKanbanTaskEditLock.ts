import { publishAppSync } from "@react-client/common/crossTab/appBroadcast";
import {
	KANBAN_BOARD_TASK_EDIT_IDLE_TIMEOUT_MS,
	KANBAN_BOARD_TASK_LOCK_TTL_MS,
	KANBAN_WS_EVENTS,
	type KanbanBoardTaskLockDto,
	type KanbanLockChangedPayload,
} from "@smart-anketa/api-contract";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useKanbanTaskLocksStore } from "../stores/kanbanTaskLocksStore";
import {
	connectKanbanSocket,
	joinKanbanTaskEditLock,
	leaveKanbanTaskEditLock,
} from "../utils/kanbanSocket";
import { useTrackerEditIdentity } from "./useTrackerEditIdentity";

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

function isOwnLock(
	lock: KanbanBoardTaskLockDto | null | undefined,
	label: string,
): boolean {
	if (!lock || !label.trim()) return false;
	return lock.lockedByLabel.trim() === label.trim();
}

/**
 * Occupancy через Socket.IO: join при входе, leave / disconnect снимает lock.
 * HTTP-heartbeat больше не нужен — TTL продлевает сервер, пока сокет жив.
 */
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
	const upsertLock = useKanbanTaskLocksStore((s) => s.upsertLock);
	const removeLock = useKanbanTaskLocksStore((s) => s.removeLock);
	const lockFromStore = useKanbanTaskLocksStore((s) =>
		taskId ? s.locksById[taskId] : undefined,
	);
	const holderRef = useRef(editLabel);
	const heldRef = useRef(false);
	const [holding, setHolding] = useState(false);
	const [blockedLock, setBlockedLock] = useState<KanbanBoardTaskLockDto | null>(
		null,
	);
	const [sessionTimedOut, setSessionTimedOut] = useState(false);
	const lastActivityAtRef = useRef(Date.now());
	const sessionTimedOutRef = useRef(false);
	const onIdleTimeoutRef = useRef(onIdleTimeout);
	onIdleTimeoutRef.current = onIdleTimeout;
	holderRef.current = editLabel;

	const applyDenied = useCallback(
		(lock: KanbanBoardTaskLockDto | undefined, message?: string) => {
			heldRef.current = false;
			setHolding(false);
			if (lock) {
				setBlockedLock(lock);
				upsertLock(lock);
				publishAppSync({
					type: "tracker:lock-changed",
					taskId: lock.taskId,
					action: "blocked",
				});
				return;
			}
			if (!taskId) return;
			setBlockedLock({
				taskId,
				lockedByLabel: message?.trim() || "другой пользователь",
				lockedByUserId: null,
				expiresAt: new Date(
					Date.now() + KANBAN_BOARD_TASK_LOCK_TTL_MS,
				).toISOString(),
			});
			publishAppSync({
				type: "tracker:lock-changed",
				taskId,
				action: "blocked",
			});
		},
		[taskId, upsertLock],
	);

	const tryAcquire = useCallback(async () => {
		if (!enabled || !taskId || !editLabel || sessionTimedOutRef.current) {
			return false;
		}
		try {
			const ack = await joinKanbanTaskEditLock(taskId, holderRef.current);
			if (!ack?.ok) {
				applyDenied(ack?.lock, ack?.message);
				return false;
			}
			heldRef.current = true;
			setHolding(true);
			setBlockedLock(null);
			lastActivityAtRef.current = Date.now();
			upsertLock(ack.lock);
			publishAppSync({
				type: "tracker:lock-changed",
				taskId,
				action: "acquired",
			});
			return true;
		} catch {
			heldRef.current = false;
			setHolding(false);
			return false;
		}
	}, [applyDenied, editLabel, enabled, taskId, upsertLock]);

	const releaseHeldLock = useCallback(() => {
		if (!taskId || !heldRef.current) return;
		heldRef.current = false;
		setHolding(false);
		removeLock(taskId);
		void leaveKanbanTaskEditLock(taskId);
		publishAppSync({
			type: "tracker:lock-changed",
			taskId,
			action: "released",
		});
	}, [removeLock, taskId]);

	useEffect(() => {
		let cancelled = false;
		heldRef.current = false;
		setHolding(false);
		setBlockedLock(null);
		setSessionTimedOut(false);
		sessionTimedOutRef.current = false;
		lastActivityAtRef.current = Date.now();
		if (!enabled || !taskId || !editLabel) return;

		void (async () => {
			const ok = await tryAcquire();
			if (cancelled && ok) {
				heldRef.current = false;
				setHolding(false);
				removeLock(taskId);
				void leaveKanbanTaskEditLock(taskId);
			}
		})();

		return () => {
			cancelled = true;
			if (!taskId || !heldRef.current) return;
			heldRef.current = false;
			setHolding(false);
			removeLock(taskId);
			void leaveKanbanTaskEditLock(taskId);
			publishAppSync({
				type: "tracker:lock-changed",
				taskId,
				action: "released",
			});
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps -- acquire once per id/enabled
	}, [enabled, taskId, editLabel]);

	useEffect(() => {
		if (!enabled || !taskId || !editLabel) return;
		const client = connectKanbanSocket(holderRef.current);

		const onReconnect = () => {
			if (sessionTimedOutRef.current) return;
			void tryAcquire();
		};
		const onChanged = (payload: KanbanLockChangedPayload) => {
			if (payload.type === "released") {
				if (payload.taskId !== taskId) return;
				if (heldRef.current || sessionTimedOutRef.current) return;
				setBlockedLock(null);
				void tryAcquire();
				return;
			}
			if (payload.lock.taskId !== taskId) return;
			if (isOwnLock(payload.lock, holderRef.current)) return;
			if (heldRef.current) return;
			setBlockedLock(payload.lock);
		};

		client.io.on("reconnect", onReconnect);
		client.on(KANBAN_WS_EVENTS.changed, onChanged);
		return () => {
			client.io.off("reconnect", onReconnect);
			client.off(KANBAN_WS_EVENTS.changed, onChanged);
		};
	}, [editLabel, enabled, taskId, tryAcquire]);

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
			sessionTimedOutRef.current = true;
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
		if (blockedLock && !isOwnLock(blockedLock, editLabel)) {
			return blockedLock;
		}
		if (lockFromStore && !isOwnLock(lockFromStore, editLabel) && !holding) {
			return lockFromStore;
		}
		return null;
	}, [blockedLock, editLabel, holding, lockFromStore]);

	return {
		editLabel,
		lock: lockFromStore,
		foreignLock,
		isLockedByOther: Boolean(foreignLock) && !holding,
		holding,
		sessionTimedOut,
	};
}
