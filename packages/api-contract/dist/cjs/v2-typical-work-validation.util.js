"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.countActiveNormsOnDate = countActiveNormsOnDate;
exports.validateNormInputs = validateNormInputs;
exports.validateRoundingInput = validateRoundingInput;
exports.validateCoefficientValue = validateCoefficientValue;
exports.validateWorkName = validateWorkName;
exports.collectAllowedParamCodes = collectAllowedParamCodes;
exports.validateFormulaAgainstParams = validateFormulaAgainstParams;
exports.laborParamRefsFromPatchGroups = laborParamRefsFromPatchGroups;
exports.validateFormulaAgainstLaborParams = validateFormulaAgainstLaborParams;
exports.validateFormulaNonNegativeEffort = validateFormulaNonNegativeEffort;
exports.collectTypicalWorkPatchValidationErrors = collectTypicalWorkPatchValidationErrors;
exports.isTypicalWorkParameterValueActiveOnDate = isTypicalWorkParameterValueActiveOnDate;
exports.filterTypicalWorkParameterValuesActiveOnDate = filterTypicalWorkParameterValuesActiveOnDate;
exports.computeWorkTriggerStatus = computeWorkTriggerStatus;
exports.isWorkTriggerGroupInvalid = isWorkTriggerGroupInvalid;
exports.resolveWorkCoefficientCatalogParam = resolveWorkCoefficientCatalogParam;
exports.isSchemaFieldLaborParamCode = isSchemaFieldLaborParamCode;
exports.isWorkCoefficientValueAvailable = isWorkCoefficientValueAvailable;
exports.isWorkSchemaLaborParamCandidate = isWorkSchemaLaborParamCandidate;
exports.buildWorkCoefficientCatalog = buildWorkCoefficientCatalog;
exports.collectUnavailableLaborCoefficientIssues = collectUnavailableLaborCoefficientIssues;
const v2_typical_work_types_1 = require("./v2-typical-work.types");
const v2_work_formula_util_1 = require("./v2-work-formula.util");
const v2_work_terms_formula_util_1 = require("./v2-work-terms-formula.util");
const v2_works_catalog_match_util_1 = require("./v2-works-catalog-match.util");
const v2_work_schema_params_match_util_1 = require("./v2-work-schema-params-match.util");
const v2_trigger_formula_util_1 = require("./v2-trigger-formula.util");
function parseIsoDay(value) {
    const day = value.slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : null;
}
/** Сколько норм действуют на указанную дату (после базовой валидации периодов). */
function countActiveNormsOnDate(norms, atDate) {
    const day = atDate.slice(0, 10);
    let count = 0;
    for (const norm of norms) {
        const from = parseIsoDay(norm.validFrom);
        if (!from)
            continue;
        const to = norm.validTo ? parseIsoDay(norm.validTo) : null;
        if (day < from)
            continue;
        if (to && day > to)
            continue;
        count++;
    }
    return count;
}
function validateNormInputs(norms, streamExecutor, options) {
    const issues = [];
    norms.forEach((norm, index) => {
        const base = `norms[${index}]`;
        if (!Number.isFinite(norm.normValue) || norm.normValue < 0) {
            issues.push({
                path: `${base}.normValue`,
                message: "Норма должна быть неотрицательным числом",
            });
        }
        const from = parseIsoDay(norm.validFrom);
        if (!from) {
            issues.push({
                path: `${base}.validFrom`,
                message: "Укажите дату начала действия",
            });
        }
        const to = norm.validTo ? parseIsoDay(norm.validTo) : null;
        if (norm.validTo && !to) {
            issues.push({
                path: `${base}.validTo`,
                message: "Некорректная дата окончания",
            });
        }
        if (from && to && to <= from) {
            issues.push({
                path: `${base}.validTo`,
                message: "Дата окончания должна быть позже даты начала",
            });
        }
    });
    const periods = norms
        .map((norm, index) => ({
        index,
        from: parseIsoDay(norm.validFrom),
        to: norm.validTo ? parseIsoDay(norm.validTo) : null,
    }))
        .filter((p) => p.from);
    for (let i = 0; i < periods.length; i++) {
        for (let j = i + 1; j < periods.length; j++) {
            const a = periods[i];
            const b = periods[j];
            if (!a?.from || !b?.from)
                continue;
            const aEnd = a.to ?? "9999-12-31";
            const bEnd = b.to ?? "9999-12-31";
            if (a.from <= bEnd && b.from <= aEnd) {
                issues.push({
                    path: `norms[${a.index}]`,
                    message: `Период действия пересекается с уже заданным (${streamExecutor})`,
                });
                issues.push({
                    path: `norms[${b.index}]`,
                    message: `Период действия пересекается с уже заданным (${streamExecutor})`,
                });
            }
        }
    }
    const coverageDate = options?.coverageDate;
    if (coverageDate && norms.length > 0) {
        const activeCount = countActiveNormsOnDate(norms, coverageDate);
        if (activeCount === 0) {
            issues.push({
                path: "norms",
                message: `На дату ${coverageDate.slice(0, 10)} нет действующей нормы для стрима «${streamExecutor}»`,
            });
        }
        else if (activeCount > 1) {
            issues.push({
                path: "norms",
                message: `На дату ${coverageDate.slice(0, 10)} действует более одной нормы для стрима «${streamExecutor}»`,
            });
        }
    }
    return issues;
}
function validateRoundingInput(rounding) {
    if (rounding.mode === "NONE")
        return [];
    const step = rounding.step;
    if (step == null || !Number.isFinite(step) || step < 0.0001 || step > 1000) {
        return [
            {
                path: "rounding.step",
                message: "Шаг округления должен быть положительным числом в диапазоне [0.0001; 1000]",
            },
        ];
    }
    return [];
}
function validateCoefficientValue(value, path) {
    if (!Number.isFinite(value) || value < 0) {
        return [{ path, message: "Коэффициент должен быть неотрицательным числом" }];
    }
    return [];
}
function validateWorkName(name) {
    const trimmed = name.trim();
    if (!trimmed || trimmed.length > 255) {
        return [
            {
                path: "name",
                message: "Название работы обязательно и должно содержать не более 255 символов",
            },
        ];
    }
    return [];
}
function collectAllowedParamCodes(laborInputs) {
    return new Set(laborInputs.map((l) => l.paramCode));
}
function validateFormulaAgainstParams(tokens, allowedParamCodes) {
    const err = (0, v2_work_formula_util_1.validateWorkFormulaTokens)(tokens, {
        allowedParamCodes,
        allowInvalidParamRefs: true,
    });
    return err ? [{ path: "formula", message: err }] : [];
}
function laborParamRefsFromPatchGroups(laborParams) {
    return laborParams.map((group) => ({
        paramCode: group.paramCode,
        paramName: group.paramName ?? null,
    }));
}
function validateFormulaAgainstLaborParams(tokens, laborParams) {
    const err = (0, v2_work_formula_util_1.validateWorkFormulaTokens)(tokens, {
        laborParams,
        allowInvalidParamRefs: true,
    });
    return err ? [{ path: "formula", message: err }] : [];
}
function resolveActiveNormValueOnDate(norms, coverageDate) {
    const day = coverageDate.slice(0, 10);
    for (const norm of norms) {
        const from = parseIsoDay(norm.validFrom);
        if (!from)
            continue;
        const to = norm.validTo ? parseIsoDay(norm.validTo) : null;
        if (day < from)
            continue;
        if (to && day > to)
            continue;
        if (!Number.isFinite(norm.normValue) || norm.normValue < 0)
            continue;
        return norm.normValue;
    }
    return null;
}
function maxLaborParamCoefficients(laborParams) {
    const map = {};
    for (const group of laborParams) {
        let max = 0;
        if (group.kind === "any_of" && group.anyOf) {
            max = Math.max(group.anyOf.coeffOn, group.anyOf.coeffOff);
        }
        for (const row of group.coefficients ?? []) {
            if (Number.isFinite(row.coefficient)) {
                max = Math.max(max, row.coefficient);
            }
        }
        map[group.paramCode] = max;
    }
    return map;
}
const FORMULA_NEGATIVE_EFFORT_MESSAGE = "Итог формулы не может быть отрицательным: трудозатраты указываются в человеко-днях (≥ 0)";
/** Проверяет, что при действующей норме формула не даёт отрицательный итог (после округления). */
function validateFormulaNonNegativeEffort(params) {
    const normValue = resolveActiveNormValueOnDate(params.norms, params.coverageDate);
    if (normValue == null)
        return [];
    const rounding = params.rounding ?? (0, v2_typical_work_types_1.defaultWorkRounding)();
    const paramCoefficients = params.laborParams?.length
        ? maxLaborParamCoefficients(params.laborParams)
        : {};
    const ctx = { norm: normValue, paramCoefficients, source: {} };
    if (params.formulaTerms?.terms.some((term) => term.kind === "transitive")) {
        return [];
    }
    let rounded = null;
    if (params.formulaTerms) {
        const termsError = (0, v2_work_terms_formula_util_1.validateTermsFormula)(params.formulaTerms.terms);
        if (termsError)
            return [];
        const termsValue = (0, v2_work_terms_formula_util_1.evaluateTermsFormula)({
            terms: params.formulaTerms.terms,
            baseNorm: normValue,
            resolveFactorCoeff: (paramCode) => paramCoefficients[paramCode] ?? 0,
        });
        if (termsValue != null) {
            rounded = (0, v2_work_formula_util_1.roundWorkEffortValue)(termsValue, rounding);
        }
    }
    const tokenFormula = params.formula?.tokens?.length
        ? params.formula
        : params.formulaTerms
            ? (0, v2_work_terms_formula_util_1.termsToTokenFormula)(params.formulaTerms)
            : null;
    if (tokenFormula?.tokens.length) {
        const evaluated = (0, v2_work_formula_util_1.evaluateWorkFormula)(tokenFormula, ctx);
        if (evaluated.value != null) {
            rounded = (0, v2_work_formula_util_1.roundWorkEffortValue)(evaluated.value, rounding);
        }
    }
    if (rounded != null && rounded < 0) {
        return [
            {
                path: params.formulaTerms ? "formulaTerms" : "formula",
                message: FORMULA_NEGATIVE_EFFORT_MESSAGE,
            },
        ];
    }
    return [];
}
/** Клиентская валидация PATCH типовой работы перед автосохранением. */
function collectTypicalWorkPatchValidationErrors(dto, options) {
    const issues = [];
    const stream = dto.streamExecutor?.trim() ?? "";
    const coverageDate = options?.coverageDate ?? new Date().toISOString().slice(0, 10);
    if (dto.name !== undefined) {
        issues.push(...validateWorkName(dto.name));
    }
    if (dto.norms && stream) {
        issues.push(...validateNormInputs(dto.norms, stream, { coverageDate }));
    }
    if (dto.laborParams) {
        for (const [index, group] of dto.laborParams.entries()) {
            if (group.kind === "any_of" && group.anyOf) {
                issues.push(...validateCoefficientValue(group.anyOf.coeffOn, `laborParams[${index}].anyOf.coeffOn`));
                issues.push(...validateCoefficientValue(group.anyOf.coeffOff, `laborParams[${index}].anyOf.coeffOff`));
            }
            for (const [rowIndex, row] of (group.coefficients ?? []).entries()) {
                issues.push(...validateCoefficientValue(row.coefficient, `laborParams[${index}].coefficients[${rowIndex}].coefficient`));
            }
        }
    }
    if (dto.laborCoefficients) {
        dto.laborCoefficients.forEach((row, index) => {
            issues.push(...validateCoefficientValue(row.coefficient, `laborCoefficients[${index}].coefficient`));
        });
        const seen = new Set();
        for (const [index, row] of dto.laborCoefficients.entries()) {
            const key = `${row.paramCode}|${row.valueCode ?? ""}`;
            if (seen.has(key)) {
                issues.push({
                    path: `laborCoefficients[${index}]`,
                    message: "Дублируется комбинация (параметр, значение) для стрима",
                });
            }
            seen.add(key);
        }
    }
    if (dto.rounding) {
        issues.push(...validateRoundingInput(dto.rounding));
    }
    if (dto.formulaTerms) {
        const termsError = (0, v2_work_terms_formula_util_1.validateTermsFormula)(dto.formulaTerms.terms);
        if (termsError) {
            issues.push({ path: "formulaTerms", message: termsError });
        }
    }
    if (dto.formulaTerms && dto.laborParams) {
        const tokens = dto.formula?.tokens ?? (0, v2_work_terms_formula_util_1.termsToTokenFormula)(dto.formulaTerms).tokens;
        issues.push(...validateFormulaAgainstLaborParams(tokens, laborParamRefsFromPatchGroups(dto.laborParams)));
    }
    else if (dto.formula && dto.laborParams) {
        issues.push(...validateFormulaAgainstLaborParams(dto.formula.tokens, laborParamRefsFromPatchGroups(dto.laborParams)));
    }
    if (dto.formula && dto.laborCoefficients) {
        issues.push(...validateFormulaAgainstParams(dto.formula.tokens, collectAllowedParamCodes(dto.laborCoefficients)));
    }
    if ((dto.formula || dto.formulaTerms) && dto.norms?.length) {
        issues.push(...validateFormulaNonNegativeEffort({
            formula: dto.formula,
            formulaTerms: dto.formulaTerms,
            rounding: dto.rounding,
            norms: dto.norms,
            laborParams: dto.laborParams,
            coverageDate,
        }));
    }
    return issues;
}
function isTypicalWorkParameterValueActiveOnDate(value, atDate) {
    const day = atDate.slice(0, 10);
    const from = value.validFrom ? parseIsoDay(value.validFrom) : null;
    const to = value.validTo ? parseIsoDay(value.validTo) : null;
    if (from && day < from)
        return false;
    if (to && day > to)
        return false;
    return true;
}
function filterTypicalWorkParameterValuesActiveOnDate(values, atDate) {
    return values.filter((value) => isTypicalWorkParameterValueActiveOnDate(value, atDate));
}
function isRuleInputInvalid(rule, catalog, atDate) {
    const operator = rule.operator ?? "=";
    if (isSchemaFieldLaborParamCode(rule.paramCode)) {
        return false;
    }
    if (operator === "in" || operator === "not_in") {
        const values = rule.values?.length
            ? rule.values
            : rule.valueCode
                ? [{ code: rule.valueCode, label: rule.valueLabel }]
                : [];
        if (values.length === 0)
            return true;
        const param = (0, v2_works_catalog_match_util_1.resolveTriggerStatusCatalogParam)(rule, catalog);
        if (!param)
            return true;
        return values.some((value) => {
            if (!value.code || !value.label)
                return true;
            return !param.values.some((catalogValue) => (0, v2_works_catalog_match_util_1.catalogValueMatchesTriggerRule)(catalogValue, {
                ...rule,
                valueCode: value.code,
                valueLabel: value.label,
            }) &&
                (!atDate ||
                    isTypicalWorkParameterValueActiveOnDate(catalogValue, atDate)));
        });
    }
    if ((0, v2_works_catalog_match_util_1.isPresenceOnlyTriggerRule)(rule)) {
        if ((0, v2_works_catalog_match_util_1.isSourceTypeTriggerParam)(rule.paramCode, rule.paramName))
            return false;
        if ((0, v2_works_catalog_match_util_1.isControlTypeTriggerParam)(rule.paramCode, rule.paramName))
            return false;
        return (0, v2_works_catalog_match_util_1.resolveTriggerStatusCatalogParam)(rule, catalog) === undefined;
    }
    const param = (0, v2_works_catalog_match_util_1.resolveTriggerStatusCatalogParam)(rule, catalog);
    if (!param)
        return true;
    const threshold = rule.valueLabel ?? rule.valueCode;
    if (param.values.length === 0 &&
        threshold != null &&
        String(threshold).trim() !== "" &&
        (operator === "=" ||
            operator === "!=" ||
            operator === ">=" ||
            operator === "<=" ||
            operator === ">" ||
            operator === "<")) {
        if (operator === "=" || operator === "!=")
            return false;
        return Number.isNaN(Number(threshold));
    }
    return !param.values.some((value) => (0, v2_works_catalog_match_util_1.catalogValueMatchesTriggerRule)(value, rule) &&
        (!atDate || isTypicalWorkParameterValueActiveOnDate(value, atDate)));
}
/** F-03/v4: статус триггеров с учётом каталога и (опционально) черновика ответов. */
function computeWorkTriggerStatus(rules, catalog, atDate, draftSource, formData, triggerArchCount, triggerMode = "simple", triggerFormula) {
    const matchRules = rules.map((rule) => ({
        paramCode: rule.paramCode,
        paramName: rule.paramName ?? null,
        operator: rule.operator ?? "=",
        valueCode: rule.valueCode,
        valueLabel: rule.valueLabel,
        values: rule.values,
    }));
    const triggerInput = {
        mode: triggerMode,
        rules: matchRules,
        triggerArchCount,
        triggerFormula,
    };
    if (!(0, v2_trigger_formula_util_1.hasTypicalWorkTriggersConfigured)(triggerInput)) {
        return "no_triggers";
    }
    if (triggerMode === "formula") {
        const formulaError = (0, v2_trigger_formula_util_1.validateTriggerFormulaTokens)(triggerFormula?.tokens ?? []);
        if (formulaError)
            return "invalid";
        if (draftSource) {
            return (0, v2_trigger_formula_util_1.matchTypicalWorkTriggers)(triggerInput, draftSource, formData ?? draftSource)
                ? "appears"
                : "hidden";
        }
        return "hidden";
    }
    if (rules.length > 0) {
        if (catalog?.length) {
            const grouped = new Map();
            for (const rule of rules) {
                const key = (0, v2_works_catalog_match_util_1.triggerRuleCatalogGroupKey)(rule, catalog);
                const list = grouped.get(key) ?? [];
                list.push(rule);
                grouped.set(key, list);
            }
            for (const [groupKey, groupRules] of grouped) {
                if (isWorkTriggerGroupInvalid(groupKey, groupRules, catalog, atDate)) {
                    return "invalid";
                }
            }
        }
        else if (rules.some((rule) => !rule.paramCode?.trim())) {
            return "invalid";
        }
    }
    if (draftSource) {
        return (0, v2_trigger_formula_util_1.matchTypicalWorkTriggers)(triggerInput, draftSource, formData ?? draftSource)
            ? "appears"
            : "hidden";
    }
    return "appears";
}
function isWorkTriggerGroupInvalid(paramCode, rules, catalog, atDate) {
    return rules.some((rule) => isRuleInputInvalid({ ...rule, paramCode }, catalog, atDate));
}
function resolveWorkCoefficientCatalogParam(catalog, paramCode) {
    const direct = catalog.find((item) => item.code === paramCode);
    if (direct)
        return direct;
    return catalog.find((item) => item.sourceKeys?.includes(paramCode));
}
/** Параметр трудоёмкости из поля схемы анкеты (`field_*`), не из глобального CSV. */
function isSchemaFieldLaborParamCode(paramCode) {
    return /^field_[A-Za-z0-9_-]+$/.test(paramCode.trim());
}
/**
 * F-03 §578: значение коэффициента трудоёмкости доступно, только если оно
 * присутствует в активном глобальном справочнике значений параметра. Если
 * значение удалено — коэффициент исключается из расчёта и помечается в UI
 * меткой «Значение недоступно» (сохранение не блокируется).
 *
 * Строки-флаги без значения (valueCode/valueLabel = null) задают «параметр
 * присутствует» и не ссылаются на словарь — они всегда доступны.
 */
function isWorkCoefficientValueAvailable(row, catalog, atDate) {
    if (row.valueCode == null && row.valueLabel == null)
        return true;
    if (isSchemaFieldLaborParamCode(row.paramCode))
        return true;
    const param = resolveWorkCoefficientCatalogParam(catalog, row.paramCode);
    if (!param)
        return false;
    return param.values.some((value) => (value.code === row.valueCode || value.label === row.valueLabel) &&
        (!atDate || isTypicalWorkParameterValueActiveOnDate(value, atDate)));
}
function isWorkSchemaLaborParamCandidate(param) {
    return (param.values?.length ?? 0) > 0;
}
function toWorkCoefficientCatalogParam(param, legacyCode) {
    const sourceKeys = new Set([
        ...(param.sourceKeys ?? [param.code]),
        ...(legacyCode && legacyCode !== param.code ? [legacyCode] : []),
    ]);
    return {
        code: param.code,
        sourceKeys: [...sourceKeys],
        values: param.values.map((value) => ({
            code: value.code,
            label: value.label,
        })),
    };
}
/** Каталог коэффициентов как в TypicalWorkEditableCard.coefficientCatalog. */
function buildWorkCoefficientCatalog(input) {
    const byCode = new Map();
    const addParam = (param, legacyCode) => {
        byCode.set(param.code, toWorkCoefficientCatalogParam(param, legacyCode));
    };
    for (const param of input.schemaParams.filter(isWorkSchemaLaborParamCandidate)) {
        addParam({
            code: param.code,
            name: param.name,
            sourceKeys: param.sourceKeys,
            values: param.values ?? [],
        });
    }
    const methodologyParams = (input.methodologyCatalog ?? []).map((param) => ({
        code: param.code,
        name: param.name ?? param.code,
        sourceKeys: param.sourceKeys,
        values: param.values,
    }));
    for (const group of input.laborParams) {
        const alreadyKnown = [...byCode.values()].some((entry) => entry.code === group.paramCode ||
            entry.sourceKeys?.includes(group.paramCode));
        if (alreadyKnown)
            continue;
        const schemaMatch = (0, v2_work_schema_params_match_util_1.findWorkSchemaParameter)(input.schemaParams, group.paramCode, group.paramName);
        if (schemaMatch) {
            addParam({
                code: schemaMatch.code,
                sourceKeys: schemaMatch.sourceKeys,
                values: schemaMatch.values ?? [],
            }, group.paramCode);
            continue;
        }
        const catalogMatch = (0, v2_work_schema_params_match_util_1.findWorkSchemaParameter)(methodologyParams, group.paramCode, group.paramName);
        if (catalogMatch) {
            addParam({
                code: catalogMatch.code,
                sourceKeys: catalogMatch.sourceKeys,
                values: catalogMatch.values ?? [],
            }, group.paramCode);
        }
    }
    return [...byCode.values()];
}
function collectUnavailableLaborCoefficientIssues(input) {
    const catalog = buildWorkCoefficientCatalog({
        schemaParams: input.schemaParams,
        laborParams: input.laborParams,
        methodologyCatalog: input.methodologyCatalog,
    });
    const issues = [];
    for (const group of input.laborParams) {
        if (group.kind === "any_of")
            continue;
        for (const row of group.coefficients ?? []) {
            if (!row.valueCode && !row.valueLabel)
                continue;
            if (isWorkCoefficientValueAvailable({
                paramCode: group.paramCode,
                valueCode: row.valueCode,
                valueLabel: row.valueLabel,
            }, catalog, input.atDate)) {
                continue;
            }
            issues.push({
                kind: "labor_value",
                paramCode: group.paramCode,
                paramName: group.paramName,
                message: `Значение параметра трудоёмкости «${row.valueLabel ?? row.valueCode}» недоступно в справочнике`,
            });
        }
    }
    return issues;
}
