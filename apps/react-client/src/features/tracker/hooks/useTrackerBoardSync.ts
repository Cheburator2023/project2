import { kanbanBoardGetBoardTasks } from "@react-client/common/api/queries/kanban-board";
import type { KanbanSyncPayload } from "@smart-anketa/api-contract";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { subscribeKanbanBoardSync } from "../utils/kanbanSocket";

type Options = {
	boardId: string | undefined;
	boardRef: string | undefined;
	enabled: boolean;
	onRemoteUpdate: () => void;
};

function versionsSignature(
	tasks: Array<{ id: string; updatedAt: string }> | undefined,
): string {
	if (!tasks?.length) return "";
	return tasks
		.map((task) => `${task.id}:${task.updatedAt}`)
		.sort()
		.join("|");
}

export function useTrackerBoardSync({
	boardId,
	boardRef,
	enabled,
	onRemoteUpdate,
}: Options) {
	const queryClient = useQueryClient();
	const onRemoteUpdateRef = useRef(onRemoteUpdate);
	onRemoteUpdateRef.current = onRemoteUpdate;

	useEffect(() => {
		if (!enabled || !boardId || !boardRef) return;

		const onSync = (payload: KanbanSyncPayload) => {
			if (payload.boardId !== boardId) return;
			void (async () => {
				try {
					const remote = await kanbanBoardGetBoardTasks(boardRef);
					const remoteSig = versionsSignature(remote);
					const local = queryClient.getQueryData<
						Array<{ id: string; updatedAt: string }>
					>(["kanbanBoardTasks", boardRef]);
					const localSig = versionsSignature(local);
					if (remoteSig && remoteSig !== localSig) {
						onRemoteUpdateRef.current();
					}
				} catch {
					return;
				}
			})();
		};

		return subscribeKanbanBoardSync(onSync);
	}, [boardId, boardRef, enabled, queryClient]);
}
