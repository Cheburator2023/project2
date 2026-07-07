"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatParamNameWithSourceKeys = formatParamNameWithSourceKeys;
exports.parseParamNameSourceKeys = parseParamNameSourceKeys;
exports.stripParamNameSourceKeys = stripParamNameSourceKeys;
/** Суффикс в `paramName` правила: «Название @ field_a|field_b» — альтернативные ключи в данных анкеты. */
const PARAM_SOURCE_KEYS_SUFFIX_RE = /\s+@\s+([\w|,-]+)$/;
function formatParamNameWithSourceKeys(name, sourceKeys) {
    const uniqueKeys = [...new Set((sourceKeys ?? []).filter(Boolean))];
    if (uniqueKeys.length === 0)
        return name;
    const suffix = uniqueKeys.join("|");
    const maxNameLen = Math.max(0, 255 - 3 - suffix.length);
    const trimmedName = name.length > maxNameLen ? name.slice(0, maxNameLen) : name;
    return `${trimmedName} @ ${suffix}`;
}
function parseParamNameSourceKeys(paramName) {
    if (!paramName)
        return { displayName: "", sourceKeys: [] };
    const match = paramName.match(PARAM_SOURCE_KEYS_SUFFIX_RE);
    if (!match || match.index == null) {
        return { displayName: paramName, sourceKeys: [] };
    }
    const displayName = paramName.slice(0, match.index).trim();
    const sourceKeys = match[1]
        .split("|")
        .map((key) => key.trim())
        .filter(Boolean);
    return { displayName, sourceKeys };
}
function stripParamNameSourceKeys(paramName) {
    const { displayName } = parseParamNameSourceKeys(paramName);
    return displayName || paramName || "";
}
