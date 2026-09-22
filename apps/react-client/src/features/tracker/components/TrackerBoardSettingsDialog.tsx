import { apiErrorMessage } from "@react-client/common/api/helpers/apiErrorMessage";
import {
	useKanbanBoardProjects,
	useUpdateKanbanBoardBoard,
} from "@react-client/common/api/queries/kanban-board";
import { toast } from "@react-client/common/toasts";
import { TrackerFormDialog } from "@react-client/features/tracker/components/TrackerFormDialog";
import {
	trackerBoardFormFields,
	trackerBoardFormValues,
	trackerBoardProjectOptions,
	trackerBoardWritePayload,
} from "@react-client/features/tracker/trackerBoardForm";
import type { KanbanBoardBoardDto } from "@smart-anketa/api-contract";
import { useMemo } from "react";

type Props = {
	open: boolean;
	board: KanbanBoardBoardDto | null;
	onClose: () => void;
	onSaved?: (board: KanbanBoardBoardDto) => void;
};

export function TrackerBoardSettingsDialog({
	open,
	board,
	onClose,
	onSaved,
}: Props) {
	const { data: projects = [] } = useKanbanBoardProjects();
	const updateBoard = useUpdateKanbanBoardBoard();
	const projectOptions = useMemo(
		() => trackerBoardProjectOptions(projects),
		[projects],
	);
	const fields = useMemo(
		() => trackerBoardFormFields(projectOptions),
		[projectOptions],
	);

	return (
		<TrackerFormDialog
			open={open && Boolean(board)}
			title="Настройки доски"
			fields={fields}
			initialValues={board ? trackerBoardFormValues(board) : {}}
			isSubmitting={updateBoard.isPending}
			onClose={onClose}
			onSubmit={async (values) => {
				if (!board) return;
				try {
					const updated = await updateBoard.mutateAsync({
						id: board.id,
						data: trackerBoardWritePayload(values),
					});
					onSaved?.(updated);
					onClose();
				} catch (error) {
					toast.error(apiErrorMessage(error));
				}
			}}
		/>
	);
}
