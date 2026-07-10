import { resolveV2AnketaArchComponent } from "./v2-anketa-section-ui.util";

export const V2_SOURCE_TYPICAL_TASKS_OUTPUT_PATH =
	"streamDataSources.sourceTypicalTasks";

/** Канонический вывод типовых работ «Контроль моделей». */
export const V2_CONTROL_TYPICAL_TASKS_OUTPUT_PATH =
	"streamModelControl.field_Khn6-HAW";

/** Legacy/fan-out пути, куда раньше дублировались сгенерированные типовые работы. */
export const LEGACY_GENERATED_TYPICAL_WORK_ARRAY_PATHS = [
	V2_SOURCE_TYPICAL_TASKS_OUTPUT_PATH,
	V2_CONTROL_TYPICAL_TASKS_OUTPUT_PATH,
	"detailInfo.detailTypicalTasks",
	"detailInfo.sourceTypicalTasks",
	"generalInfo.modelService.controlTypicalTasks",
] as const;

function writeAtDotPath(
	data: Record<string, unknown>,
	dotPath: string,
	value: unknown,
): Record<string, unknown> {
	const parts = dotPath.split(".").filter(Boolean);
	if (parts.length === 0) return data;
	const next = { ...data };
	let cur: Record<string, unknown> = next;
	for (let i = 0; i < parts.length - 1; i++) {
		const key = parts[i];
		const child = readRecord(cur[key]) ?? {};
		cur[key] = { ...child };
		cur = cur[key] as Record<string, unknown>;
	}
	cur[parts[parts.length - 1]] = value;
	return next;
}

function readRecord(value: unknown): Record<string, unknown> | undefined {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: undefined;
}

/** Dot-пути read-only массивов «Типовые работы» из uiSchema (archComponent: typicalWork). */
export function collectGeneratedTypicalWorkArrayPaths(
	uiSchema: unknown,
	prefix = "",
): string[] {
	const branch = readRecord(uiSchema);
	if (!branch) return [];

	const paths: string[] = [];
	const arch = resolveV2AnketaArchComponent(branch);
	if (arch === "typicalWork" && prefix) {
		paths.push(prefix);
	}

	for (const key of Object.keys(branch)) {
		if (key.startsWith("ui:")) continue;
		paths.push(
			...collectGeneratedTypicalWorkArrayPaths(
				branch[key],
				prefix ? `${prefix}.${key}` : key,
			),
		);
	}

	return [...new Set(paths)];
}

/** Путь вывода типовых работ «Система-источник» по схеме (канонический или пользовательский). */
export function resolveSourceTypicalWorksOutputPath(
	jsonSchema?: unknown,
	uiSchema?: unknown,
): string | null {
	if (
		jsonSchemaHasResolvablePath(jsonSchema, V2_SOURCE_TYPICAL_TASKS_OUTPUT_PATH)
	) {
		return V2_SOURCE_TYPICAL_TASKS_OUTPUT_PATH;
	}

	const generated = collectGeneratedTypicalWorkArrayPaths(uiSchema);
	const streamPath = generated.find((path) =>
		path.startsWith("streamDataSources."),
	);
	if (streamPath) return streamPath;

	const detailPath = generated.find((path) => path.startsWith("detailInfo."));
	if (detailPath) return detailPath;

	return generated[0] ?? null;
}

/** Есть ли в jsonSchema узел по dot-пути (только `properties`, без $ref). */
export function jsonSchemaHasResolvablePath(
	jsonSchema: unknown,
	dotPath: string,
): boolean {
	const root = readRecord(jsonSchema);
	if (!root) return false;

	const segments = dotPath.split(".").filter(Boolean);
	let node: unknown = root;

	for (const segment of segments) {
		const obj = readRecord(node);
		if (!obj) return false;
		const properties = readRecord(obj.properties);
		if (!properties || !(segment in properties)) return false;
		node = properties[segment];
	}

	return true;
}

/** Все известные пути read-only массивов типовых работ (uiSchema + legacy). */
export function listAllGeneratedTypicalWorkArrayPaths(
	uiSchema?: unknown,
): string[] {
	const dynamic = uiSchema
		? collectGeneratedTypicalWorkArrayPaths(uiSchema)
		: [];
	return [...new Set([...LEGACY_GENERATED_TYPICAL_WORK_ARRAY_PATHS, ...dynamic])];
}

/**
 * Сбрасывает устаревшие fan-out массивы типовых работ, оставляя только
 * актуальный `outputArrayPath` (после replace/clear в калькуляторе).
 */
export function clearStaleGeneratedTypicalWorkPaths(
	data: Record<string, unknown>,
	outputArrayPath: string,
	uiSchema?: unknown,
): Record<string, unknown> {
	let next = data;
	for (const path of listAllGeneratedTypicalWorkArrayPaths(uiSchema)) {
		if (path === outputArrayPath) continue;
		next = writeAtDotPath(next, path, []);
	}
	return next;
}
