import { apiErrorMessage } from "@react-client/common/api/helpers/apiErrorMessage";
import { useCreateKanbanBoardTask } from "@react-client/common/api/queries/kanban-board";
import { toast } from "@react-client/common/toasts";
import {
	trackerTaskPath,
	type KanbanBoardReturnLocationState,
} from "@react-client/features/kanban-board/kanban-task-paths";
import { useTrackerEditIdentity } from "@react-client/features/tracker/hooks/useTrackerEditIdentity";
import {
	KANBAN_BOARD_DEFAULT_TASK_TYPE_ID,
	KANBAN_BOARD_HEAP_BOARD_ID,
	type KanbanBoardSystemId,
	type KanbanBoardTaskRegistryDto,
} from "@smart-anketa/api-contract";
import { useCallback, useState } from "react";
import { useNavigate } from "react-router";

export const KANBAN_NEW_TASK_TITLE = "Новая задача";

export type CreateAndOpenKanbanTaskOptions = {
	boardId?: string;
	parentId?: string;
	releaseIds?: string[];
	systems: KanbanBoardSystemId[];
	returnState?: KanbanBoardReturnLocationState;
};

export type RequestCreateKanbanTaskOptions = {
	boardId?: string;
	parentId?: string;
	releaseIds?: string[];
	returnState?: KanbanBoardReturnLocationState;
	onStart?: () => void;
	onCreated?: (created: KanbanBoardTaskRegistryDto) => void;
	onError?: (error: unknown) => void;
};

export type CreateKanbanTaskSystemDialogState = {
	open: boolean;
	isSubmitting: boolean;
	onClose: () => void;
	onConfirm: (systems: KanbanBoardSystemId[]) => void;
};

export function useCreateAndOpenKanbanTask() {
	const navigate = useNavigate();
	const createTask = useCreateKanbanBoardTask();
	const createdBy = useTrackerEditIdentity();
	const { mutateAsync, isPending } = createTask;
	const [pendingRequest, setPendingRequest] =
		useState<RequestCreateKanbanTaskOptions | null>(null);

	const createAndOpen = useCallback(
		async (options: CreateAndOpenKanbanTaskOptions) => {
			if (!options.systems.length) {
				throw new Error("Укажите систему / приложение");
			}
			const created = await mutateAsync({
				boardId: options.boardId || KANBAN_BOARD_HEAP_BOARD_ID,
				parentId: options.parentId || "todo",
				content: {
					title: KANBAN_NEW_TASK_TITLE,
					taskType: KANBAN_BOARD_DEFAULT_TASK_TYPE_ID,
					systems: options.systems,
				},
				createdBy: createdBy.trim() || null,
				...(options.releaseIds ? { releaseIds: options.releaseIds } : {}),
			});
			navigate(trackerTaskPath(created.taskKey), {
				state: options.returnState,
			});
			return created;
		},
		[createdBy, mutateAsync, navigate],
	);

	const createAndOpenSafe = useCallback(
		async (options: CreateAndOpenKanbanTaskOptions) => {
			try {
				return await createAndOpen(options);
			} catch (error) {
				toast.error(apiErrorMessage(error));
				return null;
			}
		},
		[createAndOpen],
	);

	const requestCreate = useCallback((options?: RequestCreateKanbanTaskOptions) => {
		setPendingRequest(options ?? {});
	}, []);

	const closeSystemDialog = useCallback(() => {
		if (isPending) return;
		setPendingRequest(null);
	}, [isPending]);

	const confirmSystemDialog = useCallback(
		async (systems: KanbanBoardSystemId[]) => {
			const request = pendingRequest;
			if (!request) return;
			try {
				request.onStart?.();
				const created = await createAndOpen({
					boardId: request.boardId,
					parentId: request.parentId,
					releaseIds: request.releaseIds,
					returnState: request.returnState,
					systems,
				});
				setPendingRequest(null);
				request.onCreated?.(created);
			} catch (error) {
				request.onError?.(error);
				toast.error(apiErrorMessage(error));
			}
		},
		[createAndOpen, pendingRequest],
	);

	const systemDialog: CreateKanbanTaskSystemDialogState = {
		open: pendingRequest !== null,
		isSubmitting: isPending,
		onClose: closeSystemDialog,
		onConfirm: (systems) => {
			void confirmSystemDialog(systems);
		},
	};

	return {
		createAndOpen,
		createAndOpenSafe,
		requestCreate,
		isPending,
		systemDialog,
	};
}
