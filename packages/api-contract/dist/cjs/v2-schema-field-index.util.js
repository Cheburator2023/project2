"use strict";
/**
 * Стабильная идентичность полей/блоков схемы.
 * Path — производная от текущего jsonSchema/uiSchema; SoT — uid / blockUid / role.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.V2_CATALOG_SOURCE_ARCH_BY_STREAM = exports.V2_SEMANTIC_ROLES = exports.V2_UI_OPTION_ARCH_COMPONENT = exports.V2_UI_OPTION_SEMANTIC_ROLE = exports.V2_UI_OPTION_ARCH_BLOCK_UID = exports.V2_UI_OPTION_SCHEMA_FIELD_UID = void 0;
exports.buildV2SchemaFieldIndex = buildV2SchemaFieldIndex;
exports.resolveDotPathByArchComponent = resolveDotPathByArchComponent;
exports.resolveDotPathByBlockUid = resolveDotPathByBlockUid;
exports.resolvePointerByFieldUid = resolvePointerByFieldUid;
exports.resolveDotPathByFieldUid = resolveDotPathByFieldUid;
exports.resolveFieldUidBySemanticRole = resolveFieldUidBySemanticRole;
exports.readFormValueAtSchemaPointer = readFormValueAtSchemaPointer;
exports.readFormValueAtDotPath = readFormValueAtDotPath;
exports.resolveFormValueByFieldUid = resolveFormValueByFieldUid;
exports.resolveFormValueBySemanticRole = resolveFormValueBySemanticRole;
exports.resolveCatalogSourceArrayPath = resolveCatalogSourceArrayPath;
exports.schemaPointerToDotPath = schemaPointerToDotPath;
exports.rewriteSchemaPathsInValue = rewriteSchemaPathsInValue;
exports.V2_UI_OPTION_SCHEMA_FIELD_UID = "schemaFieldUid";
exports.V2_UI_OPTION_ARCH_BLOCK_UID = "archBlockUid";
exports.V2_UI_OPTION_SEMANTIC_ROLE = "semanticRole";
exports.V2_UI_OPTION_ARCH_COMPONENT = "archComponent";
/** Семантические роли для legacy СФЕРА / отклонений (не JSON-path). */
exports.V2_SEMANTIC_ROLES = [
    "modelsList",
    "modelsCount",
    "algorithmType",
    "autoML",
    "readyPromReports",
    "pilotNeed",
    "prePromEval",
    "deploymentChannels",
    "sourceSystems",
    "modelService",
    "assessedInitiativesCount",
    "productionAdditionalReports",
    "uncertaintyAdjustment",
    "dataSourcesCount",
];
/** Arch-компоненты, из которых каталог ТР читает source-строки. */
exports.V2_CATALOG_SOURCE_ARCH_BY_STREAM = {
    modelStream: "modelService",
    sourceSystems: "sourceSystem",
};
function readRecord(value) {
    return value && typeof value === "object" && !Array.isArray(value)
        ? value
        : undefined;
}
function schemaNodeType(node) {
    if (!node)
        return null;
    if (typeof node.type === "string")
        return node.type;
    if (Array.isArray(node.type)) {
        return node.type.find((value) => value !== "null") ?? node.type[0] ?? null;
    }
    return null;
}
function objectItemsSchema(node) {
    if (schemaNodeType(node) !== "array")
        return null;
    const items = node.items;
    if (!items)
        return null;
    if (Array.isArray(items))
        return items[0] ?? null;
    return items;
}
function readUiBranch(uiSchema, segments) {
    if (!uiSchema)
        return undefined;
    let cur = uiSchema;
    for (const segment of segments) {
        if (segment === "items") {
            cur = cur?.items;
            continue;
        }
        cur = cur?.[segment];
    }
    return readRecord(cur);
}
function readUiOptions(uiBranch) {
    return readRecord(uiBranch?.["ui:options"]);
}
function pointerFromSegments(segments) {
    if (segments.length === 0)
        return "/";
    return `/${segments.join("/")}`;
}
function dotPathFromSegments(segments) {
    return segments.filter((segment) => segment !== "items").join(".");
}
function readStringOption(options, key) {
    const value = options?.[key];
    return typeof value === "string" && value.trim() ? value.trim() : null;
}
/**
 * Строит индекс uid/blockUid/role → актуальный pointer/dotPath.
 * Перенос поля в конструкторе меняет только этот индекс, не привязки ТР.
 */
function buildV2SchemaFieldIndex(jsonSchema, uiSchema) {
    const byUid = new Map();
    const byBlockUid = new Map();
    const byArchComponent = new Map();
    const byRole = new Map();
    const root = readRecord(jsonSchema);
    const uiRoot = readRecord(uiSchema);
    if (!root?.properties) {
        return { byUid, byBlockUid, byArchComponent, byRole };
    }
    const walk = (node, schemaSegments, uiSegments) => {
        const uiBranch = readUiBranch(uiRoot, uiSegments);
        const options = readUiOptions(uiBranch);
        const archComponent = readStringOption(options, exports.V2_UI_OPTION_ARCH_COMPONENT);
        const archBlockUid = readStringOption(options, exports.V2_UI_OPTION_ARCH_BLOCK_UID);
        const fieldUid = readStringOption(options, exports.V2_UI_OPTION_SCHEMA_FIELD_UID);
        const semanticRole = readStringOption(options, exports.V2_UI_OPTION_SEMANTIC_ROLE);
        const pointer = pointerFromSegments(schemaSegments);
        const dotPath = dotPathFromSegments(schemaSegments);
        const leafKey = schemaSegments.filter((s) => s !== "items").at(-1) ?? "";
        if (archComponent && dotPath) {
            const blockEntry = {
                pointer,
                dotPath,
                archComponent,
                archBlockUid: archBlockUid ?? undefined,
            };
            if (archBlockUid && !byBlockUid.has(archBlockUid)) {
                byBlockUid.set(archBlockUid, blockEntry);
            }
            if (!byArchComponent.has(archComponent)) {
                byArchComponent.set(archComponent, blockEntry);
            }
            if (semanticRole && !byRole.has(semanticRole)) {
                byRole.set(semanticRole, archBlockUid ?? `arch:${archComponent}`);
            }
        }
        if (fieldUid && leafKey) {
            const entry = {
                pointer,
                dotPath,
                leafKey,
                archComponent: archComponent ?? undefined,
                semanticRole: semanticRole ?? undefined,
            };
            if (!byUid.has(fieldUid)) {
                byUid.set(fieldUid, entry);
            }
            if (semanticRole && !byRole.has(semanticRole)) {
                byRole.set(semanticRole, fieldUid);
            }
        }
        const props = node.properties;
        if (props) {
            for (const [key, child] of Object.entries(props)) {
                walk(child, [...schemaSegments, key], [...uiSegments, key]);
            }
        }
        const items = objectItemsSchema(node);
        if (items) {
            walk(items, [...schemaSegments, "items"], [...uiSegments, "items"]);
        }
    };
    for (const [key, child] of Object.entries(root.properties)) {
        walk(child, [key], [key]);
    }
    return { byUid, byBlockUid, byArchComponent, byRole };
}
function resolveDotPathByArchComponent(index, archComponent, fallbackDotPath) {
    const fromIndex = index.byArchComponent.get(archComponent)?.dotPath;
    if (fromIndex)
        return fromIndex;
    return fallbackDotPath?.trim() || null;
}
function resolveDotPathByBlockUid(index, blockUid, fallbackDotPath) {
    const fromIndex = index.byBlockUid.get(blockUid)?.dotPath;
    if (fromIndex)
        return fromIndex;
    return fallbackDotPath?.trim() || null;
}
function resolvePointerByFieldUid(index, schemaFieldUid) {
    return index.byUid.get(schemaFieldUid.trim())?.pointer ?? null;
}
function resolveDotPathByFieldUid(index, schemaFieldUid) {
    return index.byUid.get(schemaFieldUid.trim())?.dotPath ?? null;
}
function resolveFieldUidBySemanticRole(index, role) {
    return index.byRole.get(role.trim()) ?? null;
}
/** Читает formData по schema pointer (`/a/b/items/c`). */
function readFormValueAtSchemaPointer(root, pointer) {
    if (!pointer.startsWith("/"))
        return undefined;
    const segments = pointer.split("/").filter(Boolean);
    let cur = root;
    for (const segment of segments) {
        if (segment === "items") {
            if (Array.isArray(cur))
                cur = cur[0];
            continue;
        }
        if (cur == null || typeof cur !== "object")
            return undefined;
        if (Array.isArray(cur))
            cur = cur[0];
        if (cur == null || typeof cur !== "object")
            return undefined;
        cur = cur[segment];
    }
    return cur;
}
/** Читает formData по dot-path (`a.b.c`), учитывая arch object list (массив → первый элемент). */
function readFormValueAtDotPath(root, dotPath) {
    const parts = dotPath.split(".").filter(Boolean);
    let cur = root;
    for (const part of parts) {
        if (cur == null || typeof cur !== "object")
            return undefined;
        if (Array.isArray(cur)) {
            cur = cur[0];
            if (cur == null || typeof cur !== "object")
                return undefined;
        }
        cur = cur[part];
    }
    return cur;
}
function resolveFormValueByFieldUid(formData, index, schemaFieldUid) {
    const pointer = resolvePointerByFieldUid(index, schemaFieldUid);
    if (!pointer)
        return undefined;
    return readFormValueAtSchemaPointer(formData, pointer);
}
function resolveFormValueBySemanticRole(formData, index, role) {
    const id = resolveFieldUidBySemanticRole(index, role);
    if (!id)
        return undefined;
    if (id.startsWith("arch:")) {
        const arch = id.slice("arch:".length);
        const path = resolveDotPathByArchComponent(index, arch);
        if (!path)
            return undefined;
        return readFormValueAtDotPath(formData, path);
    }
    const fromUid = resolveFormValueByFieldUid(formData, index, id);
    if (fromUid !== undefined)
        return fromUid;
    const block = index.byBlockUid.get(id);
    if (block)
        return readFormValueAtDotPath(formData, block.dotPath);
    return undefined;
}
/**
 * Резолвит sourceArrayPath каталога: blockUid → archComponent → fallback path.
 */
function resolveCatalogSourceArrayPath(options) {
    const { uiSchema, jsonSchema, sourceArchComponent, sourceBlockUid, fallbackPath } = options;
    if (!uiSchema && !jsonSchema) {
        return fallbackPath?.trim() || null;
    }
    const index = buildV2SchemaFieldIndex(jsonSchema, uiSchema);
    if (sourceBlockUid?.trim()) {
        const byUid = resolveDotPathByBlockUid(index, sourceBlockUid.trim(), null);
        if (byUid)
            return byUid;
    }
    if (sourceArchComponent?.trim()) {
        const byArch = resolveDotPathByArchComponent(index, sourceArchComponent.trim(), null);
        if (byArch)
            return byArch;
    }
    return fallbackPath?.trim() || null;
}
/** JSON Pointer `/a/b` → dot `a.b` (без `items`). */
function schemaPointerToDotPath(pointer) {
    return pointer
        .split("/")
        .filter(Boolean)
        .filter((segment) => segment !== "items")
        .join(".");
}
function rewriteSchemaPathString(value, oldPointer, newPointer, oldDot, newDot) {
    if (value === oldDot)
        return newDot;
    if (oldDot && value.startsWith(`${oldDot}.`)) {
        return `${newDot}${value.slice(oldDot.length)}`;
    }
    if (value === oldPointer)
        return newPointer;
    if (oldPointer !== "/" && value.startsWith(`${oldPointer}/`)) {
        return `${newPointer}${value.slice(oldPointer.length)}`;
    }
    return value;
}
/**
 * Мост при moveCanvasField: переписывает path-based JsonLogic / payload
 * (старые правила ещё хранят путь; uid-привязки не трогаем).
 */
function rewriteSchemaPathsInValue(value, oldPointer, newPointer) {
    const oldDot = schemaPointerToDotPath(oldPointer);
    const newDot = schemaPointerToDotPath(newPointer);
    if (oldPointer === newPointer && oldDot === newDot)
        return value;
    if (value === null || value === undefined)
        return value;
    if (typeof value === "string") {
        return rewriteSchemaPathString(value, oldPointer, newPointer, oldDot, newDot);
    }
    if (Array.isArray(value)) {
        return value.map((item) => rewriteSchemaPathsInValue(item, oldPointer, newPointer));
    }
    if (typeof value === "object") {
        const next = {};
        for (const [key, child] of Object.entries(value)) {
            if (key === "var") {
                if (typeof child === "string") {
                    next[key] = rewriteSchemaPathString(child, oldPointer, newPointer, oldDot, newDot);
                    continue;
                }
                if (Array.isArray(child) && typeof child[0] === "string") {
                    next[key] = [
                        rewriteSchemaPathString(child[0], oldPointer, newPointer, oldDot, newDot),
                        ...child.slice(1),
                    ];
                    continue;
                }
            }
            next[key] = rewriteSchemaPathsInValue(child, oldPointer, newPointer);
        }
        return next;
    }
    return value;
}
