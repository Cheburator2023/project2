import {
	collectGeneratedTypicalWorkArrayPaths,
	V2_CONTROL_TYPICAL_TASKS_OUTPUT_PATH,
	V2_SOURCE_TYPICAL_TASKS_OUTPUT_PATH,
} from "@smart-anketa/api-contract";

function isPlainRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

const FALLBACK_GENERATED_TYPICAL_WORK_ARRAY_PATHS = [
	V2_SOURCE_TYPICAL_TASKS_OUTPUT_PATH,
	V2_CONTROL_TYPICAL_TASKS_OUTPUT_PATH,
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

function resolveGeneratedTypicalWorkPaths(
	uiSchema?: Record<string, unknown>,
): string[] {
	const dynamic = uiSchema
		? collectGeneratedTypicalWorkArrayPaths(uiSchema)
		: [];
	return [...new Set([...FALLBACK_GENERATED_TYPICAL_WORK_ARRAY_PATHS, ...dynamic])];
}

/**
 * Данные для RJSF: результат калькуляции + актуальный ввод пользователя
 * (модалки пишут в `formData`, таблицы читают те же пути).
 */
export function mergeAnketaDisplayFormData(
	formData: Record<string, unknown>,
	liveFormData?: Record<string, unknown>,
	uiSchema?: Record<string, unknown>,
): Record<string, unknown> {
	if (!liveFormData || Object.keys(liveFormData).length === 0) {
		return formData;
	}
	let merged = deepMergeRecords(liveFormData, formData);

	for (const path of resolveGeneratedTypicalWorkPaths(uiSchema)) {
		const liveValue = readAtPath(liveFormData, path);
		if (Array.isArray(liveValue)) {
			merged = writeAtPath(merged, path, liveValue);
		}
	}

	return merged;
}
