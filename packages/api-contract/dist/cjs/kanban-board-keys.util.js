"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeTrackerCode = normalizeTrackerCode;
exports.isKanbanUlid = isKanbanUlid;
exports.isKanbanRecordId = isKanbanRecordId;
exports.formatKanbanBoardKey = formatKanbanBoardKey;
exports.formatKanbanTaskKey = formatKanbanTaskKey;
exports.parseKanbanTaskKey = parseKanbanTaskKey;
exports.parseKanbanBoardKey = parseKanbanBoardKey;
/** Нормализует код/slug трекера: trim + UPPERCASE. */
function normalizeTrackerCode(value) {
    return value.trim().toUpperCase();
}
/** Crockford Base32 ULID (26 символов). */
function isKanbanUlid(value) {
    return /^[0-9A-HJKMNP-TV-Z]{26}$/i.test(value.trim());
}
/** Внутренний id записи трекера (stock seed — 24 симв., ULID — 26). */
function isKanbanRecordId(value) {
    return /^[0-9A-HJKMNP-TV-Z]{24,26}$/i.test(value.trim());
}
const DEFAULT_BOARD_SLUG = "MAIN";
/** Ключ доски в URL: PROJECT или PROJECT-SLUG (slug MAIN опускается). */
function formatKanbanBoardKey(projectCode, boardSlug) {
    const project = normalizeTrackerCode(projectCode);
    const slug = normalizeTrackerCode(boardSlug);
    if (!slug || slug === DEFAULT_BOARD_SLUG || slug === project) {
        return project;
    }
    return `${project}-${slug}`;
}
/** Ключ задачи в URL: PROJECT-N (например SMARTA-1). */
function formatKanbanTaskKey(projectCode, taskNumber) {
    const project = normalizeTrackerCode(projectCode);
    return `${project}-${taskNumber}`;
}
function parseKanbanTaskKey(key) {
    const normalized = normalizeTrackerCode(key);
    const lastDash = normalized.lastIndexOf("-");
    if (lastDash <= 0)
        return null;
    const numPart = normalized.slice(lastDash + 1);
    if (!/^\d+$/.test(numPart))
        return null;
    const taskNumber = Number(numPart);
    if (!Number.isSafeInteger(taskNumber) || taskNumber < 1)
        return null;
    return {
        projectCode: normalized.slice(0, lastDash),
        taskNumber,
    };
}
/**
 * Разбирает ключ доски по известным кодам проектов (longest-prefix match).
 * SUM-RM → проект SUM-RM, slug MAIN; SUM-RM-HEAP → проект SUM-RM, slug HEAP.
 */
function parseKanbanBoardKey(key, projectCodes) {
    const normalized = normalizeTrackerCode(key);
    if (!normalized)
        return null;
    const codes = [...new Set(projectCodes.map(normalizeTrackerCode))].sort((a, b) => b.length - a.length);
    for (const projectCode of codes) {
        if (normalized === projectCode) {
            return { projectCode, boardSlug: DEFAULT_BOARD_SLUG };
        }
        const prefix = `${projectCode}-`;
        if (normalized.startsWith(prefix)) {
            const boardSlug = normalized.slice(prefix.length);
            if (boardSlug) {
                return { projectCode, boardSlug };
            }
        }
    }
    return null;
}
