import { ulid } from "ulid";
import { normalizeTrackerCode } from "@smart-anketa/api-contract";

/** Короткий уникальный код для реестров трекера (UPPERCASE, можно отредактировать). */
export function generateTrackerAutoCode(prefix: string): string {
	const normalizedPrefix = normalizeTrackerCode(prefix).replace(/[^A-Z0-9]+/g, "-");
	const suffix = ulid().slice(-8).toUpperCase();
	return normalizedPrefix ? `${normalizedPrefix}-${suffix}` : suffix;
}

export function normalizeTrackerFormCode(value: string): string {
	return normalizeTrackerCode(value);
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
