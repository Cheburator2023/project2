import { kanbanBoardGetBoardTasks } from "@react-client/common/api/queries/kanban-board";
import { KANBAN_BOARD_SYNC_POLL_INTERVAL_MS } from "@smart-anketa/api-contract";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

type Options = {
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
	boardRef,
	enabled,
	onRemoteUpdate,
}: Options) {
	const queryClient = useQueryClient();
	const baselineRef = useRef("");

	useEffect(() => {
		if (!boardRef) return;
		const cached = queryClient.getQueryData<Array<{ id: string; updatedAt: string }>>(
			["kanbanBoardTasks", boardRef],
		);
		baselineRef.current = versionsSignature(cached);
	}, [boardRef, queryClient]);

	const pollQuery = useQuery({
		queryKey: ["kanbanBoardBoardSync", boardRef],
		enabled: Boolean(enabled && boardRef),
		queryFn: ({ signal }) => kanbanBoardGetBoardTasks(boardRef!, signal),
		refetchInterval: () =>
			document.visibilityState === "visible"
				? KANBAN_BOARD_SYNC_POLL_INTERVAL_MS
				: false,
	});

	useEffect(() => {
		const signature = versionsSignature(pollQuery.data);
		if (!signature || !baselineRef.current) {
			if (signature) baselineRef.current = signature;
			return;
		}
		if (signature !== baselineRef.current) {
			onRemoteUpdate();
			baselineRef.current = signature;
		}
	}, [pollQuery.data, onRemoteUpdate]);
}
