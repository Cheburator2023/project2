/** Суффикс в `paramName` правила: «Название @ field_a|field_b» — альтернативные ключи в данных анкеты. */
const PARAM_SOURCE_KEYS_SUFFIX_RE = /\s+@\s+([\p{L}\p{N}_|,-]+)$/u;
/**
 * Раньше имя резали под varchar(255); при длинных alias суффикс съедал весь
 * displayName → `" @ field|…"` и bulk dryRun вечно «чинил» paramName.
 * Колонки расширены (param_name 1000 / formula_text text) — не обрезаем.
 */
export function formatParamNameWithSourceKeys(name, sourceKeys) {
    const uniqueKeys = [...new Set((sourceKeys ?? []).filter(Boolean))];
    if (uniqueKeys.length === 0)
        return name;
    return `${name} @ ${uniqueKeys.join("|")}`;
}
export function parseParamNameSourceKeys(paramName) {
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
export function stripParamNameSourceKeys(paramName) {
    const { displayName } = parseParamNameSourceKeys(paramName);
    return displayName || paramName || "";
}
