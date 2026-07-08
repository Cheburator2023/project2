import { V2_SOURCE_SYSTEMS_ARRAY_PATH } from "@smart-anketa/api-contract";

function readDotPath(data: Record<string, unknown>, path: string): unknown {
	return path.split(".").reduce<unknown>((cur, key) => {
		if (!cur || typeof cur !== "object" || Array.isArray(cur)) return undefined;
		return (cur as Record<string, unknown>)[key];
	}, data);
}

function readSourceSystemRows(
	formData: Record<string, unknown>,
): Record<string, unknown>[] {
	const canonical = readDotPath(formData, V2_SOURCE_SYSTEMS_ARRAY_PATH);
	if (Array.isArray(canonical) && canonical.length > 0) {
		return canonical.filter(
			(row): row is Record<string, unknown> =>
				Boolean(row) && typeof row === "object" && !Array.isArray(row),
		);
	}
	const legacy = readDotPath(formData, "streamDataSources.sourceSystems");
	if (!Array.isArray(legacy)) return [];
	return legacy.filter(
		(row): row is Record<string, unknown> =>
			Boolean(row) && typeof row === "object" && !Array.isArray(row),
	);
}

/**
 * Строка системы-источника из превью анкеты для проверки триггеров работы.
 * Разделение внутр/внеш убрано — берём первую систему-источник (гейтинг по типу
 * теперь выполняют триггеры самой работы).
 */
export function resolvePreviewSourceRowForTypicalWork(
	formData: Record<string, unknown> | undefined | null,
): Record<string, unknown> | undefined {
	if (!formData) return undefined;
	const rows = readSourceSystemRows(formData);
	return rows[0];
}
