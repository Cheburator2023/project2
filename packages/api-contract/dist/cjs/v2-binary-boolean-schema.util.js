"use strict";
/** Двузначные enum-справочники «да/нет» и «требуется/не требуется» → boolean в схеме. */
Object.defineProperty(exports, "__esModule", { value: true });
exports.binaryEnumKey = binaryEnumKey;
exports.isBinaryBooleanEnum = isBinaryBooleanEnum;
exports.coerceBinaryBooleanFormValue = coerceBinaryBooleanFormValue;
exports.isPositiveBinaryFormValue = isPositiveBinaryFormValue;
exports.binaryEnumCoeffKey = binaryEnumCoeffKey;
const BINARY_YES_NO_KEYS = new Set(["да|нет", "нет|да"]);
const BINARY_REQUIRED_KEYS = new Set([
    "требуется|не требуется",
    "не требуется|требуется",
]);
const POSITIVE_BINARY_LABELS = new Set(["да", "требуется"]);
const NEGATIVE_BINARY_LABELS = new Set(["нет", "не требуется"]);
function binaryEnumKey(values) {
    return values
        .map((v) => v.trim().toLowerCase())
        .sort()
        .join("|");
}
/** Подлежит ли поле замене string+enum на boolean. */
function isBinaryBooleanEnum(values) {
    if (values.length !== 2)
        return false;
    const key = binaryEnumKey(values);
    return BINARY_YES_NO_KEYS.has(key) || BINARY_REQUIRED_KEYS.has(key);
}
/** true ↔ «Да» / «Требуется», false ↔ «Нет» / «Не требуется». */
function coerceBinaryBooleanFormValue(value) {
    if (typeof value === "boolean")
        return value;
    if (typeof value !== "string")
        return undefined;
    const normalized = value.trim().toLowerCase();
    if (POSITIVE_BINARY_LABELS.has(normalized))
        return true;
    if (NEGATIVE_BINARY_LABELS.has(normalized))
        return false;
    return undefined;
}
function isPositiveBinaryFormValue(value) {
    return coerceBinaryBooleanFormValue(value) === true;
}
/** Ключ в coefficientByField.values для boolean или legacy string. */
function binaryEnumCoeffKey(value, positiveLabel = "Да") {
    const coerced = coerceBinaryBooleanFormValue(value);
    if (coerced === true)
        return positiveLabel;
    if (coerced === false) {
        return positiveLabel === "Да" ? "Нет" : "Не требуется";
    }
    return typeof value === "string" ? value : undefined;
}
