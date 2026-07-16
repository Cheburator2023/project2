import { formatParamNameWithSourceKeys, parseParamNameSourceKeys, stripParamNameSourceKeys, } from "./v2-work-param-source-keys.util";
import { archCountTriggerMatches, } from "./v2-work-arch-count-coeff.util";
export { formatParamNameWithSourceKeys, parseParamNameSourceKeys, stripParamNameSourceKeys, };
/** Единый стрим-исполнитель для типовых работ систем-источников. */
export const V2_SOURCE_STREAM = "Источники данных";
/**
 * Legacy-маппинг «тип источника → стрим». Больше НЕ используется для
 * маршрутизации (разделение внутр/внеш убрано): все источники идут в
 * единый стрим `V2_SOURCE_STREAM`. Оставлен только для чтения старых меток.
 */
export const STREAM_BY_SOURCE_TYPE = {
    Внутренний: "ИД. Внутренний",
    Внешний: "ИД. Внешний",
};
const SOURCE_TYPE_CODE_ALIASES = {
    internal: "Внутренний",
    внутренний: "Внутренний",
    external: "Внешний",
    внешний: "Внешний",
};
/** Нормализует код/метку типа источника к канонической русской метке. */
export function normalizeSourceTypeLabel(raw) {
    const value = String(raw ?? "").trim();
    if (!value)
        return null;
    if (value in STREAM_BY_SOURCE_TYPE) {
        return value;
    }
    const alias = SOURCE_TYPE_CODE_ALIASES[value.toLowerCase()];
    return alias ?? null;
}
export const CONTROL_MODELS_STREAM = "Контроль моделей";
/**
 * Стрим-исполнитель строки-источника. Разделение внутр/внеш убрано —
 * любой источник маршрутизируется в единый стрим `V2_SOURCE_STREAM`.
 * Тип источника (`type`) остаётся обычным триггером работы.
 */
export function resolveStreamFromSourceType(_source) {
    return V2_SOURCE_STREAM;
}
/** Стрим(ы) типовых работ для систем-источников анкеты — всегда единый. */
export function resolveStreamsFromSourceSystems(_data) {
    return [V2_SOURCE_STREAM];
}
function slugParamCode(name) {
    return name
        .toLowerCase()
        .replace(/[^a-zа-я0-9]+/gi, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, 80);
}
/**
 * Ответ параметра трудоёмкости: только явные поля анкеты (paramCode / sourceKeys / slug).
 * Без fallback на `value`/`controlType` строки — иначе отсутствующий чекбокс
 * ошибочно наследует чужое значение и получает coeffOn вместо coeffOff.
 */
export function readLaborParamAnswer(source, paramCode, paramName) {
    if (paramCode in source)
        return source[paramCode];
    const { displayName, sourceKeys } = parseParamNameSourceKeys(paramName);
    for (const key of sourceKeys) {
        if (key in source)
            return source[key];
    }
    if (displayName) {
        const slug = slugParamCode(displayName);
        if (slug in source)
            return source[slug];
    }
    if (paramName) {
        const slug = slugParamCode(stripParamNameSourceKeys(paramName));
        if (slug in source)
            return source[slug];
    }
    if (source.type !== undefined &&
        (paramCode === "type" || isSourceTypeTriggerParam(paramCode, paramName))) {
        return source.type;
    }
    return undefined;
}
/** Читает значение параметра из контекста строки/объекта анкеты (триггеры, JsonLogic). */
export function readTypicalWorkSourceField(source, paramCode, paramName) {
    const direct = readLaborParamAnswer(source, paramCode, paramName);
    if (direct !== undefined)
        return direct;
    if (isControlTypeTriggerParam(paramCode, paramName)) {
        if (source.controlType !== undefined)
            return source.controlType;
        if (source.value !== undefined)
            return source.value;
    }
    return undefined;
}
function readSourceField(source, paramCode, paramName) {
    return readTypicalWorkSourceField(source, paramCode, paramName);
}
export function extractControlCode(label) {
    const bracket = label.match(/\[([A-ZА-Я0-9]+)\]/i);
    if (bracket?.[1])
        return bracket[1].toUpperCase();
    const param = label.match(/Вид контроля:\s*([A-ZА-Я0-9]+)/i);
    return param?.[1]?.toUpperCase() ?? null;
}
export function isSourceTypeTriggerParam(paramCode, paramName) {
    const name = paramName?.toLowerCase() ?? "";
    const code = paramCode.toLowerCase();
    if (code === "type")
        return true;
    if (/тип[_\s-]*(системы[_\s-]*)?источник/i.test(name))
        return true;
    if (/тип[_\s-]*(системы[_\s-]*)?источник/i.test(code))
        return true;
    return name.includes("тип источника") || code.includes("тип_источника");
}
export function isControlTypeTriggerParam(paramCode, paramName) {
    const label = paramName ?? paramCode;
    return /вид контроля/i.test(label);
}
export function isPresenceOnlyTriggerRule(rule) {
    return (rule.valueCode == null &&
        rule.valueLabel == null &&
        (!rule.values || rule.values.length === 0));
}
/** Битые/пустые ссылки из legacy CSV — не проверяем против схемы. */
export function isBrokenTypicalWorkTriggerRef(rule) {
    if (rule.paramCode.trim())
        return false;
    const name = rule.paramName?.trim();
    return !name || name === "?";
}
/**
 * Методологические presence-триггеры (пилот, мониторинг и т.п.) не привязаны к полям схемы.
 * Legacy CSV иногда режет «Пилот (первичный, повторный)» на отдельные paramCode.
 */
export function isMethodologyPresenceTriggerRule(rule) {
    if (!isPresenceOnlyTriggerRule(rule))
        return false;
    if (isSourceTypeTriggerParam(rule.paramCode, rule.paramName))
        return false;
    if (isControlTypeTriggerParam(rule.paramCode, rule.paramName))
        return false;
    const code = rule.paramCode.trim().toLowerCase();
    const name = stripParamNameSourceKeys(rule.paramName ?? "")
        .trim()
        .toLowerCase();
    if (code === "повторный" || name.endsWith("повторный)"))
        return true;
    if (/^пилот(?:[_\s(]|$)/.test(code))
        return true;
    if (/^[?]\s*пилот/.test(name) || /пилот\s*\(/.test(name))
        return true;
    if (/^мониторинг(?:[_\s]|$)/.test(code) || /^мониторинг/.test(name)) {
        return true;
    }
    return false;
}
/** Сопоставляет правило триггера с параметром глобального справочника (алиасы CSV → каталог). */
export function resolveTriggerStatusCatalogParam(rule, catalog) {
    const direct = catalog.find((item) => item.code === rule.paramCode);
    if (direct)
        return direct;
    const paramName = rule.paramName?.trim();
    if (paramName) {
        const bySlug = catalog.find((item) => item.code === slugParamCode(paramName));
        if (bySlug)
            return bySlug;
    }
    if (isSourceTypeTriggerParam(rule.paramCode, rule.paramName)) {
        return (catalog.find((item) => item.code === "type") ??
            catalog.find((item) => item.code === slugParamCode("Тип системы-источника")) ??
            catalog.find((item) => item.code === slugParamCode("Тип источника данных")) ??
            catalog.find((item) => item.values.some((value) => value.label === "Внутренний" || value.label === "Внешний")));
    }
    if (isControlTypeTriggerParam(rule.paramCode, rule.paramName)) {
        return catalog.find((item) => item.code === slugParamCode("Вид контроля"));
    }
    return undefined;
}
/** Канонический ключ группы триггеров при проверке по каталогу (legacy alias → `type`). */
export function triggerRuleCatalogGroupKey(rule, catalog) {
    const resolved = resolveTriggerStatusCatalogParam(rule, catalog);
    if (resolved)
        return resolved.code;
    if (isSourceTypeTriggerParam(rule.paramCode, rule.paramName))
        return "type";
    return rule.paramCode;
}
export function catalogValueMatchesTriggerRule(catalogValue, rule) {
    if (rule.valueCode && catalogValue.code === rule.valueCode)
        return true;
    if (rule.valueLabel && catalogValue.label === rule.valueLabel)
        return true;
    if (rule.valueLabel) {
        const labelUpper = catalogValue.label.toUpperCase();
        const ruleUpper = rule.valueLabel.toUpperCase();
        if (labelUpper.startsWith(`${ruleUpper} —`) ||
            labelUpper.startsWith(`${ruleUpper} -`)) {
            return true;
        }
    }
    const controlCode = extractControlCode(rule.paramName ?? rule.paramCode);
    if (controlCode) {
        const labelUpper = catalogValue.label.toUpperCase();
        return (labelUpper.startsWith(`${controlCode} —`) ||
            labelUpper.startsWith(`${controlCode} -`) ||
            labelUpper.startsWith(controlCode));
    }
    return false;
}
function compareRuleValue(actual, expected, operator) {
    if (expected == null)
        return false;
    const actualStr = String(actual ?? "");
    const expectedStr = String(expected);
    switch (operator) {
        case "!=":
            return actualStr !== expectedStr;
        case ">=":
            return Number(actual) >= Number(expected);
        case "<=":
            return Number(actual) <= Number(expected);
        case ">":
            return Number(actual) > Number(expected);
        case "<":
            return Number(actual) < Number(expected);
        default:
            return actualStr === expectedStr;
    }
}
function scalarRuleValueMatches(actual, rule) {
    if ([">=", "<=", ">", "<"].includes(rule.operator)) {
        return compareRuleValue(actual, rule.valueCode ?? rule.valueLabel, rule.operator);
    }
    const hasValue = (rule.valueCode != null && String(rule.valueCode).trim() !== "") ||
        (rule.valueLabel != null && String(rule.valueLabel).trim() !== "");
    if (!hasValue)
        return false;
    const matches = laborValueMatches(actual, rule.valueCode, rule.valueLabel);
    if (rule.operator === "!=")
        return !matches;
    return matches;
}
/** Сопоставление значения поля анкеты с кодом/меткой из справочника или схемы. */
export function coerceNumericLaborActual(actual) {
    if (typeof actual === "string") {
        const trimmed = actual.trim();
        if (!trimmed)
            return actual;
        if (trimmed.toLowerCase() === "не требуется")
            return trimmed;
        const num = Number(trimmed.replace(",", "."));
        if (Number.isFinite(num))
            return num;
    }
    return actual;
}
/** Читает значение по schemaPointer (`/generalInfo/field`, `/detailInfo/dataMart/items/field`). */
export function readValueAtSchemaPointer(root, pointer) {
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
/** Контекст для коэффициентов: строка arch-компонента + поля formData вне строки (generalInfo и т.д.). */
export function buildLaborCoefficientLookupSource(source, formData, schemaParams, paramCodes) {
    const merged = { ...source };
    const codes = new Set(paramCodes);
    for (const param of schemaParams) {
        if (!codes.has(param.code))
            continue;
        const current = merged[param.code];
        if (current !== undefined && current !== null && current !== "")
            continue;
        const pointer = param.schemaPointer?.trim();
        if (!pointer)
            continue;
        const fromForm = readValueAtSchemaPointer(formData, pointer);
        if (fromForm !== undefined)
            merged[param.code] = fromForm;
    }
    return merged;
}
/** Сопоставление значения поля анкеты с кодом/меткой из справочника или схемы. */
export function laborValueMatches(actual, valueCode, valueLabel) {
    const normalizedActual = coerceNumericLaborActual(actual);
    if (valueLabel != null && String(valueLabel).trim() !== "") {
        if (String(normalizedActual) === valueLabel)
            return true;
        if (typeof normalizedActual === "number" && Number.isFinite(normalizedActual)) {
            const range = valueLabel.trim().toLowerCase().replace(/\s+/g, " ");
            const upTo = range.match(/^до\s*(\d+(?:[.,]\d+)?)/u);
            if (upTo?.[1] && normalizedActual <= Number(upTo[1].replace(",", "."))) {
                return true;
            }
            const interval = range.match(/^(\d+(?:[.,]\d+)?)\s*[–—-]\s*(\d+(?:[.,]\d+)?)/u);
            if (interval?.[1] && interval[2]) {
                const min = Number(interval[1].replace(",", "."));
                const max = Number(interval[2].replace(",", "."));
                if (normalizedActual > min && normalizedActual <= max)
                    return true;
            }
            const over = range.match(/^(?:>|более\s+)(\d+(?:[.,]\d+)?)/u);
            if (over?.[1] && normalizedActual > Number(over[1].replace(",", "."))) {
                return true;
            }
        }
        if (typeof normalizedActual === "boolean") {
            const norm = valueLabel.trim().toLowerCase();
            if (norm === "да" && normalizedActual === true)
                return true;
            if (norm === "нет" && normalizedActual === false)
                return true;
            if (norm === "true" && normalizedActual === true)
                return true;
            if (norm === "false" && normalizedActual === false)
                return true;
        }
    }
    if (valueCode != null && String(valueCode).trim() !== "") {
        if (String(normalizedActual) === valueCode)
            return true;
        if (typeof normalizedActual === "boolean") {
            const norm = valueCode.trim().toLowerCase();
            if (norm === "true" && normalizedActual === true)
                return true;
            if (norm === "false" && normalizedActual === false)
                return true;
            if (norm === "да" && normalizedActual === true)
                return true;
            if (norm === "нет" && normalizedActual === false)
                return true;
        }
    }
    return false;
}
function compareRuleValuesSet(actual, expectedCodes, expectedLabels, operator) {
    const matches = expectedCodes.some((code, index) => laborValueMatches(actual, code, expectedLabels[index] ?? null));
    return operator === "not_in" ? !matches : matches;
}
export function matchSingleTypicalWorkRuleForTriggerFormula(rule, source) {
    return matchSingleTypicalWorkRule(rule, source);
}
function matchSingleTypicalWorkRule(rule, source) {
    const paramName = stripParamNameSourceKeys(rule.paramName) || rule.paramCode;
    const controlCode = extractControlCode(paramName);
    if (controlCode) {
        const rowText = String(source.value ?? source.controlType ?? source.name ?? "");
        const matches = rowText.includes(`[${controlCode}]`) ||
            rowText.toUpperCase() === controlCode ||
            rowText.includes(controlCode);
        return rule.operator === "!=" ? !matches : matches;
    }
    const actual = readSourceField(source, rule.paramCode, rule.paramName);
    if (rule.operator === "in" || rule.operator === "not_in") {
        const values = rule.values?.length
            ? rule.values
            : rule.valueCode
                ? [{ code: rule.valueCode, label: rule.valueLabel }]
                : [];
        if (values.length === 0)
            return false;
        return compareRuleValuesSet(actual, values.map((v) => v.code), values.map((v) => v.label ?? ""), rule.operator);
    }
    if (rule.valueLabel == null && rule.valueCode == null) {
        return actual !== undefined && actual !== null && actual !== "";
    }
    return scalarRuleValueMatches(actual, rule);
}
function groupTypicalWorkRulesByParam(rules) {
    const groups = new Map();
    for (const rule of rules) {
        const key = rule.paramCode.trim() || "__empty__";
        const list = groups.get(key) ?? [];
        list.push(rule);
        groups.set(key, list);
    }
    return groups;
}
function matchTypicalWorkParamRules(rules, source) {
    if (rules.length === 0)
        return false;
    const groups = groupTypicalWorkRulesByParam(rules);
    return [...groups.values()].every((groupRules) => groupRules.every((rule) => matchSingleTypicalWorkRule(rule, source)));
}
function hasTypicalWorkTriggerArchCount(triggerArchCount) {
    return Boolean(triggerArchCount?.kind && (triggerArchCount.steps?.length ?? 0) > 0);
}
/** Все параметры-триггеры (И) и опционально глобальное условие по количеству компонентов. */
export function typicalWorkRulesMatchSource(rules, source, formData, triggerArchCount) {
    const hasArch = hasTypicalWorkTriggerArchCount(triggerArchCount);
    if (rules.length === 0 && !hasArch)
        return false;
    const paramMatch = matchTypicalWorkParamRules(rules, source);
    if (!hasArch)
        return paramMatch;
    const archMatch = formData
        ? archCountTriggerMatches(formData, triggerArchCount.kind, triggerArchCount.steps ?? [])
        : false;
    const combinator = triggerArchCount?.combinator ?? "and";
    if (combinator === "or")
        return paramMatch || archMatch;
    return paramMatch && archMatch;
}
export function hasTypicalWorkTriggersConfiguredSimple(rules, triggerArchCount) {
    return rules.length > 0 || hasTypicalWorkTriggerArchCount(triggerArchCount);
}
export function resolveLaborCoefficient(source, paramCode, valueCode, valueLabel, paramName = null) {
    const actual = readLaborParamAnswer(source, paramCode, paramName);
    return laborValueMatches(actual, valueCode, valueLabel);
}
export function resolveLaborAnyOfCoefficient(source, paramCode, anyOf, paramName = null) {
    const actual = readLaborParamAnswer(source, paramCode, paramName);
    const matches = anyOf.valueCodes.some((code, index) => laborValueMatches(actual, code, anyOf.valueLabels[index] ?? null));
    return matches ? anyOf.coeffOn : anyOf.coeffOff;
}
function expectedBooleanLaborValue(valueCode, valueLabel) {
    for (const raw of [valueCode, valueLabel]) {
        const normalized = raw?.trim().toLowerCase();
        if (normalized === "true" || normalized === "да")
            return true;
        if (normalized === "false" || normalized === "нет")
            return false;
    }
    return null;
}
/** Коэффициенты режима «По значениям» по фактическому ответу в анкете. */
export function resolveByValueLaborParamCoefficients(source, rows) {
    const paramCoefficients = {};
    const rowsByParam = new Map();
    for (const row of rows) {
        const paramRows = rowsByParam.get(row.paramCode) ?? [];
        paramRows.push(row);
        rowsByParam.set(row.paramCode, paramRows);
    }
    for (const [paramCode, paramRows] of rowsByParam) {
        const paramName = paramRows[0]?.paramName ?? null;
        let actual = readLaborParamAnswer(source, paramCode, paramName);
        // Неотмеченный чекбокс часто отсутствует в formData целиком. Если набор
        // коэффициентов явно логический (есть и Да/true, и Нет/false), отсутствие
        // поля эквивалентно false и должно выбрать коэффициент строки «Нет».
        if (actual === undefined) {
            const booleanValues = new Set(paramRows.map((row) => expectedBooleanLaborValue(row.valueCode, row.valueLabel)));
            if (booleanValues.has(true) && booleanValues.has(false)) {
                actual = false;
            }
        }
        for (const row of paramRows) {
            if (laborValueMatches(actual, row.valueCode, row.valueLabel)) {
                paramCoefficients[paramCode] = row.coefficient;
                break;
            }
        }
    }
    return paramCoefficients;
}
/**
 * Резолвер коэффициента фактора формулы: сначала рассчитанные значения,
 * затем any_of по фактическому ответу (в т.ч. «выкл» при отсутствии/снятом чекбоксе).
 */
export function buildTypicalWorkFactorCoeffResolver(params) {
    return (paramCode) => {
        if (Object.hasOwn(params.paramCoefficients, paramCode)) {
            return params.paramCoefficients[paramCode];
        }
        const header = params.anyOfParams.find((row) => row.paramCode === paramCode);
        if (header) {
            return resolveLaborAnyOfCoefficient(params.source, header.paramCode, header.anyOf, header.paramName ?? null);
        }
        return 1;
    };
}
