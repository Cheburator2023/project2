import {
	ANKETA_ARCH_OBJECT_LIST_PATHS,
} from "./anketaArchObjectListPaths";
import { getValueAtPath } from "./anketaModalArrayTableConfig";
import { collectGeneratedTypicalWorkArrayPaths } from "@smart-anketa/api-contract";

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
	uiSchema?: Record<string, unknown>,
): Record<string, unknown> {
	let next = rjsfData;

	for (const path of ANKETA_ARCH_OBJECT_LIST_PATHS) {
		const stored = getValueAtPath(storage, path);
		if (Array.isArray(stored)) {
			next = writeAtPath(next, path, stored);
		}
	}

	const generatedTypicalWorkPaths = uiSchema
		? collectGeneratedTypicalWorkArrayPaths(uiSchema)
		: [];
	for (const path of generatedTypicalWorkPaths) {
		const stored = getValueAtPath(storage, path);
		if (Array.isArray(stored)) {
			next = writeAtPath(next, path, stored);
			continue;
		}
		const { next: withoutPath, removed } = removeAtPath(next, path);
		if (removed) next = withoutPath;
	}

	return next;
}

function removeAtPath(
	data: Record<string, unknown>,
	path: string,
): { next: Record<string, unknown>; removed: boolean } {
	const parts = path.split(".");
	if (parts.length === 1) {
		if (!(parts[0] in data)) return { next: data, removed: false };
		const next = { ...data };
		delete next[parts[0]];
		return { next, removed: true };
	}

	const [head, ...rest] = parts;
	const child = data[head];
	if (!isPlainRecord(child)) return { next: data, removed: false };

	const nested = removeAtPath(child, rest.join("."));
	if (!nested.removed) return { next: data, removed: false };

	const next = { ...data };
	if (Object.keys(nested.next).length === 0) {
		delete next[head];
	} else {
		next[head] = nested.next;
	}
	return { next, removed: true };
}
