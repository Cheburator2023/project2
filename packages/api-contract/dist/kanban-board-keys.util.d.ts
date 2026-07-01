/** Нормализует код/slug трекера: trim + UPPERCASE. */
export declare function normalizeTrackerCode(value: string): string;
/** Crockford Base32 ULID (26 символов). */
export declare function isKanbanUlid(value: string): boolean;
/** Внутренний id записи трекера (stock seed — 24 симв., ULID — 26). */
export declare function isKanbanRecordId(value: string): boolean;
/** Ключ доски в URL: PROJECT или PROJECT-SLUG (slug MAIN опускается). */
export declare function formatKanbanBoardKey(projectCode: string, boardSlug: string): string;
/** Ключ задачи в URL: PROJECT-N (например SMARTA-1). */
export declare function formatKanbanTaskKey(projectCode: string, taskNumber: number): string;
export declare function parseKanbanTaskKey(key: string): {
    projectCode: string;
    taskNumber: number;
} | null;
/**
 * Разбирает ключ доски по известным кодам проектов (longest-prefix match).
 * SUM-RM → проект SUM-RM, slug MAIN; SUM-RM-HEAP → проект SUM-RM, slug HEAP.
 */
export declare function parseKanbanBoardKey(key: string, projectCodes: readonly string[]): {
    projectCode: string;
    boardSlug: string;
} | null;
