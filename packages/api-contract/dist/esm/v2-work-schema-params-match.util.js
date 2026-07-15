import { formatParamNameWithSourceKeys } from "./v2-work-param-source-keys.util";
import { isControlTypeTriggerParam, isSourceTypeTriggerParam, typicalWorkRulesMatchSource, } from "./v2-works-catalog-match.util";
import { stripParamNameSourceKeys } from "./v2-work-param-source-keys.util";
export function findWorkSchemaParameter(params, paramCode, paramName) {
    const direct = params.find((param) => param.code === paramCode);
    if (direct)
        return direct;
    const byAlias = params.find((param) => param.sourceKeys?.includes(paramCode));
    if (byAlias)
        return byAlias;
    if (paramName?.trim()) {
        const name = stripParamNameSourceKeys(paramName).trim();
        const byName = params.find((param) => param.name === name);
        if (byName)
            return byName;
        const normName = name.toLowerCase();
        const byNormName = params.find((param) => stripParamNameSourceKeys(param.name).trim().toLowerCase() === normName);
        if (byNormName)
            return byNormName;
    }
    return undefined;
}
/** CSV/seed-триггер → поле схемы анкеты (алиас «Тип источника» → `type`). */
export function resolveWorkSchemaParamForRule(rule, params) {
    const direct = findWorkSchemaParameter(params, rule.paramCode, rule.paramName) ??
        undefined;
    if (direct)
        return direct;
    if (isSourceTypeTriggerParam(rule.paramCode, rule.paramName)) {
        return (params.find((param) => param.code === "type") ??
            params.find((param) => /тип.*источник/i.test(param.name)));
    }
    if (isControlTypeTriggerParam(rule.paramCode, rule.paramName)) {
        const controlField = params.find((param) => param.code === "вид_контроля") ??
            params.find((param) => /^вид контроля$/i.test(stripParamNameSourceKeys(param.name).trim())) ??
            params.find((param) => param.values?.some((value) => /^(КД|ТМ|ОК|АК|КМЗ|ОВ)\s*—/i.test(value.label) ||
                /^(кд|тм|ок|ак|кмз|ов)$/i.test(value.code))) ??
            params.find((param) => /вид контроля/i.test(param.name));
        if (controlField)
            return controlField;
    }
    return undefined;
}
export function resolveTypicalWorkRulesForSourceMatch(rules, schemaParams) {
    if (!schemaParams?.length)
        return rules;
    return rules.map((rule) => {
        const resolved = resolveWorkSchemaParamForRule(rule, schemaParams);
        if (!resolved)
            return rule;
        return {
            ...rule,
            paramCode: resolved.code,
            paramName: formatParamNameWithSourceKeys(resolved.name, resolved.sourceKeys),
        };
    });
}
export function typicalWorkRulesMatchSourceWithSchema(rules, source, schemaParams) {
    return typicalWorkRulesMatchSource(resolveTypicalWorkRulesForSourceMatch(rules, schemaParams), source);
}
export function remapLaborCoefficientRowsForSchema(rows, schemaParams) {
    if (!schemaParams?.length)
        return [...rows];
    return rows.map((row) => {
        const resolved = resolveWorkSchemaParamForRule(row, schemaParams);
        if (!resolved)
            return row;
        return {
            ...row,
            paramCode: resolved.code,
            paramName: formatParamNameWithSourceKeys(resolved.name, resolved.sourceKeys),
        };
    });
}
