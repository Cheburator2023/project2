import { ulid } from "ulid";

/** Короткий уникальный код для реестров трекера (можно отредактировать перед сохранением). */
export function generateTrackerAutoCode(prefix: string): string {
	const normalizedPrefix = prefix.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
	const suffix = ulid().slice(-8).toLowerCase();
	return normalizedPrefix ? `${normalizedPrefix}-${suffix}` : suffix;
}

export function buildTrackerCreateFormValues(
	fields: { name: string; autoGenerate?: string }[],
	base: Record<string, string> = {},
): Record<string, string> {
	const next = { ...base };
	for (const field of fields) {
		if (field.autoGenerate && !next[field.name]?.trim()) {
			next[field.name] = generateTrackerAutoCode(field.autoGenerate);
		}
	}
	return next;
}

export const TRACKER_EMPTY_FORM_VALUES: Record<string, string> = {};
