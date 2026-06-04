function isPlainRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/** Глубокий merge: `overlay` перекрывает `base` (ввод пользователя важнее калькуляции). */
function deepMergeRecords(
	base: Record<string, unknown>,
	overlay: Record<string, unknown>,
): Record<string, unknown> {
	const next: Record<string, unknown> = { ...base };

	for (const [key, overlayValue] of Object.entries(overlay)) {
		const baseValue = next[key];
		if (isPlainRecord(baseValue) && isPlainRecord(overlayValue)) {
			next[key] = deepMergeRecords(baseValue, overlayValue);
		} else {
			next[key] = overlayValue;
		}
	}

	return next;
}

/**
 * Данные для RJSF: результат калькуляции + актуальный ввод пользователя
 * (модалки пишут в `formData`, таблицы читают те же пути).
 */
export function mergeAnketaDisplayFormData(
	formData: Record<string, unknown>,
	liveFormData?: Record<string, unknown>,
): Record<string, unknown> {
	if (!liveFormData || Object.keys(liveFormData).length === 0) {
		return formData;
	}
	return deepMergeRecords(liveFormData, formData);
}
