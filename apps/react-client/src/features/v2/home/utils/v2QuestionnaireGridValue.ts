import type {
	V2QuestionnaireGridRow,
	V2QuestionnaireVersionRow,
} from "../types/v2QuestionnaireGrid.types";

/** Данные версии анкеты для ячейки грида. */
export function resolveVersionRow(
	row: V2QuestionnaireGridRow | undefined,
): V2QuestionnaireVersionRow | null {
	if (!row || row.rowKind !== "version") return null;
	return row;
}

/** Выбранные версии: группа серии разворачивается в детей. */
export function collectSelectedVersionRows(
	rows: readonly V2QuestionnaireGridRow[],
): V2QuestionnaireVersionRow[] {
	const byId = new Map<string, V2QuestionnaireVersionRow>();
	for (const row of rows) {
		if (row.rowKind === "series") {
			for (const child of row.children) {
				byId.set(child.id, child);
			}
			continue;
		}
		if (row.rowKind === "version") {
			byId.set(row.id, row);
		}
	}
	return [...byId.values()];
}

export function versionFormData(
	row: V2QuestionnaireGridRow | undefined,
): Record<string, unknown> | null {
	const version = resolveVersionRow(row);
	if (!version) return null;
	return version.formData ?? {};
}

export function getFormValue(
	row: V2QuestionnaireGridRow | undefined,
	path: string,
): unknown {
	const data = versionFormData(row);
	if (!data) return undefined;
	return getByPath(data, path);
}

function getByPath(obj: unknown, path: string): unknown {
	const parts = path.split(".");
	let current: unknown = obj;
	for (const part of parts) {
		if (current == null || typeof current !== "object") return undefined;
		const match = /^(\w+)\[(\d+)\]$/.exec(part);
		if (match) {
			const [, key, indexStr] = match;
			const container = (current as Record<string, unknown>)[key];
			if (!Array.isArray(container)) return undefined;
			current = container[Number.parseInt(indexStr, 10)];
		} else {
			current = (current as Record<string, unknown>)[part];
		}
	}
	return current;
}

export function formatGridCellValue(value: unknown): string | number | null {
	if (value == null || value === "") return null;
	if (typeof value === "boolean") return value ? "Да" : "Нет";
	if (typeof value === "number") return value;
	if (Array.isArray(value)) {
		return value
			.map((item) =>
				typeof item === "object" && item != null
					? JSON.stringify(item)
					: String(item),
			)
			.join("; ");
	}
	if (typeof value === "object") return JSON.stringify(value);
	return String(value);
}

/** @deprecated используйте registryFormColumnId из @smart-anketa/api-contract */
export function formPathColId(path: string): string {
	return `form.${path}`;
}
