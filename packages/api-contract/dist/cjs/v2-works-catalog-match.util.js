"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CONTROL_MODELS_STREAM = exports.STREAM_BY_SOURCE_TYPE = exports.V2_SOURCE_STREAM = exports.stripParamNameSourceKeys = exports.parseParamNameSourceKeys = exports.formatParamNameWithSourceKeys = void 0;
exports.normalizeSourceTypeLabel = normalizeSourceTypeLabel;
exports.resolveStreamFromSourceType = resolveStreamFromSourceType;
exports.resolveStreamsFromSourceSystems = resolveStreamsFromSourceSystems;
exports.readTypicalWorkSourceField = readTypicalWorkSourceField;
exports.extractControlCode = extractControlCode;
exports.isSourceTypeTriggerParam = isSourceTypeTriggerParam;
exports.isControlTypeTriggerParam = isControlTypeTriggerParam;
exports.isPresenceOnlyTriggerRule = isPresenceOnlyTriggerRule;
exports.resolveTriggerStatusCatalogParam = resolveTriggerStatusCatalogParam;
exports.triggerRuleCatalogGroupKey = triggerRuleCatalogGroupKey;
exports.catalogValueMatchesTriggerRule = catalogValueMatchesTriggerRule;
exports.laborValueMatches = laborValueMatches;
exports.typicalWorkRulesMatchSource = typicalWorkRulesMatchSource;
exports.resolveLaborCoefficient = resolveLaborCoefficient;
exports.resolveLaborAnyOfCoefficient = resolveLaborAnyOfCoefficient;
exports.resolveByValueLaborParamCoefficients = resolveByValueLaborParamCoefficients;
exports.buildTypicalWorkFactorCoeffResolver = buildTypicalWorkFactorCoeffResolver;
const v2_work_param_source_keys_util_1 = require("./v2-work-param-source-keys.util");
Object.defineProperty(exports, "formatParamNameWithSourceKeys", { enumerable: true, get: function () { return v2_work_param_source_keys_util_1.formatParamNameWithSourceKeys; } });
Object.defineProperty(exports, "parseParamNameSourceKeys", { enumerable: true, get: function () { return v2_work_param_source_keys_util_1.parseParamNameSourceKeys; } });
Object.defineProperty(exports, "stripParamNameSourceKeys", { enumerable: true, get: function () { return v2_work_param_source_keys_util_1.stripParamNameSourceKeys; } });
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
/** Читает значение параметра из контекста строки/объекта анкеты. */
function readTypicalWorkSourceField(source, paramCode, paramName) {
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
        (paramCode === "type" ||
            isSourceTypeTriggerParam(paramCode, paramName))) {
        return source.type;
    }
    if (source.controlType !== undefined)
        return source.controlType;
    if (source.value !== undefined)
        return source.value;
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
function laborValueMatches(actual, valueCode, valueLabel) {
    if (valueLabel != null && String(valueLabel).trim() !== "") {
        if (String(actual) === valueLabel)
            return true;
        if (typeof actual === "boolean") {
            const norm = valueLabel.trim().toLowerCase();
            if (norm === "да" && actual === true)
                return true;
            if (norm === "нет" && actual === false)
                return true;
            if (norm === "true" && actual === true)
                return true;
            if (norm === "false" && actual === false)
                return true;
        }
    }
    if (valueCode != null && String(valueCode).trim() !== "") {
        if (String(actual) === valueCode)
            return true;
        if (typeof actual === "boolean") {
            const norm = valueCode.trim().toLowerCase();
            if (norm === "true" && actual === true)
                return true;
            if (norm === "false" && actual === false)
                return true;
            if (norm === "да" && actual === true)
                return true;
            if (norm === "нет" && actual === false)
                return true;
        }
    }
    return false;
}
function compareRuleValuesSet(actual, expectedCodes, expectedLabels, operator) {
    const matches = expectedCodes.some((code, index) => laborValueMatches(actual, code, expectedLabels[index] ?? null));
    return operator === "not_in" ? !matches : matches;
}
/** Все условия работы (логическое И) против контекста строки/объекта анкеты. */
function typicalWorkRulesMatchSource(rules, source) {
    if (rules.length === 0)
        return false;
    return rules.every((rule) => {
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
            return actual !== undefined && actual !== null && actual !== "";
        }
        return scalarRuleValueMatches(actual, rule);
    });
}
function resolveLaborCoefficient(source, paramCode, valueCode, valueLabel, paramName = null) {
    const actual = readSourceField(source, paramCode, paramName);
    return laborValueMatches(actual, valueCode, valueLabel);
}
function resolveLaborAnyOfCoefficient(source, paramCode, anyOf, paramName = null) {
    const actual = readSourceField(source, paramCode, paramName);
    const matches = anyOf.valueCodes.some((code, index) => laborValueMatches(actual, code, anyOf.valueLabels[index] ?? null));
    return matches ? anyOf.coeffOn : anyOf.coeffOff;
}
/** Коэффициенты режима «По значениям» по фактическому ответу в анкете. */
function resolveByValueLaborParamCoefficients(source, rows) {
    const paramCoefficients = {};
    for (const row of rows) {
        if (resolveLaborCoefficient(source, row.paramCode, row.valueCode, row.valueLabel, row.paramName ?? null)) {
            paramCoefficients[row.paramCode] = row.coefficient;
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
