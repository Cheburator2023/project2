import type { KanbanBoardData, KanbanBoardTaskEditBlockedErrorDto } from "./kanban-board.types";

export function collectKanbanBoardExpectedVersions(
	board: KanbanBoardData,
): Record<string, string> {
	const out: Record<string, string> = {};
	for (const columnId of board.root.children) {
		const column = board[columnId];
		if (!column) continue;
		for (const cardId of column.children) {
			const card = board[cardId];
			if (card?.updatedAt) {
				out[cardId] = card.updatedAt;
			}
		}
	}
	return out;
}

export function isKanbanBoardTaskEditBlockedError(
	value: unknown,
): value is KanbanBoardTaskEditBlockedErrorDto {
	if (!value || typeof value !== "object") return false;
	const body = value as KanbanBoardTaskEditBlockedErrorDto;
	return (
		typeof body.message === "string" &&
		(body.reason === "version" || body.reason === "lock")
	);
}

export function parseKanbanBoardTaskEditBlockedError(
	error: unknown,
): KanbanBoardTaskEditBlockedErrorDto | null {
	const ax = error as {
		response?: { status?: number; data?: unknown };
	};
	if (ax.response?.status !== 409 && ax.response?.status !== 423) {
		return null;
	}
	const data = ax.response.data;
	if (isKanbanBoardTaskEditBlockedError(data)) {
		return data;
	}
	return null;
}
