import {
	useAcquireKanbanBoardTaskLock,
	useKanbanBoardTaskLock,
	useReleaseKanbanBoardTaskLock,
	useRenewKanbanBoardTaskLock,
} from "@react-client/common/api/queries/kanban-board";
import { parseKanbanBoardTaskEditBlockedError } from "@smart-anketa/api-contract";
import { useEffect, useMemo, useRef } from "react";
import { useTrackerEditIdentity } from "./useTrackerEditIdentity";

const RENEW_MS = 45_000;

export function useKanbanTaskEditLock(taskId: string | undefined, enabled: boolean) {
	const editLabel = useTrackerEditIdentity();
	const lockQuery = useKanbanBoardTaskLock(enabled ? taskId : undefined);
	const acquireLock = useAcquireKanbanBoardTaskLock();
	const renewLock = useRenewKanbanBoardTaskLock();
	const releaseLock = useReleaseKanbanBoardTaskLock();
	const holderRef = useRef(editLabel);

	useEffect(() => {
		holderRef.current = editLabel;
	}, [editLabel]);

	useEffect(() => {
		if (!enabled || !taskId || !editLabel) return;
		void acquireLock.mutateAsync({
			taskId,
			data: { lockedByLabel: editLabel },
		}).catch((error) => {
			const blocked = parseKanbanBoardTaskEditBlockedError(error);
			if (blocked?.reason === "lock") return;
		});
		return () => {
			if (!editLabel) return;
			void releaseLock.mutateAsync({
				taskId,
				data: { lockedByLabel: editLabel },
			});
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps -- mount/unmount only
	}, [enabled, taskId, editLabel]);

	useEffect(() => {
		if (!enabled || !taskId || !editLabel) return;
		const timer = window.setInterval(() => {
			void renewLock.mutateAsync({
				taskId,
				data: { lockedByLabel: holderRef.current },
			});
		}, RENEW_MS);
		return () => window.clearInterval(timer);
	}, [enabled, taskId, editLabel, renewLock]);

	const foreignLock = useMemo(() => {
		const lock = lockQuery.data;
		if (!lock || !editLabel) return null;
		if (lock.lockedByLabel === editLabel) return null;
		return lock;
	}, [editLabel, lockQuery.data]);

	return {
		editLabel,
		lock: lockQuery.data,
		foreignLock,
		isLockedByOther: Boolean(foreignLock),
	};
}
