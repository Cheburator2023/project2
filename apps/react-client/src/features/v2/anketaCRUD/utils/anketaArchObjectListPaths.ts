import { getValueAtPath } from "./anketaModalArrayTableConfig";
import {
	isArchObjectFilled,
	type AnketaObjectTableColumn,
} from "./anketaArchObjectTableConfig";

/** Арх. блоки, которые в UI ведут себя как списки (как sourceSystems), хотя в схеме — object. */
export const ANKETA_ARCH_OBJECT_LIST_PATHS = [
	"generalInfo.modelService",
	"detailInfo.dataProcess",
	"detailInfo.dataMart",
] as const;

export type AnketaArchObjectListPath =
	(typeof ANKETA_ARCH_OBJECT_LIST_PATHS)[number];

const ARCH_OBJECT_LIST_PATH_SET = new Set<string>(
	ANKETA_ARCH_OBJECT_LIST_PATHS,
);

export function isAnketaArchObjectListPath(path: string): boolean {
	return ARCH_OBJECT_LIST_PATH_SET.has(path);
}

function asRecord(value: unknown): Record<string, unknown> | null {
	if (!value || typeof value !== "object" || Array.isArray(value)) return null;
	return value as Record<string, unknown>;
}

/** Читает список записей арх. блока (массив или legacy singleton object). */
export function readArchObjectListAtPath(
	data: Record<string, unknown>,
	path: string,
): Record<string, unknown>[] {
	const value = getValueAtPath(data, path);
	if (Array.isArray(value)) {
		return value
			.filter(
				(item): item is Record<string, unknown> =>
					item != null && typeof item === "object" && !Array.isArray(item),
			)
			.filter(isArchObjectFilled);
	}
	const record = asRecord(value);
	if (record && isArchObjectFilled(record)) return [record];
	return [];
}

function clonePathRoot(data: Record<string, unknown>, path: string): {
	next: Record<string, unknown>;
	parent: Record<string, unknown>;
	lastKey: string;
} {
	const parts = path.split(".");
	const next = { ...data };
	let current: Record<string, unknown> = next;

	for (let i = 0; i < parts.length - 1; i++) {
		const key = parts[i];
		const child = asRecord(current[key]) ?? {};
		current[key] = { ...child };
		current = current[key] as Record<string, unknown>;
	}

	return {
		next,
		parent: current,
		lastKey: parts[parts.length - 1],
	};
}

/** Записывает список арх. блока в formData (всегда массив). */
export function writeArchObjectListAtPath(
	data: Record<string, unknown>,
	path: string,
	items: Record<string, unknown>[],
): Record<string, unknown> {
	const { next, parent, lastKey } = clonePathRoot(data, path);
	parent[lastKey] = items;
	return next;
}

export function appendArchObjectListItem(
	data: Record<string, unknown>,
	path: string,
	item: Record<string, unknown>,
): Record<string, unknown> {
	return writeArchObjectListAtPath(data, path, [
		...readArchObjectListAtPath(data, path),
		item,
	]);
}

export function updateArchObjectListItem(
	data: Record<string, unknown>,
	path: string,
	index: number,
	item: Record<string, unknown>,
): Record<string, unknown> {
	const list = readArchObjectListAtPath(data, path);
	return writeArchObjectListAtPath(
		data,
		path,
		list.map((entry, idx) => (idx === index ? { ...entry, ...item } : entry)),
	);
}

export function removeArchObjectListItem(
	data: Record<string, unknown>,
	path: string,
	index: number,
): Record<string, unknown> {
	const list = readArchObjectListAtPath(data, path);
	return writeArchObjectListAtPath(
		data,
		path,
		list.filter((_, idx) => idx !== index),
	);
}

export function archObjectListRowLabel(
	item: Record<string, unknown>,
	columns: AnketaObjectTableColumn[] | null,
	index: number,
): string {
	if (columns) {
		for (const column of columns) {
			const value = column.render(item);
			if (value && value !== "—") return value;
		}
	}
	const name = item.name ?? item.field_dEVFQVQn ?? item.field_It-B8PfV;
	if (name != null && String(name).trim()) return String(name);
	return `Запись ${index + 1}`;
}
