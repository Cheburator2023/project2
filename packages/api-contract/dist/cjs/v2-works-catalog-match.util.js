"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.V2_TYPICAL_WORK_ALWAYS_TRIGGER_PARAM_NAME = exports.V2_TYPICAL_WORK_ALWAYS_TRIGGER_PARAM_CODE = exports.CONTROL_MODELS_STREAM = exports.STREAM_BY_SOURCE_TYPE = exports.V2_SOURCE_STREAM = exports.stripParamNameSourceKeys = exports.parseParamNameSourceKeys = exports.formatParamNameWithSourceKeys = void 0;
exports.normalizeSourceTypeLabel = normalizeSourceTypeLabel;
exports.normalizeTypicalWorkTriggerRuleForMatch = normalizeTypicalWorkTriggerRuleForMatch;
exports.normalizeTypicalWorkTriggerRulesForMatch = normalizeTypicalWorkTriggerRulesForMatch;
exports.resolveStreamFromSourceType = resolveStreamFromSourceType;
exports.resolveStreamsFromSourceSystems = resolveStreamsFromSourceSystems;
exports.readLaborParamAnswer = readLaborParamAnswer;
exports.readTypicalWorkSourceField = readTypicalWorkSourceField;
exports.extractControlCode = extractControlCode;
exports.isAlwaysShownTriggerParam = isAlwaysShownTriggerParam;
exports.isSourceTypeTriggerParam = isSourceTypeTriggerParam;
exports.isControlTypeTriggerParam = isControlTypeTriggerParam;
exports.isPresenceOnlyTriggerRule = isPresenceOnlyTriggerRule;
exports.isBrokenTypicalWorkTriggerRef = isBrokenTypicalWorkTriggerRef;
exports.isMethodologyPresenceTriggerRule = isMethodologyPresenceTriggerRule;
exports.resolveTriggerStatusCatalogParam = resolveTriggerStatusCatalogParam;
exports.triggerRuleCatalogGroupKey = triggerRuleCatalogGroupKey;
exports.catalogValueMatchesTriggerRule = catalogValueMatchesTriggerRule;
exports.coerceNumericLaborActual = coerceNumericLaborActual;
exports.readValueAtSchemaPointer = readValueAtSchemaPointer;
exports.flattenSourceContextValue = flattenSourceContextValue;
exports.findFieldValuesWithSourceLabels = findFieldValuesWithSourceLabels;
exports.findFieldValueInFormData = findFieldValueInFormData;
exports.buildLaborCoefficientLookupSource = buildLaborCoefficientLookupSource;
exports.laborValueMatches = laborValueMatches;
exports.matchSingleTypicalWorkRuleForTriggerFormula = matchSingleTypicalWorkRuleForTriggerFormula;
exports.typicalWorkRulesMatchSource = typicalWorkRulesMatchSource;
exports.hasTypicalWorkTriggersConfiguredSimple = hasTypicalWorkTriggersConfiguredSimple;
exports.resolveLaborCoefficient = resolveLaborCoefficient;
exports.resolveLaborAnyOfCoefficient = resolveLaborAnyOfCoefficient;
exports.resolveByValueLaborParamCoefficientDetails = resolveByValueLaborParamCoefficientDetails;
exports.resolveByValueLaborParamCoefficients = resolveByValueLaborParamCoefficients;
exports.buildTypicalWorkFactorCoeffResolver = buildTypicalWorkFactorCoeffResolver;
const v2_work_param_source_keys_util_1 = require("./v2-work-param-source-keys.util");
Object.defineProperty(exports, "formatParamNameWithSourceKeys", { enumerable: true, get: function () { return v2_work_param_source_keys_util_1.formatParamNameWithSourceKeys; } });
Object.defineProperty(exports, "parseParamNameSourceKeys", { enumerable: true, get: function () { return v2_work_param_source_keys_util_1.parseParamNameSourceKeys; } });
Object.defineProperty(exports, "stripParamNameSourceKeys", { enumerable: true, get: function () { return v2_work_param_source_keys_util_1.stripParamNameSourceKeys; } });
const v2_param_slug_util_1 = require("./v2-param-slug.util");
const v2_work_arch_count_coeff_util_1 = require("./v2-work-arch-count-coeff.util");
const v2_typical_works_util_1 = require("./v2-typical-works.util");
/** Единый стрим-исполнитель для типовых работ систем-источников. */
exports.V2_SOURCE_STREAM = "Источники данных";
/**
 * Legacy-маппинг «тип источника → стрим». Больше НЕ используется для
 * маршрутизации (разделение внутр/внеш убрано): все источники идут в
 * единый стрим `V2_SOURCE_STREAM`. Оставлен только для чтения старых меток.
 */
exports.STREAM_BY_SOURCE_TYPE = {
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
function normalizeSourceTypeLabel(raw) {
    const value = String(raw ?? "").trim();
    if (!value)
        return null;
    if (value in exports.STREAM_BY_SOURCE_TYPE) {
        return value;
    }
    const alias = SOURCE_TYPE_CODE_ALIASES[value.toLowerCase()];
    return alias ?? null;
}
exports.CONTROL_MODELS_STREAM = "Контроль моделей";
function coerceTypicalWorkTriggerRuleValues(values) {
    return values.map((entry) => {
        if (typeof entry === "string") {
            const stored = (0, v2_param_slug_util_1.resolveCatalogTriggerStoredValue)(entry);
            return { code: stored.valueCode, label: stored.valueLabel };
        }
        if (entry.code?.trim() || entry.label?.trim()) {
            return entry;
        }
        const stored = (0, v2_param_slug_util_1.resolveCatalogTriggerStoredValue)(entry.label ?? entry.code ?? "");
        return { code: stored.valueCode, label: stored.valueLabel };
    });
}
/** Приводит legacy/snapshot-правила к виду, пригодному для сопоставления с ответами анкеты. */
function normalizeTypicalWorkTriggerRuleForMatch(rule) {
    const base = {
        paramCode: rule.paramCode,
        paramName: rule.paramName,
        operator: rule.operator ?? "=",
        valueCode: rule.valueCode,
        valueLabel: rule.valueLabel,
    };
    if (rule.operator === "in" || rule.operator === "not_in") {
        return {
            ...base,
            values: rule.values?.length
                ? coerceTypicalWorkTriggerRuleValues(rule.values)
                : undefined,
        };
    }
    const hasScalar = (rule.valueCode != null && String(rule.valueCode).trim() !== "") ||
        (rule.valueLabel != null && String(rule.valueLabel).trim() !== "");
    if (hasScalar) {
        if (rule.valueCode?.trim())
            return base;
        if (rule.valueLabel?.trim()) {
            const stored = (0, v2_param_slug_util_1.resolveCatalogTriggerStoredValue)(rule.valueLabel);
            return {
                ...base,
                valueCode: stored.valueCode || rule.valueCode,
                valueLabel: stored.valueLabel || rule.valueLabel,
            };
        }
        return base;
    }
    if (rule.values?.length) {
        const normalizedValues = coerceTypicalWorkTriggerRuleValues(rule.values);
        const first = normalizedValues[0];
        if (!first)
            return base;
        return {
            ...base,
            valueCode: first.code || rule.valueCode,
            valueLabel: first.label ?? rule.valueLabel,
            values: normalizedValues,
        };
    }
    return base;
}
function normalizeTypicalWorkTriggerRulesForMatch(rules) {
    return rules.map(normalizeTypicalWorkTriggerRuleForMatch);
}
/**
 * Стрим-исполнитель строки-источника. Разделение внутр/внеш убрано —
 * любой источник маршрутизируется в единый стрим `V2_SOURCE_STREAM`.
 * Тип источника (`type`) остаётся обычным триггером работы.
 */
function resolveStreamFromSourceType(_source) {
    return exports.V2_SOURCE_STREAM;
}
/** Стрим(ы) типовых работ для систем-источников анкеты — всегда единый. */
function resolveStreamsFromSourceSystems(_data) {
    return [exports.V2_SOURCE_STREAM];
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
function readLaborParamAnswer(source, paramCode, paramName) {
    if (paramCode in source)
        return source[paramCode];
    const { displayName, sourceKeys } = (0, v2_work_param_source_keys_util_1.parseParamNameSourceKeys)(paramName);
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
        const slug = slugParamCode((0, v2_work_param_source_keys_util_1.stripParamNameSourceKeys)(paramName));
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
function readTypicalWorkSourceField(source, paramCode, paramName) {
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
function extractControlCode(label) {
    const bracket = label.match(/\[([A-ZА-Я0-9]+)\]/i);
    if (bracket?.[1])
        return bracket[1].toUpperCase();
    const param = label.match(/Вид контроля:\s*([A-ZА-Я0-9]+)/i);
    return param?.[1]?.toUpperCase() ?? null;
}
/** Сентинел: работа выводится всегда, без проверки полей анкеты. */
exports.V2_TYPICAL_WORK_ALWAYS_TRIGGER_PARAM_CODE = "__always__";
exports.V2_TYPICAL_WORK_ALWAYS_TRIGGER_PARAM_NAME = "Нет — работа выводится всегда";
const ALWAYS_TRIGGER_NAME_RE = /нет\s*[—–-]\s*работа\s+выводится\s+всегда/iu;
function isAlwaysShownTriggerParam(paramCode, paramName) {
    const code = paramCode.trim().toLowerCase();
    if (code === exports.V2_TYPICAL_WORK_ALWAYS_TRIGGER_PARAM_CODE ||
        code === "нет_работа_выводится_всегда") {
        return true;
    }
    const name = (paramName ?? "").trim();
    if (ALWAYS_TRIGGER_NAME_RE.test(name))
        return true;
    return ALWAYS_TRIGGER_NAME_RE.test(code.replace(/_/g, " "));
}
function isSourceTypeTriggerParam(paramCode, paramName) {
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
function isControlTypeTriggerParam(paramCode, paramName) {
    const label = paramName ?? paramCode;
    return /вид контроля/i.test(label);
}
function isPresenceOnlyTriggerRule(rule) {
    return (rule.valueCode == null &&
        rule.valueLabel == null &&
        (!rule.values || rule.values.length === 0));
}
/** Битые/пустые ссылки из legacy CSV — не проверяем против схемы. */
function isBrokenTypicalWorkTriggerRef(rule) {
    if (rule.paramCode.trim())
        return false;
    const name = rule.paramName?.trim();
    return !name || name === "?";
}
/**
 * Методологические presence-триггеры (пилот, мониторинг и т.п.) не привязаны к полям схемы.
 * Legacy CSV иногда режет «Пилот (первичный, повторный)» на отдельные paramCode.
 */
function isMethodologyPresenceTriggerRule(rule) {
    if (!isPresenceOnlyTriggerRule(rule))
        return false;
    if (isAlwaysShownTriggerParam(rule.paramCode, rule.paramName))
        return false;
    if (isSourceTypeTriggerParam(rule.paramCode, rule.paramName))
        return false;
    if (isControlTypeTriggerParam(rule.paramCode, rule.paramName))
        return false;
    const code = rule.paramCode.trim().toLowerCase();
    const name = (0, v2_work_param_source_keys_util_1.stripParamNameSourceKeys)(rule.paramName ?? "")
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
function resolveTriggerStatusCatalogParam(rule, catalog) {
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
function triggerRuleCatalogGroupKey(rule, catalog) {
    const resolved = resolveTriggerStatusCatalogParam(rule, catalog);
    if (resolved)
        return resolved.code;
    if (isSourceTypeTriggerParam(rule.paramCode, rule.paramName))
        return "type";
    return rule.paramCode;
}
function catalogValueMatchesTriggerRule(catalogValue, rule) {
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
function coerceNumericLaborActual(actual) {
    if (Array.isArray(actual)) {
        return actual.map((item) => coerceNumericLaborActual(item));
    }
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
function readValueAtSchemaPointer(root, pointer) {
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
function isPresentLaborLookupValue(value) {
    return value !== undefined && value !== null && value !== "";
}
function toLaborLookupItems(value) {
    if (!isPresentLaborLookupValue(value))
        return [];
    if (Array.isArray(value)) {
        return value.flatMap((item) => toLaborLookupItems(item));
    }
    return [value];
}
function laborLookupItemKey(value) {
    if (typeof value === "string")
        return `s:${value}`;
    if (typeof value === "number")
        return `n:${value}`;
    if (typeof value === "boolean")
        return `b:${value ? "1" : "0"}`;
    return `j:${JSON.stringify(value)}`;
}
function mergeLaborLookupValue(existing, next) {
    const merged = [...toLaborLookupItems(existing), ...toLaborLookupItems(next)];
    if (merged.length === 0)
        return undefined;
    const seen = new Set();
    const deduped = [];
    for (const item of merged) {
        const key = laborLookupItemKey(item);
        if (seen.has(key))
            continue;
        seen.add(key);
        deduped.push(item);
    }
    return deduped.length === 1 ? deduped[0] : deduped;
}
/**
 * Разворачивает значение sourceContextPaths в плоский объект полей.
 * UI хранит dataProcess/dataMart/modelService как массив записей — берём первую.
 */
function flattenSourceContextValue(value) {
    if (!value || typeof value !== "object")
        return {};
    if (Array.isArray(value)) {
        for (const item of value) {
            if (item && typeof item === "object" && !Array.isArray(item)) {
                return { ...item };
            }
        }
        return {};
    }
    return { ...value };
}
function readArchComponentSourceLabel(record, fallbackIndex) {
    for (const key of ["name", "title", "label", "modelName"]) {
        const raw = record[key];
        if (typeof raw === "string" && raw.trim())
            return raw.trim();
    }
    if (fallbackIndex != null && fallbackIndex >= 0) {
        return `Компонент ${fallbackIndex + 1}`;
    }
    return null;
}
/** Ищет все вхождения поля по коду с подписью арх-компонента (name и т.п.). */
function findFieldValuesWithSourceLabels(formData, fieldCode) {
    const code = fieldCode.trim();
    if (!code)
        return [];
    const results = [];
    const seen = new Set();
    const push = (value, sourceLabel) => {
        for (const item of toLaborLookupItems(value)) {
            const key = `${sourceLabel ?? ""}|${laborLookupItemKey(item)}`;
            if (seen.has(key))
                continue;
            seen.add(key);
            results.push({ value: item, sourceLabel });
        }
    };
    const visit = (node, parentLabel, arrayIndex) => {
        if (node == null || typeof node !== "object")
            return;
        if (Array.isArray(node)) {
            node.forEach((item, index) => visit(item, parentLabel, index));
            return;
        }
        const record = node;
        const ownLabel = readArchComponentSourceLabel(record, arrayIndex) ?? parentLabel;
        if (Object.hasOwn(record, code)) {
            push(record[code], ownLabel);
        }
        for (const child of Object.values(record)) {
            visit(child, ownLabel, null);
        }
    };
    visit(formData, null, null);
    return results;
}
/** Ищет значение поля по коду в глубине formData (массивы арх. блоков и т.п.). */
function findFieldValueInFormData(formData, fieldCode) {
    const values = findFieldValuesWithSourceLabels(formData, fieldCode).map((row) => row.value);
    if (values.length === 0)
        return undefined;
    return values.length === 1 ? values[0] : values;
}
/** Контекст для коэффициентов: строка arch-компонента + поля formData вне строки (generalInfo и т.д.). */
function buildLaborCoefficientLookupSource(source, formData, schemaParams, paramCodes) {
    const merged = { ...source };
    const codes = new Set(paramCodes);
    const isPresent = (value) => isPresentLaborLookupValue(value);
    for (const param of schemaParams) {
        if (!codes.has(param.code))
            continue;
        if (isPresent(merged[param.code]))
            continue;
        const pointer = param.schemaPointer?.trim();
        if (!pointer)
            continue;
        const fromForm = readValueAtSchemaPointer(formData, pointer);
        if (isPresent(fromForm) || typeof fromForm === "boolean") {
            merged[param.code] = mergeLaborLookupValue(merged[param.code], fromForm);
        }
    }
    // Одинаковые названия полей на разных арх. компонентах (напр. «Сложность реализации»
    // на системе-источнике и на процессе): если целевой код пуст, берём значение
    // одноимённого поля уже лежащее в source/merged.
    for (const param of schemaParams) {
        if (!codes.has(param.code))
            continue;
        if (isPresent(merged[param.code]) || typeof merged[param.code] === "boolean") {
            continue;
        }
        const name = (0, v2_work_param_source_keys_util_1.stripParamNameSourceKeys)(param.name)
            .trim()
            .toLowerCase();
        if (!name)
            continue;
        for (const alias of schemaParams) {
            if (alias.code === param.code)
                continue;
            const aliasName = (0, v2_work_param_source_keys_util_1.stripParamNameSourceKeys)(alias.name)
                .trim()
                .toLowerCase();
            if (aliasName !== name)
                continue;
            const aliasValue = merged[alias.code];
            if (isPresent(aliasValue) || typeof aliasValue === "boolean") {
                merged[param.code] = mergeLaborLookupValue(merged[param.code], aliasValue);
                break;
            }
        }
    }
    // Fallback: поле лежит в массиве арх. блока, а schemaPointer/schemaParams недоступны.
    for (const code of codes) {
        const fromDeep = findFieldValueInFormData(formData, code);
        if (isPresent(fromDeep) || typeof fromDeep === "boolean") {
            merged[code] = mergeLaborLookupValue(merged[code], fromDeep);
        }
    }
    return merged;
}
/** Сопоставление значения поля анкеты с кодом/меткой из справочника или схемы. */
function laborValueMatches(actual, valueCode, valueLabel) {
    if (Array.isArray(actual)) {
        return actual.some((item) => laborValueMatches(item, valueCode, valueLabel));
    }
    const normalizedActual = coerceNumericLaborActual(actual);
    const actualStr = String(normalizedActual).trim();
    if (valueLabel != null && String(valueLabel).trim() !== "") {
        const label = String(valueLabel).trim();
        if (actualStr === label)
            return true;
        if (matchesEnumPrefixLaborValue(actualStr, label))
            return true;
        if (typeof normalizedActual === "number" && Number.isFinite(normalizedActual)) {
            const range = label.toLowerCase().replace(/\s+/g, " ");
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
        if (matchesBooleanLaborLabel(normalizedActual, label)) {
            return true;
        }
    }
    if (valueCode != null && String(valueCode).trim() !== "") {
        const code = String(valueCode).trim();
        if (actualStr === code)
            return true;
        if (matchesEnumPrefixLaborValue(actualStr, code))
            return true;
        if (matchesBooleanLaborLabel(normalizedActual, code)) {
            return true;
        }
    }
    return false;
}
/**
 * Enum схемы «4 — …» / «ОК — …» ↔ короткий код/метка трудоёмкости «4» / «ОК».
 * Как у catalogValueMatchesTriggerRule.
 */
function matchesEnumPrefixLaborValue(actualStr, expectedShort) {
    const short = expectedShort.trim();
    if (!short)
        return false;
    return (actualStr.startsWith(`${short} —`) ||
        actualStr.startsWith(`${short} -`) ||
        actualStr.startsWith(`${short} –`));
}
function matchesBooleanLaborLabel(actual, expected) {
    const norm = expected.trim().toLowerCase();
    const truthy = norm === "да" || norm === "true";
    const falsy = norm === "нет" || norm === "false";
    if (!truthy && !falsy)
        return false;
    if (typeof actual === "boolean") {
        return truthy ? actual === true : actual === false;
    }
    if (typeof actual === "string") {
        const a = actual.trim().toLowerCase();
        if (truthy)
            return a === "да" || a === "true";
        return a === "нет" || a === "false";
    }
    return false;
}
function compareRuleValuesSet(actual, expectedCodes, expectedLabels, operator) {
    const matches = expectedCodes.some((code, index) => laborValueMatches(actual, code, expectedLabels[index] ?? null));
    return operator === "not_in" ? !matches : matches;
}
function matchSingleTypicalWorkRuleForTriggerFormula(rule, source) {
    return matchSingleTypicalWorkRule(rule, source);
}
function matchSingleTypicalWorkRule(rule, source) {
    if (isAlwaysShownTriggerParam(rule.paramCode, rule.paramName)) {
        return true;
    }
    const paramName = (0, v2_work_param_source_keys_util_1.stripParamNameSourceKeys)(rule.paramName) || rule.paramCode;
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
        if (rule.values?.length) {
            return compareRuleValuesSet(actual, rule.values.map((v) => v.code), rule.values.map((v) => v.label ?? ""), rule.operator === "!=" ? "not_in" : "in");
        }
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
    const normalized = normalizeTypicalWorkTriggerRulesForMatch(rules);
    if (normalized.some((rule) => isAlwaysShownTriggerParam(rule.paramCode, rule.paramName))) {
        return true;
    }
    const groups = groupTypicalWorkRulesByParam(normalized);
    return [...groups.values()].every((groupRules) => groupRules.every((rule) => matchSingleTypicalWorkRule(rule, source)));
}
function hasTypicalWorkTriggerArchCount(triggerArchCount) {
    return (0, v2_work_arch_count_coeff_util_1.isTriggerArchCountConfigured)(triggerArchCount);
}
/** Все параметры-триггеры (И) и опционально глобальное условие по количеству компонентов. */
function typicalWorkRulesMatchSource(rules, source, formData, triggerArchCount, matchContext) {
    const hasArch = hasTypicalWorkTriggerArchCount(triggerArchCount);
    if (rules.length === 0 && !hasArch)
        return false;
    const archMatch = hasArch
        ? formData
            ? (0, v2_work_arch_count_coeff_util_1.archCountTriggerMatches)(formData, triggerArchCount.kind, triggerArchCount.steps ?? [])
            : false
        : false;
    /** Только arch-count (без ПТ) — как у модельного стрима «Модельный сервис >= 1». */
    if (rules.length === 0)
        return archMatch;
    const lookupSource = (0, v2_typical_works_util_1.buildTypicalWorkTriggerLookupSource)(source, formData, matchContext?.referencePath, matchContext?.uiSchema);
    const paramCodes = [
        ...new Set(rules.map((rule) => rule.paramCode.trim()).filter(Boolean)),
    ];
    const enrichedLookup = formData && matchContext?.schemaParams?.length
        ? buildLaborCoefficientLookupSource(lookupSource, formData, matchContext.schemaParams, paramCodes)
        : lookupSource;
    const paramMatch = matchTypicalWorkParamRules(rules, enrichedLookup);
    if (!hasArch)
        return paramMatch;
    const combinator = triggerArchCount?.combinator ?? "and";
    if (combinator === "or")
        return paramMatch || archMatch;
    return paramMatch && archMatch;
}
function hasTypicalWorkTriggersConfiguredSimple(rules, triggerArchCount) {
    return rules.length > 0 || hasTypicalWorkTriggerArchCount(triggerArchCount);
}
function resolveLaborCoefficient(source, paramCode, valueCode, valueLabel, paramName = null) {
    const actual = readLaborParamAnswer(source, paramCode, paramName);
    return laborValueMatches(actual, valueCode, valueLabel);
}
function resolveLaborAnyOfCoefficient(source, paramCode, anyOf, paramName = null) {
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
function formatLaborAnswerLabel(actual) {
    if (actual === true)
        return "Да";
    if (actual === false)
        return "Нет";
    if (actual == null)
        return "—";
    const text = String(actual).trim();
    return text || "—";
}
function formatLaborCoeffNumber(value) {
    if (!Number.isFinite(value))
        return "?";
    const rounded = Math.round(value * 10000) / 10000;
    if (Number.isInteger(rounded))
        return String(rounded);
    return String(rounded)
        .replace(/(\.\d*?)0+$/, "$1")
        .replace(/\.$/, "");
}
function matchLaborCoefficientRow(actual, paramRows) {
    for (const row of paramRows) {
        if (laborValueMatches(actual, row.valueCode, row.valueLabel)) {
            return row;
        }
    }
    return null;
}
function coerceBooleanLaborDefault(actual, paramRows) {
    if (actual !== undefined)
        return actual;
    const booleanValues = new Set(paramRows.map((row) => expectedBooleanLaborValue(row.valueCode, row.valueLabel)));
    if (booleanValues.has(true) && booleanValues.has(false)) {
        return false;
    }
    return actual;
}
/**
 * Детальный разбор коэффициента «по значениям» для одного source-контекста
 * (per-instance: скаляр текущего экземпляра).
 */
function resolveByValueLaborParamCoefficientDetails(source, rows, _formData) {
    const details = {};
    const coeffs = resolveByValueLaborParamCoefficients(source, rows);
    const rowsByParam = new Map();
    for (const row of rows) {
        const paramRows = rowsByParam.get(row.paramCode) ?? [];
        paramRows.push(row);
        rowsByParam.set(row.paramCode, paramRows);
    }
    for (const [paramCode, value] of Object.entries(coeffs)) {
        const paramRows = rowsByParam.get(paramCode) ?? [];
        const paramName = paramRows[0]?.paramName ?? null;
        const actual = coerceBooleanLaborDefault(readLaborParamAnswer(source, paramCode, paramName), paramRows);
        const matched = matchLaborCoefficientRow(Array.isArray(actual) ? actual[0] : actual, paramRows);
        details[paramCode] = {
            paramCode,
            value,
            aggregation: "single",
            formulaValueLabel: formatLaborCoeffNumber(value),
            parts: matched
                ? [
                    {
                        sourceLabel: null,
                        answerLabel: matched.valueLabel?.trim() ||
                            matched.valueCode?.trim() ||
                            formatLaborAnswerLabel(Array.isArray(actual) ? actual[0] : actual),
                        coefficient: value,
                    },
                ]
                : [],
        };
    }
    return details;
}
/** Коэффициенты режима «По значениям» по фактическому ответу в анкете. */
function resolveByValueLaborParamCoefficients(source, rows, _formData) {
    const paramCoefficients = {};
    const rowsByParam = new Map();
    for (const row of rows) {
        const paramRows = rowsByParam.get(row.paramCode) ?? [];
        paramRows.push(row);
        rowsByParam.set(row.paramCode, paramRows);
    }
    for (const [paramCode, paramRows] of rowsByParam) {
        const paramName = paramRows[0]?.paramName ?? null;
        let actual = coerceBooleanLaborDefault(readLaborParamAnswer(source, paramCode, paramName), paramRows);
        if (Array.isArray(actual)) {
            actual = actual[0];
        }
        const matched = matchLaborCoefficientRow(actual, paramRows);
        if (matched) {
            paramCoefficients[paramCode] = matched.coefficient;
        }
    }
    return paramCoefficients;
}
/**
 * Резолвер коэффициента фактора формулы: сначала рассчитанные значения,
 * затем any_of по фактическому ответу (в т.ч. «выкл» при отсутствии/снятом чекбоксе).
 */
function buildTypicalWorkFactorCoeffResolver(params) {
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
