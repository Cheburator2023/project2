function isPlainRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

const GENERATED_TYPICAL_WORK_ARRAY_PATHS = [
	"streamDataSources.sourceTypicalTasks",
	"detailInfo.detailTypicalTasks",
	"generalInfo.modelService.controlTypicalTasks",
] as const;

function readAtPath(data: Record<string, unknown>, path: string): unknown {
	return path.split(".").reduce<unknown>((cur, key) => {
		if (!isPlainRecord(cur)) return undefined;
		return cur[key];
	}, data);
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
	let merged = deepMergeRecords(liveFormData, formData);

	// Эти массивы генерируются калькуляцией и read-only в анкете. Если в сохранённых
	// данных остались старые строки, показываем актуальный результат /calculate.
	for (const path of GENERATED_TYPICAL_WORK_ARRAY_PATHS) {
		const liveValue = readAtPath(liveFormData, path);
		if (Array.isArray(liveValue)) {
			merged = writeAtPath(merged, path, liveValue);
		}
	}

	return merged;
}
