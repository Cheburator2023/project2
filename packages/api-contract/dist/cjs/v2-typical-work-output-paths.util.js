"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LEGACY_GENERATED_TYPICAL_WORK_ARRAY_PATHS = exports.V2_CONTROL_TYPICAL_TASKS_OUTPUT_PATH = exports.V2_SOURCE_TYPICAL_TASKS_OUTPUT_PATH = void 0;
exports.collectGeneratedTypicalWorkArrayPaths = collectGeneratedTypicalWorkArrayPaths;
exports.resolveSourceTypicalWorksOutputPath = resolveSourceTypicalWorksOutputPath;
exports.jsonSchemaHasResolvablePath = jsonSchemaHasResolvablePath;
exports.listAllGeneratedTypicalWorkArrayPaths = listAllGeneratedTypicalWorkArrayPaths;
exports.clearStaleGeneratedTypicalWorkPaths = clearStaleGeneratedTypicalWorkPaths;
const v2_anketa_section_ui_util_1 = require("./v2-anketa-section-ui.util");
exports.V2_SOURCE_TYPICAL_TASKS_OUTPUT_PATH = "streamDataSources.sourceTypicalTasks";
/** Канонический вывод типовых работ «Контроль моделей». */
exports.V2_CONTROL_TYPICAL_TASKS_OUTPUT_PATH = "streamModelControl.field_Khn6-HAW";
/** Legacy/fan-out пути, куда раньше дублировались сгенерированные типовые работы. */
exports.LEGACY_GENERATED_TYPICAL_WORK_ARRAY_PATHS = [
    exports.V2_SOURCE_TYPICAL_TASKS_OUTPUT_PATH,
    exports.V2_CONTROL_TYPICAL_TASKS_OUTPUT_PATH,
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
function collectGeneratedTypicalWorkArrayPaths(uiSchema, prefix = "") {
    const branch = readRecord(uiSchema);
    if (!branch)
        return [];
    const paths = [];
    const arch = (0, v2_anketa_section_ui_util_1.resolveV2AnketaArchComponent)(branch);
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
/** Путь вывода типовых работ «Система-источник» по схеме (канонический или пользовательский). */
function resolveSourceTypicalWorksOutputPath(jsonSchema, uiSchema) {
    if (jsonSchemaHasResolvablePath(jsonSchema, exports.V2_SOURCE_TYPICAL_TASKS_OUTPUT_PATH)) {
        return exports.V2_SOURCE_TYPICAL_TASKS_OUTPUT_PATH;
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
function jsonSchemaHasResolvablePath(jsonSchema, dotPath) {
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
function listAllGeneratedTypicalWorkArrayPaths(uiSchema) {
    const dynamic = uiSchema
        ? collectGeneratedTypicalWorkArrayPaths(uiSchema)
        : [];
    return [...new Set([...exports.LEGACY_GENERATED_TYPICAL_WORK_ARRAY_PATHS, ...dynamic])];
}
/**
 * Сбрасывает устаревшие fan-out массивы типовых работ, оставляя только
 * актуальный `outputArrayPath` (после replace/clear в калькуляторе).
 */
function clearStaleGeneratedTypicalWorkPaths(data, outputArrayPath, uiSchema) {
    let next = data;
    for (const path of listAllGeneratedTypicalWorkArrayPaths(uiSchema)) {
        if (path === outputArrayPath)
            continue;
        next = writeAtDotPath(next, path, []);
    }
    return next;
}
