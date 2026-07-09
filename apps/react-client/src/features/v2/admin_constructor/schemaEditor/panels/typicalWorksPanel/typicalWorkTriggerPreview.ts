import {
	hasTypicalWorkStreamTriggerContext,
	isFilledTypicalWorkSourceRow,
	readTypicalWorksStreamTriggerContext,
	resolveSourceTypicalWorksOutputPath,
	V2_SOURCE_SYSTEMS_ARRAY_PATH,
	V2_SOURCE_TYPICAL_TASKS_OUTPUT_PATH,
} from "@smart-anketa/api-contract";

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
 * Контекст анкеты для проверки триггеров работы в превью конструктора.
 * Сначала строка системы-источника; если её нет — поля стрима или корня формы.
 */
export function resolvePreviewSourceRowForTypicalWork(
	formData: Record<string, unknown> | undefined | null,
	uiSchema?: Record<string, unknown>,
	jsonSchema?: Record<string, unknown>,
): Record<string, unknown> | undefined {
	if (!formData) return undefined;
	const filledRow = readSourceSystemRows(formData).find(isFilledTypicalWorkSourceRow);
	if (filledRow) return filledRow;

	const outputPath =
		resolveSourceTypicalWorksOutputPath(jsonSchema, uiSchema) ??
		V2_SOURCE_TYPICAL_TASKS_OUTPUT_PATH;
	const triggerContext = readTypicalWorksStreamTriggerContext(
		formData,
		outputPath,
		uiSchema,
	);
	return hasTypicalWorkStreamTriggerContext(triggerContext)
		? triggerContext
		: undefined;
}
