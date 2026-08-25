import { useQueryClient } from "@tanstack/react-query";
import {
	useKanbanBoardAssignees,
	useKanbanBoardCustomers,
	useKanbanBoardSprints,
	useKanbanBoardStreams,
	useKanbanBoardTasksRegistry,
	useUpdateKanbanBoardTask,
} from "@react-client/common/api/queries/kanban-board";
import { apiErrorMessage } from "@react-client/common/api/helpers/apiErrorMessage";
import { toast } from "@react-client/common/toasts";
import { TrackerTaskConflictDialog } from "@react-client/features/tracker/components/TrackerTaskConflictDialog";
import { useTrackerEditIdentity } from "@react-client/features/tracker/hooks/useTrackerEditIdentity";
import {
	normalizeKanbanBoardTaskContent,
	parseKanbanBoardTaskEditBlockedError,
	type KanbanBoardTaskEditBlockedErrorDto,
	type KanbanBoardTaskRegistryDto,
} from "@smart-anketa/api-contract";
import { useCallback, useMemo, useRef, useState } from "react";
import {
	planningParentTaskLabel,
	planningSprintOptionLabel,
	type PlanningTaskFieldLookups,
} from "./planningTaskCellEdit";

type PendingTaskSave = {
	task: KanbanBoardTaskRegistryDto;
};

export function usePlanningTaskGridEdits() {
	const queryClient = useQueryClient();
	const updateTask = useUpdateKanbanBoardTask();
	const editLabel = useTrackerEditIdentity();
	const assigneesQuery = useKanbanBoardAssignees();
	const sprintsQuery = useKanbanBoardSprints();
	const streamsQuery = useKanbanBoardStreams();
	const customersQuery = useKanbanBoardCustomers();
	const tasksQuery = useKanbanBoardTasksRegistry();
	const [editBlocked, setEditBlocked] =
		useState<KanbanBoardTaskEditBlockedErrorDto | null>(null);
	const pendingRef = useRef<PendingTaskSave | null>(null);

	const lookups = useMemo<PlanningTaskFieldLookups>(
		() => ({
			assigneeNames: (assigneesQuery.data ?? []).map((item) => item.name),
			sprintOptions: (sprintsQuery.data ?? []).map((item) => ({
				id: item.id,
				label: planningSprintOptionLabel(item),
			})),
			streamNames: (streamsQuery.data ?? []).map((item) => item.name),
			customerNames: (customersQuery.data ?? []).map((item) => item.name),
			parentTaskOptions: (tasksQuery.data ?? []).map((item) => ({
				id: item.id,
				label: planningParentTaskLabel(item),
			})),
		}),
		[
			assigneesQuery.data,
			customersQuery.data,
			sprintsQuery.data,
			streamsQuery.data,
			tasksQuery.data,
		],
	);

	const persistTask = useCallback(
		async (task: KanbanBoardTaskRegistryDto, forceOverwrite?: boolean) => {
			pendingRef.current = { task };
			try {
				await updateTask.mutateAsync({
					id: task.id,
					data: {
						boardId: task.boardId,
						parentId: task.parentId,
						content: normalizeKanbanBoardTaskContent({
							...task.content,
							title: task.content.title || task.title,
						}),
						createdBy: task.createdBy ?? null,
						expectedUpdatedAt: task.updatedAt,
						forceOverwrite,
						lockHolderLabel: editLabel || undefined,
					},
				});
				setEditBlocked(null);
				pendingRef.current = null;
			} catch (error) {
				const blocked = parseKanbanBoardTaskEditBlockedError(error);
				if (blocked) {
					setEditBlocked(blocked);
				} else {
					toast.error(apiErrorMessage(error));
				}
				void queryClient.invalidateQueries({
					queryKey: ["kanbanBoardPlanning"],
				});
			}
		},
		[editLabel, queryClient, updateTask],
	);

	const conflictDialog = (
		<TrackerTaskConflictDialog
			open={Boolean(editBlocked)}
			error={editBlocked}
			onRefresh={() => {
				setEditBlocked(null);
				pendingRef.current = null;
				void queryClient.invalidateQueries({
					queryKey: ["kanbanBoardPlanning"],
				});
			}}
			onForceOverwrite={() => {
				const pending = pendingRef.current;
				if (!pending) return;
				void persistTask(pending.task, true);
			}}
			onClose={() => setEditBlocked(null)}
		/>
	);

	return { lookups, persistTask, conflictDialog };
}
