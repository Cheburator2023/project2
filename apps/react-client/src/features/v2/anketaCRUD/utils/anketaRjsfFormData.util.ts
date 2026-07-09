import {
	ANKETA_ARCH_OBJECT_LIST_PATHS,
} from "./anketaArchObjectListPaths";
import { getValueAtPath } from "./anketaModalArrayTableConfig";

function isPlainRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function writeAtPath(
	data: Record<string, unknown>,
	path: string,
	value: unknown,
): Record<string, unknown> {
	const parts = path.split(".");
	const next = { ...data };
	let cur: Record<string, unknown> = next;

	for (let i = 0; i < parts.length - 1; i++) {
		const key = parts[i];
		const child = isPlainRecord(cur[key]) ? { ...cur[key] } : {};
		cur[key] = child;
		cur = child;
	}

	cur[parts[parts.length - 1]] = value;
	return next;
}

/**
 * RJSF валидирует arch-блоки как object, а в formData они хранятся массивом.
 * Подменяем массив пустым object только для слоя отображения/валидации RJSF.
 */
export function normalizeAnketaFormDataForRjsf(
	data: Record<string, unknown>,
): Record<string, unknown> {
	let next = data;

	for (const path of ANKETA_ARCH_OBJECT_LIST_PATHS) {
		const value = getValueAtPath(next, path);
		if (Array.isArray(value)) {
			next = writeAtPath(next, path, {});
		}
	}

	return next;
}

/** Сохраняет pseudo-array arch-блоков при записи onChange из RJSF. */
export function applyRjsfFormChangeToAnketaFormData(
	storage: Record<string, unknown>,
	rjsfData: Record<string, unknown>,
): Record<string, unknown> {
	let next = rjsfData;

	for (const path of ANKETA_ARCH_OBJECT_LIST_PATHS) {
		const stored = getValueAtPath(storage, path);
		if (Array.isArray(stored)) {
			next = writeAtPath(next, path, stored);
		}
	}

	return next;
}
