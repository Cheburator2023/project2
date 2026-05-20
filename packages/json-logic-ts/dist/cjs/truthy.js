"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isJsonLogicTruthy = isJsonLogicTruthy;
exports.toFiniteNumberOrNull = toFiniteNumberOrNull;
/** Truthiness aligned with V2 calculation rules (string `"0"` is falsy). */
function isJsonLogicTruthy(value) {
    if (value === null || value === undefined)
        return false;
    if (value === false)
        return false;
    if (value === 0 || value === "0" || value === "")
        return false;
    if (Array.isArray(value) && value.length === 0)
        return false;
    return true;
}
function toFiniteNumberOrNull(value) {
    if (value === null || value === undefined || value === "")
        return null;
    if (typeof value === "number")
        return Number.isFinite(value) ? value : null;
    if (typeof value === "boolean")
        return value ? 1 : 0;
    if (typeof value === "string") {
        const n = Number(value);
        return Number.isFinite(n) ? n : null;
    }
    return null;
}
