import { Navigate, useParams } from "react-router";
import { useKanbanBoardBoards, kanbanBoardGetTaskByRef } from "@react-client/common/api/queries/kanban-board";
import { isKanbanRecordId } from "@smart-anketa/api-contract";
import { trackerBoardPath, trackerTaskPath } from "@react-client/features/kanban-board/kanban-task-paths";
import { useQuery } from "@tanstack/react-query";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";

export function TrackerLegacyBoardRedirect() {
	const { boardId = "" } = useParams<{ boardId: string }>();
	const boardsQuery = useKanbanBoardBoards();

	if (!isKanbanRecordId(boardId)) {
		return <Navigate to={trackerBoardPath(boardId)} replace />;
	}

	const board = boardsQuery.data?.find((item) => item.id === boardId);
	if (boardsQuery.isLoading) {
		return (
			<Box sx={{ p: 3 }}>
				<Typography color="text.secondary">Загрузка доски…</Typography>
			</Box>
		);
	}
	if (!board) {
		return (
			<Box sx={{ p: 3 }}>
				<Typography color="error">Доска не найдена</Typography>
			</Box>
		);
	}
	return <Navigate to={trackerBoardPath(board.boardKey)} replace />;
}

export function TrackerLegacyTaskRedirect() {
	const { taskId = "" } = useParams<{ boardId?: string; taskId: string }>();
	const taskQuery = useQuery({
		queryKey: ["kanbanBoardTaskRef", taskId],
		enabled: Boolean(taskId) && isKanbanRecordId(taskId),
		queryFn: ({ signal }) => kanbanBoardGetTaskByRef(taskId, signal),
	});

	if (!isKanbanRecordId(taskId)) {
		return <Navigate to={trackerTaskPath(taskId)} replace />;
	}

	if (taskQuery.isLoading) {
		return (
			<Box sx={{ p: 3 }}>
				<Typography color="text.secondary">Загрузка задачи…</Typography>
			</Box>
		);
	}
	if (!taskQuery.data) {
		return (
			<Box sx={{ p: 3 }}>
				<Typography color="error">Задача не найдена</Typography>
			</Box>
		);
	}
	return <Navigate to={trackerTaskPath(taskQuery.data.taskKey)} replace />;
}
