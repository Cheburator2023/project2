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

/** Ключ доски в URL: PROJECT или PROJECT-SLUG (slug MAIN опускается). */
export function formatKanbanBoardKey(
	projectCode: string,
	boardSlug: string,
): string {
	const project = normalizeTrackerCode(projectCode);
	const slug = normalizeTrackerCode(boardSlug);
	if (!slug || slug === DEFAULT_BOARD_SLUG || slug === project) {
		return project;
	}
	return `${project}-${slug}`;
}

/** Ключ задачи в URL: PROJECT-N (например SMARTA-1). */
export function formatKanbanTaskKey(
	projectCode: string,
	taskNumber: number,
): string {
	const project = normalizeTrackerCode(projectCode);
	return `${project}-${taskNumber}`;
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
