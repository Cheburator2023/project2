import { kanbanBoardGetTaskByRef } from "@react-client/common/api/queries/kanban-board";
import type {
	KanbanBoardTaskRegistryDto,
	KanbanSyncPayload,
} from "@smart-anketa/api-contract";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { subscribeKanbanBoardSync } from "../utils/kanbanSocket";

type Options = {
	taskId: string | undefined;
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
	taskId,
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

	useEffect(() => {
		if (!enabled || !taskId || !taskRef) return;

		const applyRemote = (remote: KanbanBoardTaskRegistryDto) => {
			const remoteUpdatedAt = remote.updatedAt;
			if (!remoteUpdatedAt || !baselineRef.current) return;
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
		};

		const onSync = (payload: KanbanSyncPayload) => {
			if (!payload.taskIds.includes(taskId)) return;
			void kanbanBoardGetTaskByRef(taskRef)
				.then(applyRemote)
				.catch(() => undefined);
		};

		return subscribeKanbanBoardSync(onSync);
	}, [enabled, queryClient, taskId, taskRef]);
}
