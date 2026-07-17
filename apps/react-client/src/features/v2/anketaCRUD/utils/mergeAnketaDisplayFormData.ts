import {
	collectAtypicalWorkArrayPaths,
	collectGeneratedTypicalWorkArrayPaths,
	V2_CONTROL_TYPICAL_TASKS_OUTPUT_PATH,
	V2_SOURCE_TYPICAL_TASKS_OUTPUT_PATH,
} from "@smart-anketa/api-contract";
import { ANKETA_ARCH_OBJECT_LIST_PATHS } from "./anketaArchObjectListPaths";

function isPlainRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

const FALLBACK_GENERATED_TYPICAL_WORK_ARRAY_PATHS = [
	V2_SOURCE_TYPICAL_TASKS_OUTPUT_PATH,
	V2_CONTROL_TYPICAL_TASKS_OUTPUT_PATH,
	"detailInfo.detailTypicalTasks",
	"generalInfo.modelService.controlTypicalTasks",
] as const;

const FALLBACK_ATYPICAL_WORK_ARRAY_PATHS = [
	"streamDataSources.atypicalTasks",
	"detailInfo.detailAtypicalTasks",
	"streamModelControl.atypicalTasks",
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
	if (uiSchema) {
		const activePaths = collectGeneratedTypicalWorkArrayPaths(uiSchema);
		if (activePaths.length > 0) return activePaths;
	}
	return [...FALLBACK_GENERATED_TYPICAL_WORK_ARRAY_PATHS];
}

function resolveAtypicalWorkPaths(uiSchema?: Record<string, unknown>): string[] {
	const paths = uiSchema
		? collectAtypicalWorkArrayPaths(uiSchema)
		: [...FALLBACK_ATYPICAL_WORK_ARRAY_PATHS];
	return paths.length > 0 ? paths : [...FALLBACK_ATYPICAL_WORK_ARRAY_PATHS];
}

/** Подставляет row.total из liveFormData после deepMerge — иначе ввод в модалке затирает калькуляцию. */
function applyCalculatedAtypicalWorkRowTotals(
	merged: Record<string, unknown>,
	liveFormData: Record<string, unknown>,
	paths: string[],
): Record<string, unknown> {
	let next = merged;

	for (const path of paths) {
		const mergedArr = readAtPath(next, path);
		const liveArr = readAtPath(liveFormData, path);
		if (!Array.isArray(mergedArr) || !Array.isArray(liveArr)) continue;

		const patched = mergedArr.map((row, index) => {
			if (!isPlainRecord(row)) return row;
			const liveRow = liveArr[index];
			if (!isPlainRecord(liveRow)) return row;
			const liveTotal = liveRow.total;
			if (liveTotal === undefined || liveTotal === null) return row;
			return { ...row, total: liveTotal };
		});

		next = writeAtPath(next, path, patched);
	}

	return next;
}

/** Не затирать pseudo-array арх. блока (modelService и т.п.) при записи вложенных generated paths. */
function shouldSkipGeneratedPathWrite(
	data: Record<string, unknown>,
	path: string,
): boolean {
	for (const archPath of ANKETA_ARCH_OBJECT_LIST_PATHS) {
		if (path === archPath || !path.startsWith(`${archPath}.`)) continue;
		return Array.isArray(readAtPath(data, archPath));
	}
	return false;
}

function fanOutTypicalWorkLiveData(
	merged: Record<string, unknown>,
	liveFormData: Record<string, unknown>,
	paths: string[],
): Record<string, unknown> {
	let sourcePath: string | null = null;
	let sourceValue: unknown[] | null = null;

	for (const path of paths) {
		const liveValue = readAtPath(liveFormData, path);
		if (!Array.isArray(liveValue)) continue;
		if (liveValue.length > 0) {
			sourcePath = path;
			sourceValue = liveValue;
			break;
		}
		if (!sourcePath) {
			sourcePath = path;
			sourceValue = liveValue;
		}
	}

	if (!sourcePath || !sourceValue) return merged;

	if (sourceValue.length === 0) {
		let cleared = merged;
		for (const path of paths) {
			if (shouldSkipGeneratedPathWrite(cleared, path)) continue;
			cleared = writeAtPath(cleared, path, []);
		}
		return cleared;
	}

	let next = merged;
	for (const path of paths) {
		if (path === sourcePath) continue;
		if (shouldSkipGeneratedPathWrite(next, path)) continue;
		const current = readAtPath(next, path);
		if (!Array.isArray(current) || current.length === 0) {
			next = writeAtPath(next, path, sourceValue);
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
	uiSchema?: Record<string, unknown>,
): Record<string, unknown> {
	if (!liveFormData || Object.keys(liveFormData).length === 0) {
		return formData;
	}
	let merged = deepMergeRecords(liveFormData, formData);

	// Итоговая оценка и «Подробный расчёт» — только с сервера; в formData часто лежит устаревший snapshot.
	const liveSummary = readAtPath(liveFormData, "summary");
	if (isPlainRecord(liveSummary)) {
		merged = writeAtPath(merged, "summary", liveSummary);
	}

	const generatedPaths = resolveGeneratedTypicalWorkPaths(uiSchema);

	for (const path of generatedPaths) {
		if (shouldSkipGeneratedPathWrite(merged, path)) continue;
		const liveValue = readAtPath(liveFormData, path);
		if (Array.isArray(liveValue)) {
			merged = writeAtPath(merged, path, liveValue);
		}
	}

	merged = applyCalculatedAtypicalWorkRowTotals(
		merged,
		liveFormData,
		resolveAtypicalWorkPaths(uiSchema),
	);

	return fanOutTypicalWorkLiveData(merged, liveFormData, generatedPaths);
}
