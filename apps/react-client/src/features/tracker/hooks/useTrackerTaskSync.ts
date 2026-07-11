import { kanbanBoardGetTaskByRef } from "@react-client/common/api/queries/kanban-board";
import { KANBAN_BOARD_SYNC_POLL_INTERVAL_MS } from "@smart-anketa/api-contract";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

type Options = {
	taskRef: string | undefined;
	enabled: boolean;
	baselineUpdatedAt: string | undefined;
	onRemoteUpdate: () => void;
};

export function useTrackerTaskSync({
	taskRef,
	enabled,
	baselineUpdatedAt,
	onRemoteUpdate,
}: Options) {
	const baselineRef = useRef(baselineUpdatedAt);
	useEffect(() => {
		baselineRef.current = baselineUpdatedAt;
	}, [baselineUpdatedAt]);

	const pollQuery = useQuery({
		queryKey: ["kanbanBoardTaskSync", taskRef],
		enabled: Boolean(enabled && taskRef),
		queryFn: ({ signal }) => kanbanBoardGetTaskByRef(taskRef!, signal),
		refetchInterval: () =>
			document.visibilityState === "visible"
				? KANBAN_BOARD_SYNC_POLL_INTERVAL_MS
				: false,
	});

	useEffect(() => {
		const remoteUpdatedAt = pollQuery.data?.updatedAt;
		if (!remoteUpdatedAt || !baselineRef.current) return;
		if (remoteUpdatedAt !== baselineRef.current) {
			onRemoteUpdate();
		}
	}, [pollQuery.data?.updatedAt, onRemoteUpdate]);
}
