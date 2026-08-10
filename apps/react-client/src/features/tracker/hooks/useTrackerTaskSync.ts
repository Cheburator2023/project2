import { kanbanBoardGetTaskByRef } from "@react-client/common/api/queries/kanban-board";
import {
	KANBAN_BOARD_SYNC_POLL_INTERVAL_MS,
	type KanbanBoardTaskRegistryDto,
} from "@smart-anketa/api-contract";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

type Options = {
	taskRef: string | undefined;
	enabled: boolean;
	baselineUpdatedAt: string | undefined;
	/** Локальные несохранённые правки / сохранение — нельзя тихо перетирать форму. */
	isLocalBusy: () => boolean;
	/** Есть удалённые изменения, но локально dirty — показать баннер. */
	onRemoteStale: () => void;
	/** Можно применить удалённую версию автоматически. */
	onRemoteApplied?: () => void;
};

export function useTrackerTaskSync({
	taskRef,
	enabled,
	baselineUpdatedAt,
	isLocalBusy,
	onRemoteStale,
	onRemoteApplied,
}: Options) {
	const queryClient = useQueryClient();
	const baselineRef = useRef(baselineUpdatedAt);
	const isLocalBusyRef = useRef(isLocalBusy);
	const onRemoteStaleRef = useRef(onRemoteStale);
	const onRemoteAppliedRef = useRef(onRemoteApplied);
	const appliedUpdatedAtRef = useRef<string | null>(null);

	useEffect(() => {
		baselineRef.current = baselineUpdatedAt;
	}, [baselineUpdatedAt]);

	useEffect(() => {
		isLocalBusyRef.current = isLocalBusy;
		onRemoteStaleRef.current = onRemoteStale;
		onRemoteAppliedRef.current = onRemoteApplied;
	}, [isLocalBusy, onRemoteApplied, onRemoteStale]);

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
		const remote = pollQuery.data;
		const remoteUpdatedAt = remote?.updatedAt;
		if (!remote || !remoteUpdatedAt || !baselineRef.current) return;
		if (remoteUpdatedAt === baselineRef.current) {
			appliedUpdatedAtRef.current = null;
			return;
		}
		if (appliedUpdatedAtRef.current === remoteUpdatedAt) return;

		if (isLocalBusyRef.current()) {
			onRemoteStaleRef.current();
			return;
		}

		appliedUpdatedAtRef.current = remoteUpdatedAt;
		queryClient.setQueryData<KanbanBoardTaskRegistryDto>(
			["kanbanBoardTaskRef", taskRef],
			remote,
		);
		baselineRef.current = remoteUpdatedAt;
		onRemoteAppliedRef.current?.();
	}, [pollQuery.data, queryClient, taskRef]);
}
