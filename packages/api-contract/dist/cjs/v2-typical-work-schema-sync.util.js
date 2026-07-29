"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.laborCoefficientStoredKey = laborCoefficientStoredKey;
exports.dedupeLaborCoefficientsByStoredValue = dedupeLaborCoefficientsByStoredValue;
exports.mergeLaborParamGroupsByParamCode = mergeLaborParamGroupsByParamCode;
exports.reconcileTypicalWorkCardWithSchemaField = reconcileTypicalWorkCardWithSchemaField;
const v2_param_slug_util_1 = require("./v2-param-slug.util");
const v2_template_work_schema_params_util_1 = require("./v2-template-work-schema-params.util");
const v2_work_param_source_keys_util_1 = require("./v2-work-param-source-keys.util");
const v2_work_formula_util_1 = require("./v2-work-formula.util");
function collectFieldAliasCodes(request) {
    const aliases = new Set();
    for (const code of [
        request.field.previousCode,
        request.field.code,
        ...(request.field.aliasCodes ?? []),
    ]) {
        if (code?.trim())
            aliases.add(code.trim());
    }
    if (request.field.name?.trim()) {
        const slug = (0, v2_param_slug_util_1.slugParamCode)((0, v2_work_param_source_keys_util_1.stripParamNameSourceKeys)(request.field.name).trim());
        if (slug)
            aliases.add(slug);
    }
    return aliases;
}
function formatSyncedParamName(request, currentName, nextCode, previousCode) {
    const displayName = (0, v2_work_param_source_keys_util_1.stripParamNameSourceKeys)(request.field.name ?? currentName ?? "").trim();
    if (!displayName)
        return currentName ?? null;
    const aliasCodes = [
        nextCode,
        previousCode,
        request.field.previousCode,
        ...(request.field.aliasCodes ?? []),
        currentName ? (0, v2_param_slug_util_1.slugParamCode)((0, v2_work_param_source_keys_util_1.stripParamNameSourceKeys)(currentName)) : null,
    ].filter((code) => Boolean(code?.trim()));
    return (0, v2_work_param_source_keys_util_1.formatParamNameWithSourceKeys)(displayName, [...new Set(aliasCodes)]);
}
function matchesField(ref, request) {
    if (ref.schemaFieldUid &&
        ref.schemaFieldUid === request.field.schemaFieldUid) {
        return true;
    }
    /** Уже привязан к другому полю — не перехватывать по коду/имени. */
    if (ref.schemaFieldUid?.trim()) {
        return false;
    }
    const aliases = collectFieldAliasCodes(request);
    if (aliases.has(ref.paramCode))
        return true;
    if (request.field.name?.trim() && ref.paramName?.trim()) {
        const fieldName = (0, v2_work_param_source_keys_util_1.stripParamNameSourceKeys)(request.field.name)
            .trim()
            .toLowerCase();
        const refName = (0, v2_work_param_source_keys_util_1.stripParamNameSourceKeys)(ref.paramName).trim().toLowerCase();
        if (fieldName === refName)
            return true;
    }
    return false;
}
function reconcileRule(rule, request) {
    if (!matchesField(rule, request))
        return rule;
    if (request.operation === "delete")
        return null;
    const values = request.field.values;
    if (values === undefined) {
        const nextCode = request.field.code ?? rule.paramCode;
        return {
            ...rule,
            schemaFieldUid: request.field.schemaFieldUid,
            paramCode: nextCode,
            paramName: formatSyncedParamName(request, rule.paramName, nextCode, rule.paramCode) ?? rule.paramName,
        };
    }
    const isSetOperator = rule.operator === "in" || rule.operator === "not_in";
    const nextValues = isSetOperator
        ? (rule.values ?? [])
            .filter((value) => values.some((allowedValue) => (0, v2_template_work_schema_params_util_1.schemaEnumValueMatchesRule)(allowedValue, {
            valueCode: value.code,
            valueLabel: value.label,
        })))
            .map((value) => {
            const matched = values.find((allowedValue) => (0, v2_template_work_schema_params_util_1.schemaEnumValueMatchesRule)(allowedValue, {
                valueCode: value.code,
                valueLabel: value.label,
            }));
            return {
                code: matched?.code ?? value.code,
                label: matched?.label ?? value.label ?? null,
            };
        })
        : undefined;
    const scalarMatch = values.find((value) => (0, v2_template_work_schema_params_util_1.schemaEnumValueMatchesRule)(value, rule));
    const scalarAvailable = scalarMatch != null;
    return {
        ...rule,
        schemaFieldUid: request.field.schemaFieldUid,
        paramCode: request.field.code ?? rule.paramCode,
        paramName: formatSyncedParamName(request, rule.paramName, request.field.code ?? rule.paramCode, rule.paramCode) ?? rule.paramName,
        valueCode: isSetOperator
            ? null
            : scalarAvailable
                ? (0, v2_param_slug_util_1.normalizeStoredValueCode)(scalarMatch.code, scalarMatch.label)
                : null,
        valueLabel: isSetOperator
            ? null
            : scalarAvailable
                ? (0, v2_param_slug_util_1.normalizeStoredValueLabel)(scalarMatch.label ?? rule.valueLabel)
                : null,
        values: nextValues,
    };
}
function normalizeLaborValueIdentity(value) {
    return (value ?? "")
        .trim()
        .toLowerCase()
        .replace(/ё/g, "е")
        .replace(/\s+/g, "");
}
/** Ключ совпадения для uq_v2_typical_work_labor (work, stream, param_code, value_code). */
function laborCoefficientStoredKey(row) {
    if (row.valueCode == null && !row.valueLabel?.trim())
        return "";
    return normalizeLaborValueIdentity((0, v2_param_slug_util_1.normalizeStoredValueCode)(row.valueCode ?? row.valueLabel ?? "", row.valueLabel));
}
function dedupeLaborCoefficientsByStoredValue(coefficients) {
    const seen = new Set();
    const result = [];
    for (const row of coefficients) {
        const key = laborCoefficientStoredKey(row);
        if (seen.has(key))
            continue;
        seen.add(key);
        result.push(row);
    }
    return result;
}
function laborCoefficientIdentity(row) {
    return laborCoefficientStoredKey(row);
}
/** Схлопывает группы с одним paramCode — иначе patchWork ловит uq_v2_typical_work_labor_param. */
function mergeLaborParamGroupsByParamCode(groups) {
    const merged = new Map();
    for (const group of groups) {
        const key = group.paramCode.trim();
        if (!key)
            continue;
        const existing = merged.get(key);
        if (!existing) {
            merged.set(key, {
                ...group,
                coefficients: dedupeLaborCoefficientsByStoredValue(group.coefficients ?? []),
            });
            continue;
        }
        const coefficientsByIdentity = new Map();
        for (const row of [
            ...(existing.coefficients ?? []),
            ...(group.coefficients ?? []),
        ]) {
            const identity = laborCoefficientIdentity(row);
            if (!coefficientsByIdentity.has(identity)) {
                coefficientsByIdentity.set(identity, row);
            }
        }
        merged.set(key, {
            ...existing,
            schemaFieldUid: group.schemaFieldUid ?? existing.schemaFieldUid,
            paramName: group.paramName ?? existing.paramName,
            kind: group.kind ?? existing.kind,
            anyOf: group.anyOf ?? existing.anyOf,
            coefficients: dedupeLaborCoefficientsByStoredValue([
                ...coefficientsByIdentity.values(),
            ]),
        });
    }
    return [...merged.values()];
}
function findMatchingLaborCoefficient(group, value) {
    return group.coefficients.find((row) => (0, v2_template_work_schema_params_util_1.schemaEnumValueMatchesRule)(value, {
        valueCode: row.valueCode,
        valueLabel: row.valueLabel,
    }) ||
        normalizeLaborValueIdentity(row.valueCode) ===
            normalizeLaborValueIdentity(value.code) ||
        normalizeLaborValueIdentity(row.valueLabel) ===
            normalizeLaborValueIdentity(value.label));
}
function reconcileLaborParam(group, request) {
    if (!matchesField(group, request))
        return group;
    if (request.operation === "delete")
        return null;
    const values = request.field.values;
    const nextBase = {
        ...group,
        schemaFieldUid: request.field.schemaFieldUid,
        paramCode: request.field.code ?? group.paramCode,
        paramName: formatSyncedParamName(request, group.paramName, request.field.code ?? group.paramCode, group.paramCode) ?? group.paramName,
    };
    if (values === undefined)
        return nextBase;
    if ((group.kind ?? "by_value") === "any_of") {
        const selected = new Set(group.anyOf?.valueCodes ?? []);
        const selectedValues = values.filter((value) => selected.has(value.code));
        return {
            ...nextBase,
            anyOf: {
                valueCodes: selectedValues.map((value) => (0, v2_param_slug_util_1.normalizeStoredValueCode)(value.code, value.label)),
                valueLabels: selectedValues.map((value) => (0, v2_param_slug_util_1.normalizeStoredValueLabel)(value.label) ?? value.label),
                coeffOn: group.anyOf?.coeffOn ?? 1,
                coeffOff: group.anyOf?.coeffOff ?? 1,
            },
        };
    }
    const matchedExisting = new Set();
    const synced = values.map((value, index) => {
        const existing = findMatchingLaborCoefficient(group, value);
        if (existing) {
            matchedExisting.add(existing.id ??
                `${normalizeLaborValueIdentity(existing.valueCode)}\0${normalizeLaborValueIdentity(existing.valueLabel)}`);
        }
        return {
            id: existing?.id ?? `sync-${index}-${value.code}`,
            streamExecutor: existing?.streamExecutor ??
                group.coefficients[0]?.streamExecutor ??
                "",
            paramCode: request.field.code ?? group.paramCode,
            paramName: request.field.name ?? group.paramName,
            valueCode: (0, v2_param_slug_util_1.normalizeStoredValueCode)(value.code, value.label),
            valueLabel: (0, v2_param_slug_util_1.normalizeStoredValueLabel)(value.label),
            coefficient: existing?.coefficient ?? 1,
        };
    });
    /** Не дропать строки, которых нет в values — иначе bulk/словарь затирает правки админа. */
    const orphans = group.coefficients.filter((row) => {
        if (!row.valueCode && !row.valueLabel)
            return false;
        const key = row.id ??
            `${normalizeLaborValueIdentity(row.valueCode)}\0${normalizeLaborValueIdentity(row.valueLabel)}`;
        if (matchedExisting.has(key))
            return false;
        return !values.some((value) => (0, v2_template_work_schema_params_util_1.schemaEnumValueMatchesRule)(value, {
            valueCode: row.valueCode,
            valueLabel: row.valueLabel,
        }) ||
            normalizeLaborValueIdentity(row.valueCode) ===
                normalizeLaborValueIdentity(value.code) ||
            normalizeLaborValueIdentity(row.valueLabel) ===
                normalizeLaborValueIdentity(value.label));
    });
    return {
        ...nextBase,
        coefficients: dedupeLaborCoefficientsByStoredValue([...synced, ...orphans]),
    };
}
function reconcileFormulaTokensForField(tokens, request) {
    const aliases = collectFieldAliasCodes(request);
    let invalidated = false;
    return {
        tokens: tokens.map((token) => {
            if (!(0, v2_work_formula_util_1.isParamToken)(token))
                return token;
            if (!aliases.has(token.paramCode))
                return token;
            if (request.operation === "delete") {
                invalidated = true;
                return { ...token, invalid: true };
            }
            return {
                ...token,
                paramCode: request.field.code ?? token.paramCode,
                paramName: formatSyncedParamName(request, token.paramName, request.field.code ?? token.paramCode, token.paramCode) ?? token.paramName,
                invalid: false,
            };
        }),
        invalidated,
    };
}
function sanitizeFormulaAgainstLaborParams(tokens, laborParams) {
    const laborRefs = laborParams.map((group) => ({
        paramCode: group.paramCode,
        paramName: group.paramName ?? null,
    }));
    const nextTokens = (0, v2_work_formula_util_1.markUnknownFormulaLaborParamTokensInvalid)(tokens, laborRefs);
    const invalidated = nextTokens.some((token, index) => (0, v2_work_formula_util_1.isParamToken)(token) &&
        token.invalid &&
        (0, v2_work_formula_util_1.isParamToken)(tokens[index]) &&
        !tokens[index].invalid);
    return { tokens: nextTokens, invalidated };
}
function reconcileTypicalWorkCardWithSchemaField(card, request) {
    const matchingRules = card.rules.filter((rule) => matchesField(rule, request));
    const matchingLabor = card.laborParams.filter((group) => matchesField(group, request));
    const rules = card.rules
        .map((rule) => reconcileRule(rule, request))
        .filter((rule) => rule != null);
    const laborParams = mergeLaborParamGroupsByParamCode(card.laborParams
        .map((group) => reconcileLaborParam(group, request))
        .filter((group) => group != null));
    const formulaReconciled = matchingRules.length > 0 || matchingLabor.length > 0
        ? reconcileFormulaTokensForField(card.formula.tokens, request)
        : { tokens: card.formula.tokens, invalidated: false };
    let formulaTokens = formulaReconciled.tokens;
    let formulasInvalidated = formulaReconciled.invalidated ? 1 : 0;
    const formulaSanitized = sanitizeFormulaAgainstLaborParams(formulaTokens, laborParams);
    formulaTokens = (0, v2_work_formula_util_1.reconcileFormulaLaborParamTokens)(formulaSanitized.tokens, laborParams.map((group) => ({
        paramCode: group.paramCode,
        paramName: group.paramName ?? null,
    })));
    if (formulaSanitized.invalidated) {
        formulasInvalidated = 1;
    }
    const changed = matchingRules.length > 0 ||
        matchingLabor.length > 0 ||
        formulaReconciled.invalidated ||
        formulaSanitized.invalidated ||
        JSON.stringify(formulaTokens) !== JSON.stringify(card.formula.tokens);
    return {
        card: {
            ...card,
            rules,
            laborParams,
            formula: {
                tokens: formulaTokens,
                text: (0, v2_work_formula_util_1.tokensToText)(formulaTokens),
            },
        },
        changed,
        impact: {
            rulesUpdated: request.operation === "upsert" ? matchingRules.length : 0,
            rulesRemoved: request.operation === "delete" ? matchingRules.length : 0,
            laborParamsUpdated: request.operation === "upsert" ? matchingLabor.length : 0,
            laborParamsRemoved: request.operation === "delete" ? matchingLabor.length : 0,
            formulasInvalidated,
        },
    };
}
