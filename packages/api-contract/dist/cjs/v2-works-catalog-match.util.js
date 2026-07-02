"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CONTROL_MODELS_STREAM = exports.STREAM_BY_SOURCE_TYPE = void 0;
exports.resolveStreamFromSourceType = resolveStreamFromSourceType;
exports.resolveStreamsFromSourceSystems = resolveStreamsFromSourceSystems;
exports.readTypicalWorkSourceField = readTypicalWorkSourceField;
exports.extractControlCode = extractControlCode;
exports.isSourceTypeTriggerParam = isSourceTypeTriggerParam;
exports.isControlTypeTriggerParam = isControlTypeTriggerParam;
exports.isPresenceOnlyTriggerRule = isPresenceOnlyTriggerRule;
exports.resolveTriggerStatusCatalogParam = resolveTriggerStatusCatalogParam;
exports.catalogValueMatchesTriggerRule = catalogValueMatchesTriggerRule;
exports.typicalWorkRulesMatchSource = typicalWorkRulesMatchSource;
exports.resolveLaborCoefficient = resolveLaborCoefficient;
exports.resolveLaborAnyOfCoefficient = resolveLaborAnyOfCoefficient;
/** Стрим-исполнитель по типу системы-источника в анкете. */
exports.STREAM_BY_SOURCE_TYPE = {
    Внутренний: "ИД. Внутренний",
    Внешний: "ИД. Внешний",
};
exports.CONTROL_MODELS_STREAM = "Контроль моделей";
function resolveStreamFromSourceType(source) {
    const sourceType = String(source.type ?? "").trim();
    return exports.STREAM_BY_SOURCE_TYPE[sourceType] ?? null;
}
/** Стримы, представленные в `streamDataSources.sourceSystems`. */
function resolveStreamsFromSourceSystems(data) {
    const systems = readDotPath(data, "streamDataSources.sourceSystems");
    if (!Array.isArray(systems) || systems.length === 0) {
        return [exports.STREAM_BY_SOURCE_TYPE.Внутренний];
    }
    const streams = new Set();
    for (const row of systems) {
        if (!row || typeof row !== "object" || Array.isArray(row))
            continue;
        const stream = resolveStreamFromSourceType(row);
        if (stream)
            streams.add(stream);
    }
    return streams.size > 0 ? [...streams] : [exports.STREAM_BY_SOURCE_TYPE.Внутренний];
}
function readDotPath(data, path) {
    return path.split(".").reduce((cur, key) => {
        if (!cur || typeof cur !== "object" || Array.isArray(cur))
            return undefined;
        return cur[key];
    }, data);
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
    if (paramName) {
        const slug = slugParamCode(paramName);
        if (slug in source)
            return source[slug];
    }
    if (source.type !== undefined &&
        (paramCode === "type" || paramName?.toLowerCase().includes("тип источника"))) {
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
    return name.includes("тип источника") || paramCode.includes("тип_источника");
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
        return catalog.find((item) => item.code === slugParamCode("Тип источника данных"));
    }
    if (isControlTypeTriggerParam(rule.paramCode, rule.paramName)) {
        return catalog.find((item) => item.code === slugParamCode("Вид контроля"));
    }
    return undefined;
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
function compareRuleValuesSet(actual, expectedCodes, expectedLabels, operator) {
    const actualStr = String(actual ?? "");
    const matches = expectedCodes.some((code, index) => actualStr === code ||
        actualStr === (expectedLabels[index] ?? "") ||
        actualStr === String(expectedLabels[index] ?? ""));
    return operator === "not_in" ? !matches : matches;
}
/** Все условия работы (логическое И) против контекста строки/объекта анкеты. */
function typicalWorkRulesMatchSource(rules, source) {
    if (rules.length === 0)
        return false;
    return rules.every((rule) => {
        const paramName = rule.paramName ?? rule.paramCode;
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
        return compareRuleValue(actual, rule.valueLabel ?? rule.valueCode, rule.operator);
    });
}
function resolveLaborCoefficient(source, paramCode, valueCode, valueLabel) {
    const actual = readSourceField(source, paramCode, null);
    if (valueLabel != null) {
        if (String(actual) === valueLabel)
            return true;
        if (typeof actual === "boolean") {
            const norm = valueLabel.trim().toLowerCase();
            if (norm === "да" && actual === true)
                return true;
            if (norm === "нет" && actual === false)
                return true;
        }
    }
    if (valueCode != null && String(actual) === valueCode)
        return true;
    return false;
}
function resolveLaborAnyOfCoefficient(source, paramCode, anyOf) {
    const actual = readSourceField(source, paramCode, null);
    const actualStr = String(actual ?? "");
    const matches = anyOf.valueCodes.some((code, index) => actualStr === code ||
        actualStr === (anyOf.valueLabels[index] ?? "") ||
        actualStr === String(anyOf.valueLabels[index] ?? ""));
    return matches ? anyOf.coeffOn : anyOf.coeffOff;
}
