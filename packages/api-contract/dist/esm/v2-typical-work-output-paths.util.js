import { resolveV2AnketaArchComponent, resolveStreamExecutorForTypicalWorkOutputPath, } from "./v2-anketa-section-ui.util";
import { typicalWorkAssignedToAnyExecutorStream } from "./v2-executor-streams.util";
export const V2_SOURCE_TYPICAL_TASKS_OUTPUT_PATH = "streamDataSources.sourceTypicalTasks";
/** Канонический вывод типовых работ «Контроль моделей». */
export const V2_CONTROL_TYPICAL_TASKS_OUTPUT_PATH = "streamModelControl.field_G0AoYAl8";
/** Устаревшие пути вывода типовых работ «Контроль моделей». */
export const LEGACY_CONTROL_TYPICAL_TASKS_OUTPUT_PATHS = [
    "streamModelControl.field_Khn6-HAW",
    "streamModelControl.control.controlTypicalTasks",
];
/** Ключ ui:options — привязанные к блоку id типовых работ (сохраняется в снепшоте). */
export const TYPICAL_WORK_BOUND_WORK_IDS_KEY = "boundWorkIds";
/** Legacy/fan-out пути, куда раньше дублировались сгенерированные типовые работы. */
export const LEGACY_GENERATED_TYPICAL_WORK_ARRAY_PATHS = [
    V2_SOURCE_TYPICAL_TASKS_OUTPUT_PATH,
    ...LEGACY_CONTROL_TYPICAL_TASKS_OUTPUT_PATHS,
    V2_CONTROL_TYPICAL_TASKS_OUTPUT_PATH,
    "detailInfo.detailTypicalTasks",
    "detailInfo.sourceTypicalTasks",
    "generalInfo.modelService.controlTypicalTasks",
];
function writeAtDotPath(data, dotPath, value) {
    const parts = dotPath.split(".").filter(Boolean);
    if (parts.length === 0)
        return data;
    const next = { ...data };
    let cur = next;
    for (let i = 0; i < parts.length - 1; i++) {
        const key = parts[i];
        const child = readRecord(cur[key]) ?? {};
        cur[key] = { ...child };
        cur = cur[key];
    }
    cur[parts[parts.length - 1]] = value;
    return next;
}
function readRecord(value) {
    return value && typeof value === "object" && !Array.isArray(value)
        ? value
        : undefined;
}
/** Dot-пути read-only массивов «Типовые работы» из uiSchema (archComponent: typicalWork). */
export function collectGeneratedTypicalWorkArrayPaths(uiSchema, prefix = "") {
    const branch = readRecord(uiSchema);
    if (!branch)
        return [];
    const paths = [];
    const arch = resolveV2AnketaArchComponent(branch);
    if (arch === "typicalWork" && prefix) {
        paths.push(prefix);
    }
    for (const key of Object.keys(branch)) {
        if (key.startsWith("ui:"))
            continue;
        paths.push(...collectGeneratedTypicalWorkArrayPaths(branch[key], prefix ? `${prefix}.${key}` : key));
    }
    return [...new Set(paths)];
}
function readUiSchemaBranchAtOutputPath(uiSchema, dotPath) {
    const segments = dotPath.split(".").filter(Boolean);
    let cur = uiSchema;
    for (const segment of segments) {
        const branch = readRecord(cur);
        if (!branch || !(segment in branch))
            return undefined;
        cur = branch[segment];
    }
    return readRecord(cur);
}
/** Привязанные work id для блока typicalWork по dot-пути в uiSchema. */
export function readTypicalWorkBoundWorkIdsAtOutputPath(uiSchema, outputPath) {
    const branch = readUiSchemaBranchAtOutputPath(uiSchema, outputPath);
    const opts = readRecord(branch?.["ui:options"]);
    if (!opts || !(TYPICAL_WORK_BOUND_WORK_IDS_KEY in opts))
        return undefined;
    const raw = opts[TYPICAL_WORK_BOUND_WORK_IDS_KEY];
    if (!Array.isArray(raw))
        return [];
    return [
        ...new Set(raw.filter((id) => typeof id === "string" && id.trim().length > 0)),
    ];
}
/** Все блоки typicalWork с путями вывода и привязками работ. */
export function collectTypicalWorkBlockBindings(uiSchema) {
    return collectGeneratedTypicalWorkArrayPaths(uiSchema).map((outputPath) => ({
        outputPath,
        boundWorkIds: readTypicalWorkBoundWorkIdsAtOutputPath(uiSchema, outputPath),
    }));
}
function patchBoundWorkIdsAtOutputPath(uiSchema, outputPath, boundWorkIds) {
    const segments = outputPath.split(".").filter(Boolean);
    if (segments.length === 0)
        return uiSchema;
    const patchLeaf = (node, depth) => {
        const key = segments[depth];
        if (!key)
            return node;
        if (depth === segments.length - 1) {
            const existingChild = readRecord(node[key]) ?? {};
            const prevOpts = readRecord(existingChild["ui:options"]) ?? {};
            return {
                ...node,
                [key]: {
                    ...existingChild,
                    "ui:options": {
                        ...prevOpts,
                        [TYPICAL_WORK_BOUND_WORK_IDS_KEY]: [...new Set(boundWorkIds)],
                    },
                },
            };
        }
        const child = readRecord(node[key]) ?? {};
        return {
            ...node,
            [key]: patchLeaf(child, depth + 1),
        };
    };
    return patchLeaf({ ...uiSchema }, 0);
}
/**
 * Заменяет id работ в boundWorkIds после seed с переназначением uuid.
 */
export function remapBoundWorkIdsInUiSchema(uiSchema, workIdMap) {
    if (workIdMap.size === 0)
        return uiSchema;
    let next = uiSchema;
    for (const binding of collectTypicalWorkBlockBindings(uiSchema)) {
        if (!binding.boundWorkIds?.length)
            continue;
        const remapped = binding.boundWorkIds.map((id) => workIdMap.get(id) ?? id);
        if (remapped.every((id, index) => id === binding.boundWorkIds?.[index])) {
            continue;
        }
        next = patchBoundWorkIdsAtOutputPath(next, binding.outputPath, remapped);
    }
    return next;
}
/**
 * Заполняет boundWorkIds на legacy-блоках typicalWork по назначениям работ на стрим блока.
 * Вызывается после сида каталога в шаблон (id работ известны только после seed).
 */
export function backfillTypicalWorkBoundWorkIdsInUiSchema(uiSchema, catalog, options) {
    let next = uiSchema;
    for (const binding of collectTypicalWorkBlockBindings(uiSchema)) {
        if (binding.boundWorkIds !== undefined &&
            !options?.replaceExisting?.(binding.boundWorkIds)) {
            continue;
        }
        const streams = resolveStreamExecutorForTypicalWorkOutputPath(next, binding.outputPath);
        if (streams.length === 0)
            continue;
        const ids = catalog
            .filter((work) => typicalWorkAssignedToAnyExecutorStream(work.streams, streams))
            .map((work) => work.id);
        if (ids.length === 0)
            continue;
        next = patchBoundWorkIdsAtOutputPath(next, binding.outputPath, ids);
    }
    return next;
}
/**
 * Явно отключает автогенерацию каталога типовых работ на всех блоках typicalWork.
 * Пустой boundWorkIds — сигнал patchV2TypicalWorksLogicRules не включать catalog rule.
 */
export function disableTypicalWorkCatalogBindingsInUiSchema(uiSchema) {
    let next = uiSchema;
    for (const outputPath of collectGeneratedTypicalWorkArrayPaths(uiSchema)) {
        next = patchBoundWorkIdsAtOutputPath(next, outputPath, []);
    }
    return next;
}
/** Путь вывода типовых работ «Система-источник» по схеме (канонический или пользовательский). */
export function resolveSourceTypicalWorksOutputPath(jsonSchema, uiSchema) {
    if (jsonSchemaHasResolvablePath(jsonSchema, V2_SOURCE_TYPICAL_TASKS_OUTPUT_PATH)) {
        return V2_SOURCE_TYPICAL_TASKS_OUTPUT_PATH;
    }
    const generated = collectGeneratedTypicalWorkArrayPaths(uiSchema);
    const streamPath = generated.find((path) => path.startsWith("streamDataSources."));
    if (streamPath)
        return streamPath;
    const detailPath = generated.find((path) => path.startsWith("detailInfo."));
    if (detailPath)
        return detailPath;
    return generated[0] ?? null;
}
/** Есть ли в jsonSchema узел по dot-пути (только `properties`, без $ref). */
export function jsonSchemaHasResolvablePath(jsonSchema, dotPath) {
    const root = readRecord(jsonSchema);
    if (!root)
        return false;
    const segments = dotPath.split(".").filter(Boolean);
    let node = root;
    for (const segment of segments) {
        const obj = readRecord(node);
        if (!obj)
            return false;
        const properties = readRecord(obj.properties);
        if (!properties || !(segment in properties))
            return false;
        node = properties[segment];
    }
    return true;
}
/** Все известные пути read-only массивов типовых работ (uiSchema + legacy). */
export function listAllGeneratedTypicalWorkArrayPaths(uiSchema) {
    const dynamic = uiSchema
        ? collectGeneratedTypicalWorkArrayPaths(uiSchema)
        : [];
    return [...new Set([...LEGACY_GENERATED_TYPICAL_WORK_ARRAY_PATHS, ...dynamic])];
}
/**
 * Сбрасывает устаревшие fan-out массивы типовых работ, оставляя только
 * актуальный `outputArrayPath` (после replace/clear в калькуляторе).
 */
export function clearStaleGeneratedTypicalWorkPaths(data, outputArrayPath, uiSchema) {
    const activePaths = new Set(uiSchema ? collectGeneratedTypicalWorkArrayPaths(uiSchema) : []);
    let next = data;
    for (const path of LEGACY_GENERATED_TYPICAL_WORK_ARRAY_PATHS) {
        if (path === outputArrayPath)
            continue;
        if (activePaths.has(path))
            continue;
        next = writeAtDotPath(next, path, []);
    }
    return next;
}
