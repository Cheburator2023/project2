"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findWorkSchemaParameter = findWorkSchemaParameter;
exports.resolveWorkSchemaParamForRule = resolveWorkSchemaParamForRule;
exports.resolveTypicalWorkRulesForSourceMatch = resolveTypicalWorkRulesForSourceMatch;
exports.typicalWorkRulesMatchSourceWithSchema = typicalWorkRulesMatchSourceWithSchema;
exports.remapLaborCoefficientRowsForSchema = remapLaborCoefficientRowsForSchema;
const v2_work_param_source_keys_util_1 = require("./v2-work-param-source-keys.util");
const v2_works_catalog_match_util_1 = require("./v2-works-catalog-match.util");
const v2_work_param_source_keys_util_2 = require("./v2-work-param-source-keys.util");
function findWorkSchemaParameter(params, paramCode, paramName) {
    const direct = params.find((param) => param.code === paramCode);
    if (direct)
        return direct;
    const byAlias = params.find((param) => param.sourceKeys?.includes(paramCode));
    if (byAlias)
        return byAlias;
    if (paramName?.trim()) {
        const name = (0, v2_work_param_source_keys_util_2.stripParamNameSourceKeys)(paramName).trim();
        const byName = params.find((param) => param.name === name);
        if (byName)
            return byName;
        const normName = name.toLowerCase();
        const byNormName = params.find((param) => (0, v2_work_param_source_keys_util_2.stripParamNameSourceKeys)(param.name).trim().toLowerCase() === normName);
        if (byNormName)
            return byNormName;
    }
    return undefined;
}
/** CSV/seed-триггер → поле схемы анкеты (алиас «Тип источника» → `type`). */
function resolveWorkSchemaParamForRule(rule, params) {
    if (rule.schemaFieldUid?.trim()) {
        const byUid = params.find((param) => param.schemaFieldUid === rule.schemaFieldUid);
        if (byUid)
            return byUid;
    }
    const direct = findWorkSchemaParameter(params, rule.paramCode, rule.paramName) ??
        undefined;
    if (direct)
        return direct;
    if ((0, v2_works_catalog_match_util_1.isSourceTypeTriggerParam)(rule.paramCode, rule.paramName)) {
        return (params.find((param) => param.code === "type") ??
            params.find((param) => /тип.*источник/i.test(param.name)));
    }
    if ((0, v2_works_catalog_match_util_1.isControlTypeTriggerParam)(rule.paramCode, rule.paramName)) {
        const controlField = params.find((param) => param.code === "вид_контроля") ??
            params.find((param) => /^вид контроля$/i.test((0, v2_work_param_source_keys_util_2.stripParamNameSourceKeys)(param.name).trim())) ??
            params.find((param) => param.values?.some((value) => /^(КД|ТМ|ОК|АК|КМЗ|ОВ)\s*—/i.test(value.label) ||
                /^(кд|тм|ок|ак|кмз|ов)$/i.test(value.code))) ??
            params.find((param) => /вид контроля/i.test(param.name));
        if (controlField)
            return controlField;
    }
    return undefined;
}
function resolveTypicalWorkRulesForSourceMatch(rules, schemaParams) {
    if (!schemaParams?.length)
        return rules;
    return rules.map((rule) => {
        const resolved = resolveWorkSchemaParamForRule(rule, schemaParams);
        if (!resolved)
            return rule;
        return {
            ...rule,
            paramCode: resolved.code,
            paramName: (0, v2_work_param_source_keys_util_1.formatParamNameWithSourceKeys)(resolved.name, resolved.sourceKeys),
        };
    });
}
function typicalWorkRulesMatchSourceWithSchema(rules, source, schemaParams, formData, triggerArchCount) {
    return (0, v2_works_catalog_match_util_1.typicalWorkRulesMatchSource)(resolveTypicalWorkRulesForSourceMatch(rules, schemaParams), source, formData, triggerArchCount);
}
function remapLaborCoefficientRowsForSchema(rows, schemaParams) {
    if (!schemaParams?.length)
        return [...rows];
    return rows.map((row) => {
        const resolved = resolveWorkSchemaParamForRule(row, schemaParams);
        if (!resolved)
            return row;
        return {
            ...row,
            paramCode: resolved.code,
            paramName: (0, v2_work_param_source_keys_util_1.formatParamNameWithSourceKeys)(resolved.name, resolved.sourceKeys),
        };
    });
}
