import { KANBAN_BOARD_COLUMN_COLORS, KANBAN_BOARD_STATUSES, } from "./kanban-board.types";
export function toBoardData(rows) {
    const byStatus = new Map();
    for (const status of KANBAN_BOARD_STATUSES) {
        byStatus.set(status.id, []);
    }
    for (const task of rows) {
        (byStatus.get(task.parentId) ?? []).push(task);
    }
    for (const tasks of byStatus.values()) {
        tasks.sort((a, b) => a.position - b.position);
    }
    const board = {
        root: {
            id: "root",
            title: "Root",
            parentId: null,
            children: KANBAN_BOARD_STATUSES.map((status) => status.id),
            totalChildrenCount: KANBAN_BOARD_STATUSES.length,
        },
    };
    for (const status of KANBAN_BOARD_STATUSES) {
        const tasks = byStatus.get(status.id) ?? [];
        board[status.id] = {
            id: status.id,
            title: status.title,
            parentId: "root",
            children: tasks.map((task) => task.id),
            totalChildrenCount: tasks.length,
            content: { color: KANBAN_BOARD_COLUMN_COLORS[status.id] },
        };
        for (const task of tasks) {
            board[task.id] = {
                id: task.id,
                title: task.content.title,
                parentId: status.id,
                children: [],
                totalChildrenCount: 0,
                type: "card",
                content: task.content,
                origin: task.origin,
            };
        }
    }
    return board;
}
export function fromBoardData(board, stand, now, boardId) {
    const out = [];
    for (const status of KANBAN_BOARD_STATUSES) {
        const column = board[status.id];
        if (!column)
            continue;
        column.children.forEach((cardId, position) => {
            const node = board[cardId];
            if (!node)
                return;
            out.push({
                id: node.id,
                boardId,
                parentId: status.id,
                position,
                content: node.content,
                origin: node.origin ?? stand,
                updatedAt: now,
            });
        });
    }
    return out;
}
export function boardsEquivalent(left, right) {
    const leftRows = fromBoardData(left, "stand", "1970-01-01T00:00:00.000Z", "board");
    const rightRows = fromBoardData(right, "stand", "1970-01-01T00:00:00.000Z", "board");
    if (leftRows.length !== rightRows.length)
        return false;
    const sortKey = (row) => `${row.id}:${row.parentId}:${row.position}:${row.content.title}:${row.content.description ?? ""}:${row.content.priority ?? ""}:${row.content.assignee ?? ""}`;
    const leftKeys = leftRows.map(sortKey).sort();
    const rightKeys = rightRows.map(sortKey).sort();
    return leftKeys.every((key, index) => key === rightKeys[index]);
}
