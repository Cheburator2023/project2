export function collectKanbanBoardExpectedVersions(board) {
    const out = {};
    for (const columnId of board.root.children) {
        const column = board[columnId];
        if (!column)
            continue;
        for (const cardId of column.children) {
            const card = board[cardId];
            if (card?.updatedAt) {
                out[cardId] = card.updatedAt;
            }
        }
    }
    return out;
}
export function isKanbanBoardTaskEditBlockedError(value) {
    if (!value || typeof value !== "object")
        return false;
    const body = value;
    return (typeof body.message === "string" &&
        (body.reason === "version" || body.reason === "lock"));
}
export function parseKanbanBoardTaskEditBlockedError(error) {
    const ax = error;
    if (ax.response?.status !== 409 && ax.response?.status !== 423) {
        return null;
    }
    const data = ax.response.data;
    if (isKanbanBoardTaskEditBlockedError(data)) {
        return data;
    }
    return null;
}
