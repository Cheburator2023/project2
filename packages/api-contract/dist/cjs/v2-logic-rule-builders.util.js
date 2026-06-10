"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.v2JsonPointerToVarPath = v2JsonPointerToVarPath;
exports.buildBooleanVisibilityRule = buildBooleanVisibilityRule;
function normalizeJsonPointer(raw) {
    const t = raw.trim();
    if (!t || t === "/")
        return "/";
    return t.startsWith("/") ? t : `/${t}`;
}
/** JSON Pointer `/a/b` → `a.b` для `{"var": "a.b"}` в JsonLogic. */
function v2JsonPointerToVarPath(pointer) {
    return normalizeJsonPointer(pointer)
        .replace(/^\//, "")
        .split("/")
        .filter(Boolean)
        .join(".");
}
/**
 * Правило visibility: целевое поле видно, когда булево поле-источник равно `whenChecked`.
 * Универсальный шаблон для чекбоксов и любых boolean-полей.
 */
function buildBooleanVisibilityRule(params) {
    const sourceVar = v2JsonPointerToVarPath(params.sourcePointer);
    const when = params.whenChecked !== false;
    const condition = {
        "==": [{ var: sourceVar }, when],
    };
    return {
        id: params.id,
        kind: "visibility",
        targetPath: normalizeJsonPointer(params.targetPointer),
        dependencies: [normalizeJsonPointer(params.sourcePointer)],
        condition,
        ...(params.description ? { description: params.description } : {}),
    };
}
