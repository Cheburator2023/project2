import { normalizeStoredValueCode, normalizeStoredValueLabel, slugParamCode, } from "./v2-param-slug.util";
import { schemaEnumValueMatchesRule } from "./v2-template-work-schema-params.util";
import { formatParamNameWithSourceKeys, stripParamNameSourceKeys, } from "./v2-work-param-source-keys.util";
import { isParamToken, markUnknownFormulaLaborParamTokensInvalid, reconcileFormulaLaborParamTokens, tokensToText, } from "./v2-work-formula.util";
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
        const slug = slugParamCode(stripParamNameSourceKeys(request.field.name).trim());
        if (slug)
            aliases.add(slug);
    }
    return aliases;
}
function formatSyncedParamName(request, currentName, nextCode, previousCode) {
    const displayName = stripParamNameSourceKeys(request.field.name ?? currentName ?? "").trim();
    if (!displayName)
        return currentName ?? null;
    const aliasCodes = [
        nextCode,
        previousCode,
        request.field.previousCode,
        ...(request.field.aliasCodes ?? []),
        currentName ? slugParamCode(stripParamNameSourceKeys(currentName)) : null,
    ].filter((code) => Boolean(code?.trim()));
    return formatParamNameWithSourceKeys(displayName, [...new Set(aliasCodes)]);
}
function matchesField(ref, request) {
    if (ref.schemaFieldUid &&
        ref.schemaFieldUid === request.field.schemaFieldUid) {
        return true;
    }
    const aliases = collectFieldAliasCodes(request);
    if (aliases.has(ref.paramCode))
        return true;
    if (request.field.name?.trim() && ref.paramName?.trim()) {
        const fieldName = stripParamNameSourceKeys(request.field.name)
            .trim()
            .toLowerCase();
        const refName = stripParamNameSourceKeys(ref.paramName).trim().toLowerCase();
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
            .filter((value) => values.some((allowedValue) => schemaEnumValueMatchesRule(allowedValue, {
            valueCode: value.code,
            valueLabel: value.label,
        })))
            .map((value) => {
            const matched = values.find((allowedValue) => schemaEnumValueMatchesRule(allowedValue, {
                valueCode: value.code,
                valueLabel: value.label,
            }));
            return {
                code: matched?.code ?? value.code,
                label: matched?.label ?? value.label ?? null,
            };
        })
        : undefined;
    const scalarMatch = values.find((value) => schemaEnumValueMatchesRule(value, rule));
    const scalarAvailable = scalarMatch != null;
    return {
        ...rule,
        schemaFieldUid: request.field.schemaFieldUid,
        paramCode: request.field.code ?? rule.paramCode,
        paramName: formatSyncedParamName(request, rule.paramName, request.field.code ?? rule.paramCode, rule.paramCode) ?? rule.paramName,
        valueCode: isSetOperator
            ? null
            : scalarAvailable
                ? normalizeStoredValueCode(scalarMatch.code, scalarMatch.label)
                : null,
        valueLabel: isSetOperator
            ? null
            : scalarAvailable
                ? normalizeStoredValueLabel(scalarMatch.label ?? rule.valueLabel)
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
export function laborCoefficientStoredKey(row) {
    if (row.valueCode == null && !row.valueLabel?.trim())
        return "";
    return normalizeLaborValueIdentity(normalizeStoredValueCode(row.valueCode ?? row.valueLabel ?? "", row.valueLabel));
}
export function dedupeLaborCoefficientsByStoredValue(coefficients) {
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
export function mergeLaborParamGroupsByParamCode(groups) {
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
    return group.coefficients.find((row) => schemaEnumValueMatchesRule(value, {
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
                valueCodes: selectedValues.map((value) => normalizeStoredValueCode(value.code, value.label)),
                valueLabels: selectedValues.map((value) => normalizeStoredValueLabel(value.label) ?? value.label),
                coeffOn: group.anyOf?.coeffOn ?? 1,
                coeffOff: group.anyOf?.coeffOff ?? 1,
            },
        };
    }
    return {
        ...nextBase,
        coefficients: values.map((value, index) => {
            const existing = findMatchingLaborCoefficient(group, value);
            return {
                id: existing?.id ?? `sync-${index}-${value.code}`,
                streamExecutor: existing?.streamExecutor ??
                    group.coefficients[0]?.streamExecutor ??
                    "",
                paramCode: request.field.code ?? group.paramCode,
                paramName: request.field.name ?? group.paramName,
                valueCode: normalizeStoredValueCode(value.code, value.label),
                valueLabel: normalizeStoredValueLabel(value.label),
                coefficient: existing?.coefficient ?? 1,
            };
        }),
    };
}
function reconcileFormulaTokensForField(tokens, request) {
    const aliases = collectFieldAliasCodes(request);
    let invalidated = false;
    return {
        tokens: tokens.map((token) => {
            if (!isParamToken(token))
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
    const nextTokens = markUnknownFormulaLaborParamTokensInvalid(tokens, laborRefs);
    const invalidated = nextTokens.some((token, index) => isParamToken(token) &&
        token.invalid &&
        isParamToken(tokens[index]) &&
        !tokens[index].invalid);
    return { tokens: nextTokens, invalidated };
}
export function reconcileTypicalWorkCardWithSchemaField(card, request) {
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
    formulaTokens = reconcileFormulaLaborParamTokens(formulaSanitized.tokens, laborParams.map((group) => ({
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
                text: tokensToText(formulaTokens),
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
