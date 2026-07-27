"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeLegacySchemaParamLabel = normalizeLegacySchemaParamLabel;
exports.normalizeLegacySchemaParamCode = normalizeLegacySchemaParamCode;
exports.isObsoleteCatalogLaborParam = isObsoleteCatalogLaborParam;
exports.findWorkSchemaParameter = findWorkSchemaParameter;
exports.resolveWorkSchemaParamForRule = resolveWorkSchemaParamForRule;
exports.resolveTypicalWorkRulesForSourceMatch = resolveTypicalWorkRulesForSourceMatch;
exports.typicalWorkRulesMatchSourceWithSchema = typicalWorkRulesMatchSourceWithSchema;
exports.remapLaborCoefficientRowsForSchema = remapLaborCoefficientRowsForSchema;
const v2_work_param_source_keys_util_1 = require("./v2-work-param-source-keys.util");
const v2_works_catalog_match_util_1 = require("./v2-works-catalog-match.util");
const v2_work_param_source_keys_util_2 = require("./v2-work-param-source-keys.util");
const v2_param_slug_util_1 = require("./v2-param-slug.util");
/**
 * Legacy CSV-ярлыки mdlctl → канонические названия полей схемы анкеты.
 * Сид из старого каталога создавал slug-коды вроде `выбор_класса_моделей`.
 */
const LEGACY_SCHEMA_PARAM_LABEL_ALIASES = {
    "выбор класса моделей": "Класс моделей",
    "выбор класса моделей тип работ": "Класс моделей",
    "пвр/регуляторный": "ПВР/Регуляторная",
};
/**
 * Legacy CSV paramCode → код поля схемы (`modelClass`, `pkRegulatory`).
 */
const LEGACY_SCHEMA_PARAM_CODE_ALIASES = {
    выбор_класса_моделей: "modelClass",
    выбор_класса_моделей_тип_работ: "modelClass",
    класс_моделей: "modelClass",
    пвр_регуляторный: "pkRegulatory",
    пвр_регуляторная: "pkRegulatory",
};
/**
 * Устаревшие labor-параметры каталога без поля в схеме — удаляются при reconcile.
 * Работы и остальные параметры не трогаем.
 */
const OBSOLETE_CATALOG_LABOR_PARAM_CODES = new Set([
    "определение_необходимости_промышленной_реализации",
]);
const OBSOLETE_CATALOG_LABOR_PARAM_NAMES = new Set([
    "определение необходимости промышленной реализации",
]);
/**
 * Нормализует legacy-ярлыки каталога (АвтоМЛ / Маркер / mdlctl) к названиям полей схемы.
 */
function normalizeLegacySchemaParamLabel(name) {
    let next = (0, v2_work_param_source_keys_util_2.stripParamNameSourceKeys)(name).trim();
    next = next.replace(/^АвтоМЛ\s*:/iu, "AutoML:");
    next = next.replace(/\s+в\s+Маркере\s*$/iu, "");
    next = next.replace(/требуется\s+новая\s+модель\s+Маркера\s+для/iu, "Требуется новая модель для");
    next = next.replace(/в\/из\s+Маркер(?:е|а)?\s*$/iu, "в/из ИС 1860");
    const alias = LEGACY_SCHEMA_PARAM_LABEL_ALIASES[next.toLowerCase()];
    if (alias)
        return alias;
    return next.trim();
}
/** Нормализует legacy paramCode (`автомл_*`, `*_в_маркере`, mdlctl CSV) к коду/slug поля схемы. */
function normalizeLegacySchemaParamCode(code) {
    const trimmed = code.trim().toLowerCase();
    const alias = LEGACY_SCHEMA_PARAM_CODE_ALIASES[trimmed];
    if (alias)
        return alias;
    return trimmed
        .replace(/^автомл_/, "automl_")
        .replace(/_в_маркере$/, "")
        .replace(/_маркера_для_/, "_для_")
        .replace(/_в_из_маркер(?:е|а)?$/, "_в_из_ис_1860");
}
/** Labor-параметр из устаревшего CSV без поля схемы (безопасно удалить при sync). */
function isObsoleteCatalogLaborParam(ref) {
    const code = ref.paramCode?.trim().toLowerCase() ?? "";
    if (code && OBSOLETE_CATALOG_LABOR_PARAM_CODES.has(code))
        return true;
    const name = (0, v2_work_param_source_keys_util_2.stripParamNameSourceKeys)(ref.paramName ?? "")
        .trim()
        .toLowerCase();
    return Boolean(name && OBSOLETE_CATALOG_LABOR_PARAM_NAMES.has(name));
}
function paramLabelsEquivalent(a, b) {
    const left = normalizeLegacySchemaParamLabel(a);
    const right = normalizeLegacySchemaParamLabel(b);
    if (left.toLowerCase() === right.toLowerCase())
        return true;
    return (0, v2_param_slug_util_1.slugParamCode)(left) === (0, v2_param_slug_util_1.slugParamCode)(right);
}
function findWorkSchemaParameter(params, paramCode, paramName) {
    const direct = params.find((param) => param.code === paramCode);
    if (direct)
        return direct;
    const byAlias = params.find((param) => param.sourceKeys?.includes(paramCode));
    if (byAlias)
        return byAlias;
    const normalizedCode = normalizeLegacySchemaParamCode(paramCode);
    if (normalizedCode && normalizedCode !== paramCode.trim().toLowerCase()) {
        const byCanonicalCode = params.find((param) => param.code === normalizedCode ||
            param.sourceKeys?.includes(normalizedCode));
        if (byCanonicalCode)
            return byCanonicalCode;
    }
    if (normalizedCode) {
        const byLegacyCode = params.find((param) => {
            const schemaSlug = (0, v2_param_slug_util_1.slugParamCode)(normalizeLegacySchemaParamLabel(param.name));
            return (schemaSlug === normalizedCode ||
                normalizeLegacySchemaParamCode(param.code) === normalizedCode ||
                param.sourceKeys?.some((key) => normalizeLegacySchemaParamCode(key) === normalizedCode));
        });
        if (byLegacyCode)
            return byLegacyCode;
    }
    if (paramName?.trim()) {
        const name = (0, v2_work_param_source_keys_util_2.stripParamNameSourceKeys)(paramName).trim();
        const byName = params.find((param) => param.name === name);
        if (byName)
            return byName;
        const normName = name.toLowerCase();
        const byNormName = params.find((param) => (0, v2_work_param_source_keys_util_2.stripParamNameSourceKeys)(param.name).trim().toLowerCase() === normName);
        if (byNormName)
            return byNormName;
        const byLegacyLabel = params.find((param) => paramLabelsEquivalent(param.name, name));
        if (byLegacyLabel)
            return byLegacyLabel;
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
