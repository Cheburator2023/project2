/** Нормализует код/slug трекера: trim + UPPERCASE. */
export function normalizeTrackerCode(value: string): string {
	return value.trim().toUpperCase();
}

/** Crockford Base32 ULID (26 символов). */
export function isKanbanUlid(value: string): boolean {
	return /^[0-9A-HJKMNP-TV-Z]{26}$/i.test(value.trim());
}

/** Внутренний id записи трекера (stock seed — 24 симв., ULID — 26). */
export function isKanbanRecordId(value: string): boolean {
	return /^[0-9A-HJKMNP-TV-Z]{24,26}$/i.test(value.trim());
}

const DEFAULT_BOARD_SLUG = "MAIN";

/**
 * Публичный ключ доски = сохранённый slug.
 * MAIN / пусто → код проекта (главная доска).
 */
export function formatKanbanBoardKey(
	projectCode: string,
	boardSlug: string,
): string {
	const project = normalizeTrackerCode(projectCode);
	const slug = normalizeTrackerCode(boardSlug);
	if (!slug || slug === DEFAULT_BOARD_SLUG) {
		return project;
	}
	return slug;
}

/**
 * Сохраняет публичный ключ как есть.
 * MAIN / пусто / код проекта → MAIN; иначе ключ не префиксируется проектом.
 */
export function boardKeyToSlug(
	boardKey: string,
	projectCode: string,
): string {
	const key = normalizeTrackerCode(boardKey);
	const project = normalizeTrackerCode(projectCode);
	if (!key || key === DEFAULT_BOARD_SLUG || key === project) {
		return DEFAULT_BOARD_SLUG;
	}
	return key;
}

/** Ключ задачи в URL: BOARDKEY-N (SMARTA-1 или SUM-RM-HEAP-42). */
export function formatKanbanTaskKey(
	boardKey: string,
	taskNumber: number,
): string {
	const prefix = normalizeTrackerCode(boardKey);
	return `${prefix}-${taskNumber}`;
}

export function formatKanbanTaskKeyForBoard(
	projectCode: string,
	boardSlug: string,
	taskNumber: number,
): string {
	return formatKanbanTaskKey(
		formatKanbanBoardKey(projectCode, boardSlug),
		taskNumber,
	);
}

export function parseKanbanTaskKey(
	key: string,
): { projectCode: string; taskNumber: number } | null {
	const normalized = normalizeTrackerCode(key);
	const lastDash = normalized.lastIndexOf("-");
	if (lastDash <= 0) return null;
	const numPart = normalized.slice(lastDash + 1);
	if (!/^\d+$/.test(numPart)) return null;
	const taskNumber = Number(numPart);
	if (!Number.isSafeInteger(taskNumber) || taskNumber < 1) return null;
	return {
		projectCode: normalized.slice(0, lastDash),
		taskNumber,
	};
}

/**
 * Разбирает ключ доски по известным кодам проектов (longest-prefix match).
 * SUM-RM → проект SUM-RM, slug MAIN; SUM-RM-HEAP → проект SUM-RM, slug HEAP.
 */
export function parseKanbanBoardKey(
	key: string,
	projectCodes: readonly string[],
): { projectCode: string; boardSlug: string } | null {
	const normalized = normalizeTrackerCode(key);
	if (!normalized) return null;

	const codes = [...new Set(projectCodes.map(normalizeTrackerCode))].sort(
		(a, b) => b.length - a.length,
	);

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
