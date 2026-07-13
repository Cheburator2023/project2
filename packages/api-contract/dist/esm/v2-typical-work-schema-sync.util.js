import { tokensToText } from "./v2-work-formula.util";
function matchesField(ref, request) {
    if (ref.schemaFieldUid) {
        return ref.schemaFieldUid === request.field.schemaFieldUid;
    }
    return Boolean(request.field.previousCode && ref.paramCode === request.field.previousCode);
}
function reconcileRule(rule, request) {
    if (!matchesField(rule, request))
        return rule;
    if (request.operation === "delete")
        return null;
    const values = request.field.values;
    if (values === undefined) {
        return {
            ...rule,
            schemaFieldUid: request.field.schemaFieldUid,
            paramCode: request.field.code ?? rule.paramCode,
            paramName: request.field.name ?? rule.paramName,
        };
    }
    const allowed = new Map(values.map((value) => [value.code, value.label]));
    const isSetOperator = rule.operator === "in" || rule.operator === "not_in";
    const nextValues = isSetOperator
        ? (rule.values ?? [])
            .filter((value) => allowed.has(value.code))
            .map((value) => ({
            code: value.code,
            label: allowed.get(value.code) ?? value.label ?? null,
        }))
        : undefined;
    const scalarAvailable = rule.valueCode != null && allowed.has(rule.valueCode);
    return {
        ...rule,
        schemaFieldUid: request.field.schemaFieldUid,
        paramCode: request.field.code ?? rule.paramCode,
        paramName: request.field.name ?? rule.paramName,
        valueCode: isSetOperator ? null : scalarAvailable ? rule.valueCode : null,
        valueLabel: isSetOperator
            ? null
            : scalarAvailable && rule.valueCode != null
                ? (allowed.get(rule.valueCode) ?? rule.valueLabel)
                : null,
        values: nextValues,
    };
}
function reconcileLaborParam(group, request) {
    if (!matchesField(group, request))
        return group;
    if (request.operation === "delete")
        return null;
    const values = request.field.values;
    const oldCoefficients = new Map(group.coefficients.map((row) => [row.valueCode, row]));
    const nextBase = {
        ...group,
        schemaFieldUid: request.field.schemaFieldUid,
        paramCode: request.field.code ?? group.paramCode,
        paramName: request.field.name ?? group.paramName,
    };
    if (values === undefined)
        return nextBase;
    if ((group.kind ?? "by_value") === "any_of") {
        const selected = new Set(group.anyOf?.valueCodes ?? []);
        const selectedValues = values.filter((value) => selected.has(value.code));
        return {
            ...nextBase,
            anyOf: {
                valueCodes: selectedValues.map((value) => value.code),
                valueLabels: selectedValues.map((value) => value.label),
                coeffOn: group.anyOf?.coeffOn ?? 1,
                coeffOff: group.anyOf?.coeffOff ?? 1,
            },
        };
    }
    return {
        ...nextBase,
        coefficients: values.map((value, index) => {
            const existing = oldCoefficients.get(value.code);
            return {
                id: existing?.id ?? `sync-${index}-${value.code}`,
                streamExecutor: existing?.streamExecutor ??
                    group.coefficients[0]?.streamExecutor ??
                    "",
                paramCode: request.field.code ?? group.paramCode,
                paramName: request.field.name ?? group.paramName,
                valueCode: value.code,
                valueLabel: value.label,
                coefficient: existing?.coefficient ?? 1,
            };
        }),
    };
}
function reconcileFormulaTokens(tokens, oldParamCode, request) {
    let invalidated = false;
    return {
        tokens: tokens.map((token) => {
            if ((token.kind !== "param_coeff" && token.kind !== "param_anyof") ||
                token.paramCode !== oldParamCode) {
                return token;
            }
            if (request.operation === "delete") {
                invalidated = true;
                return { ...token, invalid: true };
            }
            return {
                ...token,
                paramCode: request.field.code ?? token.paramCode,
                paramName: request.field.name ?? token.paramName,
                invalid: false,
            };
        }),
        invalidated,
    };
}
export function reconcileTypicalWorkCardWithSchemaField(card, request) {
    const matchingRules = card.rules.filter((rule) => matchesField(rule, request));
    const matchingLabor = card.laborParams.filter((group) => matchesField(group, request));
    const oldCodes = new Set([
        ...matchingRules.map((rule) => rule.paramCode),
        ...matchingLabor.map((group) => group.paramCode),
    ]);
    const rules = card.rules
        .map((rule) => reconcileRule(rule, request))
        .filter((rule) => rule != null);
    const laborParams = card.laborParams
        .map((group) => reconcileLaborParam(group, request))
        .filter((group) => group != null);
    let formulaTokens = card.formula.tokens;
    let formulasInvalidated = 0;
    for (const oldCode of oldCodes) {
        const reconciled = reconcileFormulaTokens(formulaTokens, oldCode, request);
        formulaTokens = reconciled.tokens;
        if (reconciled.invalidated)
            formulasInvalidated = 1;
    }
    const changed = matchingRules.length > 0 || matchingLabor.length > 0;
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
