import { resolveV2AnketaArchComponent } from "./v2-anketa-section-ui.util";
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
