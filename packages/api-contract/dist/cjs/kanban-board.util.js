"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toBoardData = toBoardData;
exports.normalizeKanbanBoardData = normalizeKanbanBoardData;
exports.fromBoardData = fromBoardData;
exports.kanbanBoardTaskAssignees = kanbanBoardTaskAssignees;
exports.kanbanBoardTaskAssigneesTitle = kanbanBoardTaskAssigneesTitle;
exports.isKanbanBoardAssigneeRoleId = isKanbanBoardAssigneeRoleId;
exports.kanbanBoardAssigneeRoleByName = kanbanBoardAssigneeRoleByName;
exports.kanbanBoardTaskAssigneeRoles = kanbanBoardTaskAssigneeRoles;
exports.kanbanBoardTaskAssigneeRoleTitles = kanbanBoardTaskAssigneeRoleTitles;
exports.kanbanBoardRoleEstimatesTotal = kanbanBoardRoleEstimatesTotal;
exports.kanbanBoardEffectiveEstimatePd = kanbanBoardEffectiveEstimatePd;
exports.kanbanBoardEffectiveSprintCapacityPd = kanbanBoardEffectiveSprintCapacityPd;
exports.normalizeKanbanBoardSubtasks = normalizeKanbanBoardSubtasks;
exports.kanbanBoardSubtasksProgress = kanbanBoardSubtasksProgress;
exports.normalizeKanbanBoardTaskContent = normalizeKanbanBoardTaskContent;
exports.boardsEquivalent = boardsEquivalent;
const kanban_board_types_1 = require("./kanban-board.types");
function toBoardData(rows, columns) {
    const effectiveColumns = columns.length > 0 ? columns : (0, kanban_board_types_1.defaultKanbanBoardColumns)("board");
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
function normalizeKanbanBoardData(board) {
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
function fromBoardData(board, stand, now, boardId) {
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
function kanbanBoardTaskAssignees(content) {
    if (content.assignees?.length) {
        return [...new Set(content.assignees.map((item) => item.trim()).filter(Boolean))];
    }
    const legacyAssignee = content.assignee?.trim();
    return legacyAssignee ? [legacyAssignee] : [];
}
function kanbanBoardTaskAssigneesTitle(content) {
    return kanbanBoardTaskAssignees(content).join(", ");
}
const KANBAN_BOARD_ASSIGNEE_ROLE_IDS = new Set(kanban_board_types_1.KANBAN_BOARD_ASSIGNEE_ROLES.map((item) => item.id));
function isKanbanBoardAssigneeRoleId(value) {
    return Boolean(value && KANBAN_BOARD_ASSIGNEE_ROLE_IDS.has(value));
}
function kanbanBoardAssigneeRoleByName(assignees) {
    return new Map(assignees.map((item) => [item.name, item.role]));
}
/** Уникальные роли исполнителей задачи по справочнику. */
function kanbanBoardTaskAssigneeRoles(content, roleByAssigneeName) {
    const roles = new Set();
    for (const name of kanbanBoardTaskAssignees(content)) {
        const role = roleByAssigneeName.get(name);
        if (role)
            roles.add(role);
    }
    return [...roles];
}
function kanbanBoardTaskAssigneeRoleTitles(content, roleByAssigneeName) {
    return kanbanBoardTaskAssigneeRoles(content, roleByAssigneeName).map((role) => (0, kanban_board_types_1.kanbanBoardAssigneeRoleTitle)(role));
}
function kanbanBoardRoleEstimatesTotal(roleEstimates) {
    if (!roleEstimates)
        return undefined;
    let sum = 0;
    let hasValue = false;
    for (const value of Object.values(roleEstimates)) {
        if (value === undefined || value === null || Number.isNaN(value))
            continue;
        sum += value;
        hasValue = true;
    }
    return hasValue ? sum : undefined;
}
/** Итоговая оценка: сумма по ролям или явное estimatePd. */
function kanbanBoardEffectiveEstimatePd(content) {
    return kanbanBoardRoleEstimatesTotal(content.roleEstimates) ?? content.estimatePd;
}
function kanbanBoardEffectiveSprintCapacityPd(input) {
    if (input.sprintCapacityPd !== undefined &&
        input.sprintCapacityPd !== null &&
        !Number.isNaN(input.sprintCapacityPd)) {
        return input.sprintCapacityPd;
    }
    const fallback = input.defaultSprintCapacityPd ?? kanban_board_types_1.KANBAN_BOARD_DEFAULT_SPRINT_CAPACITY_PD;
    return fallback;
}
/** Нормализует чеклист подзадач: убирает пустые строки, сохраняет порядок. */
function normalizeKanbanBoardSubtasks(items) {
    if (!items?.length)
        return undefined;
    const cleaned = items
        .map((item) => {
        const status = normalizeKanbanBoardSubtaskStatus(item);
        return {
            id: item.id.trim(),
            text: item.text.trim(),
            status,
        };
    })
        .filter((item) => item.id && item.text);
    return cleaned.length ? cleaned : undefined;
}
function normalizeKanbanBoardSubtaskStatus(item) {
    if (item.status &&
        kanban_board_types_1.KANBAN_BOARD_SUBTASK_STATUSES.some((entry) => entry.id === item.status)) {
        return item.status;
    }
    if (item.done)
        return "done";
    return "next_up";
}
function kanbanBoardSubtasksProgress(content) {
    const items = content?.subtasks;
    if (!items?.length)
        return undefined;
    const done = items.filter((item) => (0, kanban_board_types_1.kanbanBoardSubtaskIsDone)(item)).length;
    return { done, total: items.length };
}
/** Нормализует content: проставляет estimatePd из roleEstimates, убирает пустые роли. */
function normalizeKanbanBoardTaskContent(content) {
    const next = { ...content };
    next.subtasks = normalizeKanbanBoardSubtasks(next.subtasks);
    if (content.images !== undefined) {
        if (content.images.length) {
            next.images = content.images
                .filter((item) => item &&
                typeof item.id === "string" &&
                typeof item.name === "string" &&
                Number.isFinite(item.width) &&
                Number.isFinite(item.height))
                .map((item) => ({
                id: item.id,
                name: item.name.trim().slice(0, 255) || "image",
                width: Math.max(0, Math.round(item.width)),
                height: Math.max(0, Math.round(item.height)),
                fullByteSize: Math.max(0, Math.round(item.fullByteSize ?? 0)),
                thumbByteSize: Math.max(0, Math.round(item.thumbByteSize ?? 0)),
                createdAt: item.createdAt ?? new Date().toISOString(),
            }));
            if (!next.images.length)
                next.images = undefined;
        }
        else {
            next.images = undefined;
        }
    }
    if (next.roleEstimates) {
        const cleaned = {};
        for (const [key, value] of Object.entries(next.roleEstimates)) {
            if (value !== undefined && value !== null && !Number.isNaN(value)) {
                cleaned[key] = value;
            }
        }
        next.roleEstimates = Object.keys(cleaned).length ? cleaned : undefined;
    }
    const roleTotal = kanbanBoardRoleEstimatesTotal(next.roleEstimates);
    if (roleTotal !== undefined) {
        next.estimatePd = roleTotal;
    }
    return next;
}
function boardsEquivalent(left, right) {
    const leftRows = fromBoardData(left, "stand", "1970-01-01T00:00:00.000Z", "board");
    const rightRows = fromBoardData(right, "stand", "1970-01-01T00:00:00.000Z", "board");
    if (leftRows.length !== rightRows.length)
        return false;
    const sortKey = (row) => `${row.id}:${row.parentId}:${row.position}:${row.content.title}:${row.content.description ?? ""}:${row.content.priority ?? ""}:${kanbanBoardTaskAssigneesTitle(row.content)}`;
    const leftKeys = leftRows.map(sortKey).sort();
    const rightKeys = rightRows.map(sortKey).sort();
    return leftKeys.every((key, index) => key === rightKeys[index]);
}
