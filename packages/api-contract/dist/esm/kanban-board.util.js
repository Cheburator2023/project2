import { defaultKanbanBoardColumns, } from "./kanban-board.types";
export function toBoardData(rows, columns) {
    const effectiveColumns = columns.length > 0 ? columns : defaultKanbanBoardColumns("board");
    const sortedColumns = [...effectiveColumns].sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title));
    const columnIds = new Set(sortedColumns.map((column) => column.id));
    const fallbackColumnId = sortedColumns[0]?.id ?? "backlog";
    const byColumn = new Map();
    for (const column of sortedColumns) {
        byColumn.set(column.id, []);
    }
    for (const task of rows) {
        const columnId = columnIds.has(task.parentId)
            ? task.parentId
            : fallbackColumnId;
        (byColumn.get(columnId) ?? []).push(task);
    }
    for (const tasks of byColumn.values()) {
        tasks.sort((a, b) => a.position - b.position);
    }
    const board = {
        root: {
            id: "root",
            title: "Root",
            parentId: null,
            children: sortedColumns.map((column) => column.id),
            totalChildrenCount: sortedColumns.length,
        },
    };
    for (const column of sortedColumns) {
        const tasks = byColumn.get(column.id) ?? [];
        board[column.id] = {
            id: column.id,
            title: column.title,
            parentId: "root",
            children: tasks.map((task) => task.id),
            totalChildrenCount: tasks.length,
            content: { color: column.color },
        };
        for (const task of tasks) {
            board[task.id] = {
                id: task.id,
                title: task.content.title,
                parentId: column.id,
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
export function normalizeKanbanBoardData(board) {
    const next = { ...board, root: { ...board.root } };
    for (const columnId of board.root.children) {
        const column = board[columnId];
        if (!column)
            continue;
        const childCount = column.children.length;
        next[columnId] = {
            ...column,
            totalChildrenCount: childCount,
        };
        for (const cardId of column.children) {
            const card = board[cardId];
            if (!card)
                continue;
            next[cardId] = {
                ...card,
                parentId: columnId,
            };
        }
    }
    return next;
}
export function fromBoardData(board, stand, now, boardId) {
    const out = [];
    const columnIds = board.root?.children ?? [];
    for (const columnId of columnIds) {
        const column = board[columnId];
        if (!column)
            continue;
        column.children.forEach((cardId, position) => {
            const node = board[cardId];
            if (!node)
                return;
            out.push({
                id: node.id,
                boardId,
                parentId: columnId,
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
