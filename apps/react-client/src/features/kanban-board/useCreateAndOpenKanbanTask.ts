import { apiErrorMessage } from "@react-client/common/api/helpers/apiErrorMessage";
import { useCreateKanbanBoardTask } from "@react-client/common/api/queries/kanban-board";
import { toast } from "@react-client/common/toasts";
import {
	trackerTaskPath,
	type KanbanBoardReturnLocationState,
} from "@react-client/features/kanban-board/kanban-task-paths";
import { useTrackerEditIdentity } from "@react-client/features/tracker/hooks/useTrackerEditIdentity";
import { KANBAN_BOARD_HEAP_BOARD_ID } from "@smart-anketa/api-contract";
import { useCallback } from "react";
import { useNavigate } from "react-router";

export const KANBAN_NEW_TASK_TITLE = "Новая задача";

export function useCreateAndOpenKanbanTask() {
	const navigate = useNavigate();
	const createTask = useCreateKanbanBoardTask();
	const createdBy = useTrackerEditIdentity();
	const { mutateAsync, isPending } = createTask;

	const createAndOpen = useCallback(
		async (options?: {
			boardId?: string;
			parentId?: string;
			returnState?: KanbanBoardReturnLocationState;
		}) => {
			const created = await mutateAsync({
				boardId: options?.boardId || KANBAN_BOARD_HEAP_BOARD_ID,
				parentId: options?.parentId || "todo",
				content: { title: KANBAN_NEW_TASK_TITLE },
				createdBy: createdBy.trim() || null,
			});
			navigate(trackerTaskPath(created.taskKey), {
				state: options?.returnState,
			});
			return created;
		},
		[createdBy, mutateAsync, navigate],
	);

	const createAndOpenSafe = useCallback(
		async (options?: {
			boardId?: string;
			parentId?: string;
			returnState?: KanbanBoardReturnLocationState;
		}) => {
			try {
				return await createAndOpen(options);
			} catch (error) {
				toast.error(apiErrorMessage(error));
				return null;
			}
		},
		[createAndOpen],
	);

	return {
		createAndOpen,
		createAndOpenSafe,
		isPending,
	};
}
