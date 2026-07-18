import { defaultWorkRounding } from "./v2-typical-work.types";
import { evaluateWorkFormula, roundWorkEffortValue, validateWorkFormulaTokens, } from "./v2-work-formula.util";
import { evaluateTermsFormula, termsToTokenFormula, validateTermsFormula, } from "./v2-work-terms-formula.util";
import { catalogValueMatchesTriggerRule, isAlwaysShownTriggerParam, isControlTypeTriggerParam, isPresenceOnlyTriggerRule, isSourceTypeTriggerParam, resolveTriggerStatusCatalogParam, triggerRuleCatalogGroupKey, normalizeTypicalWorkTriggerRulesForMatch, } from "./v2-works-catalog-match.util";
import { findWorkSchemaParameter } from "./v2-work-schema-params-match.util";
import { isNumericLaborByValueParam } from "./v2-numeric-labor-range.util";
import { hasTypicalWorkTriggersConfigured, matchTypicalWorkTriggers, validateTriggerFormulaTokens, } from "./v2-trigger-formula.util";
function parseIsoDay(value) {
    const day = value.slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : null;
}
/** Сколько норм действуют на указанную дату (после базовой валидации периодов). */
export function countActiveNormsOnDate(norms, atDate) {
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
export function validateNormInputs(norms, streamExecutor, options) {
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
export function validateRoundingInput(rounding) {
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
export function validateCoefficientValue(value, path) {
    if (!Number.isFinite(value) || value < 0) {
        return [{ path, message: "Коэффициент должен быть неотрицательным числом" }];
    }
    return [];
}
export function validateWorkName(name) {
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
export function collectAllowedParamCodes(laborInputs) {
    return new Set(laborInputs.map((l) => l.paramCode));
}
export function validateFormulaAgainstParams(tokens, allowedParamCodes) {
    const err = validateWorkFormulaTokens(tokens, {
        allowedParamCodes,
        allowInvalidParamRefs: true,
    });
    return err ? [{ path: "formula", message: err }] : [];
}
export function laborParamRefsFromPatchGroups(laborParams) {
    return laborParams.map((group) => ({
        paramCode: group.paramCode,
        paramName: group.paramName ?? null,
    }));
}
export function validateFormulaAgainstLaborParams(tokens, laborParams) {
    const err = validateWorkFormulaTokens(tokens, {
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
export function validateFormulaNonNegativeEffort(params) {
    const normValue = resolveActiveNormValueOnDate(params.norms, params.coverageDate);
    if (normValue == null)
        return [];
    const rounding = params.rounding ?? defaultWorkRounding();
    const paramCoefficients = params.laborParams?.length
        ? maxLaborParamCoefficients(params.laborParams)
        : {};
    const ctx = { norm: normValue, paramCoefficients, source: {} };
    if (params.formulaTerms?.terms.some((term) => term.kind === "transitive")) {
        return [];
    }
    let rounded = null;
    if (params.formulaTerms) {
        const termsError = validateTermsFormula(params.formulaTerms.terms);
        if (termsError)
            return [];
        const termsValue = evaluateTermsFormula({
            terms: params.formulaTerms.terms,
            baseNorm: normValue,
            resolveFactorCoeff: (paramCode) => paramCoefficients[paramCode] ?? 0,
        });
        if (termsValue != null) {
            rounded = roundWorkEffortValue(termsValue, rounding);
        }
    }
    const tokenFormula = params.formula?.tokens?.length
        ? params.formula
        : params.formulaTerms
            ? termsToTokenFormula(params.formulaTerms)
            : null;
    if (tokenFormula?.tokens.length) {
        const evaluated = evaluateWorkFormula(tokenFormula, ctx);
        if (evaluated.value != null) {
            rounded = roundWorkEffortValue(evaluated.value, rounding);
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
export function collectTypicalWorkPatchValidationErrors(dto, options) {
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
        const termsError = validateTermsFormula(dto.formulaTerms.terms);
        if (termsError) {
            issues.push({ path: "formulaTerms", message: termsError });
        }
    }
    if (dto.formulaTerms && dto.laborParams) {
        const tokens = dto.formula?.tokens ?? termsToTokenFormula(dto.formulaTerms).tokens;
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
export function isTypicalWorkParameterValueActiveOnDate(value, atDate) {
    const day = atDate.slice(0, 10);
    const from = value.validFrom ? parseIsoDay(value.validFrom) : null;
    const to = value.validTo ? parseIsoDay(value.validTo) : null;
    if (from && day < from)
        return false;
    if (to && day > to)
        return false;
    return true;
}
export function filterTypicalWorkParameterValuesActiveOnDate(values, atDate) {
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
        const param = resolveTriggerStatusCatalogParam(rule, catalog);
        if (!param)
            return true;
        return values.some((value) => {
            if (!value.code || !value.label)
                return true;
            return !param.values.some((catalogValue) => catalogValueMatchesTriggerRule(catalogValue, {
                ...rule,
                valueCode: value.code,
                valueLabel: value.label,
            }) &&
                (!atDate ||
                    isTypicalWorkParameterValueActiveOnDate(catalogValue, atDate)));
        });
    }
    if (isPresenceOnlyTriggerRule(rule)) {
        if (isAlwaysShownTriggerParam(rule.paramCode, rule.paramName))
            return false;
        if (isSourceTypeTriggerParam(rule.paramCode, rule.paramName))
            return false;
        if (isControlTypeTriggerParam(rule.paramCode, rule.paramName))
            return false;
        return resolveTriggerStatusCatalogParam(rule, catalog) === undefined;
    }
    const param = resolveTriggerStatusCatalogParam(rule, catalog);
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
    return !param.values.some((value) => catalogValueMatchesTriggerRule(value, rule) &&
        (!atDate || isTypicalWorkParameterValueActiveOnDate(value, atDate)));
}
/** F-03/v4: статус триггеров с учётом каталога и (опционально) черновика ответов. */
export function computeWorkTriggerStatus(rules, catalog, atDate, draftSource, formData, triggerArchCount, triggerMode = "simple", triggerFormula) {
    const matchRules = normalizeTypicalWorkTriggerRulesForMatch(rules.map((rule) => ({
        paramCode: rule.paramCode,
        paramName: rule.paramName ?? null,
        operator: rule.operator ?? "=",
        valueCode: rule.valueCode,
        valueLabel: rule.valueLabel,
        values: rule.values,
    })));
    const triggerInput = {
        mode: triggerMode,
        rules: matchRules,
        triggerArchCount,
        triggerFormula,
    };
    if (!hasTypicalWorkTriggersConfigured(triggerInput)) {
        return "no_triggers";
    }
    if (triggerMode === "formula") {
        const formulaError = validateTriggerFormulaTokens(triggerFormula?.tokens ?? []);
        if (formulaError)
            return "invalid";
        if (draftSource) {
            return matchTypicalWorkTriggers(triggerInput, draftSource, formData ?? draftSource)
                ? "appears"
                : "hidden";
        }
        return "appears";
    }
    if (rules.length > 0) {
        if (catalog?.length) {
            const grouped = new Map();
            for (const rule of rules) {
                const key = triggerRuleCatalogGroupKey(rule, catalog);
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
        return matchTypicalWorkTriggers(triggerInput, draftSource, formData ?? draftSource)
            ? "appears"
            : "hidden";
    }
    return "appears";
}
export function isWorkTriggerGroupInvalid(paramCode, rules, catalog, atDate) {
    return rules.some((rule) => isRuleInputInvalid({ ...rule, paramCode }, catalog, atDate));
}
export function resolveWorkCoefficientCatalogParam(catalog, paramCode, schemaFieldUid) {
    if (schemaFieldUid?.trim()) {
        const byUid = catalog.find((item) => item.schemaFieldUid === schemaFieldUid);
        if (byUid)
            return byUid;
    }
    const direct = catalog.find((item) => item.code === paramCode);
    if (direct)
        return direct;
    return catalog.find((item) => item.sourceKeys?.includes(paramCode));
}
/** Параметр трудоёмкости из поля схемы анкеты (`field_*`), не из глобального CSV. */
export function isSchemaFieldLaborParamCode(paramCode) {
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
export function isWorkCoefficientValueAvailable(row, catalog, atDate) {
    if (row.valueCode == null && row.valueLabel == null)
        return true;
    if (isSchemaFieldLaborParamCode(row.paramCode))
        return true;
    const param = resolveWorkCoefficientCatalogParam(catalog, row.paramCode, row.schemaFieldUid);
    if (!param)
        return false;
    if (param.values.length === 0)
        return true;
    return param.values.some((value) => (value.code === row.valueCode || value.label === row.valueLabel) &&
        (!atDate || isTypicalWorkParameterValueActiveOnDate(value, atDate)));
}
export function isWorkSchemaLaborParamCandidate(param) {
    return (param.values?.length ?? 0) > 0;
}
function mergeCatalogValues(left, right) {
    const byKey = new Map();
    for (const value of [...left, ...right]) {
        const key = `${value.code}\0${value.label}`;
        if (!byKey.has(key))
            byKey.set(key, value);
    }
    return [...byKey.values()];
}
function toWorkCoefficientCatalogParam(param, legacyCode) {
    const sourceKeys = new Set([
        ...(param.sourceKeys ?? [param.code]),
        ...(legacyCode && legacyCode !== param.code ? [legacyCode] : []),
    ]);
    return {
        code: param.code,
        schemaFieldUid: param.schemaFieldUid ?? null,
        sourceKeys: [...sourceKeys],
        values: param.values.map((value) => ({
            code: value.code,
            label: value.label,
        })),
    };
}
/** Каталог коэффициентов как в TypicalWorkEditableCard.coefficientCatalog. */
export function buildWorkCoefficientCatalog(input) {
    const byUid = new Map();
    const byCode = new Map();
    const addParam = (param, legacyCode) => {
        const next = toWorkCoefficientCatalogParam(param, legacyCode);
        const uid = next.schemaFieldUid?.trim();
        if (uid) {
            const existingUid = byUid.get(uid);
            if (existingUid) {
                existingUid.values = mergeCatalogValues(existingUid.values, next.values);
                existingUid.sourceKeys = [
                    ...new Set([
                        ...(existingUid.sourceKeys ?? []),
                        ...(next.sourceKeys ?? []),
                    ]),
                ];
            }
            else {
                byUid.set(uid, next);
            }
        }
        const existingCode = byCode.get(next.code);
        if (existingCode) {
            existingCode.values = mergeCatalogValues(existingCode.values, next.values);
            existingCode.sourceKeys = [
                ...new Set([
                    ...(existingCode.sourceKeys ?? []),
                    ...(next.sourceKeys ?? []),
                ]),
            ];
            if (!existingCode.schemaFieldUid && next.schemaFieldUid) {
                existingCode.schemaFieldUid = next.schemaFieldUid;
            }
        }
        else {
            byCode.set(next.code, { ...next });
        }
    };
    for (const param of input.schemaParams.filter(isWorkSchemaLaborParamCandidate)) {
        addParam({
            code: param.code,
            name: param.name,
            sourceKeys: param.sourceKeys,
            schemaFieldUid: param.schemaFieldUid,
            values: param.values ?? [],
        });
    }
    const methodologyParams = (input.methodologyCatalog ?? []).map((param) => ({
        code: param.code,
        name: param.name ?? param.code,
        sourceKeys: param.sourceKeys,
        schemaFieldUid: param.schemaFieldUid,
        values: param.values,
    }));
    for (const group of input.laborParams) {
        if (group.schemaFieldUid?.trim()) {
            const byLaborUid = input.schemaParams.find((param) => param.schemaFieldUid === group.schemaFieldUid);
            if (byLaborUid) {
                addParam({
                    code: byLaborUid.code,
                    sourceKeys: byLaborUid.sourceKeys,
                    schemaFieldUid: byLaborUid.schemaFieldUid,
                    values: byLaborUid.values ?? [],
                }, group.paramCode);
                continue;
            }
        }
        const alreadyKnown = [...byCode.values(), ...byUid.values()].some((entry) => entry.code === group.paramCode ||
            entry.sourceKeys?.includes(group.paramCode));
        if (alreadyKnown)
            continue;
        const schemaMatch = findWorkSchemaParameter(input.schemaParams, group.paramCode, group.paramName);
        if (schemaMatch) {
            addParam({
                code: schemaMatch.code,
                sourceKeys: schemaMatch.sourceKeys,
                schemaFieldUid: schemaMatch.schemaFieldUid,
                values: schemaMatch.values ?? [],
            }, group.paramCode);
            continue;
        }
        const catalogMatch = findWorkSchemaParameter(methodologyParams, group.paramCode, group.paramName);
        if (catalogMatch) {
            addParam({
                code: catalogMatch.code,
                sourceKeys: catalogMatch.sourceKeys,
                schemaFieldUid: catalogMatch.schemaFieldUid,
                values: catalogMatch.values ?? [],
            }, group.paramCode);
        }
    }
    const merged = new Map();
    for (const entry of [...byUid.values(), ...byCode.values()]) {
        const key = entry.schemaFieldUid?.trim()
            ? `uid:${entry.schemaFieldUid}`
            : `code:${entry.code}`;
        const existing = merged.get(key);
        if (!existing) {
            merged.set(key, entry);
            continue;
        }
        existing.values = mergeCatalogValues(existing.values, entry.values);
        existing.sourceKeys = [
            ...new Set([...(existing.sourceKeys ?? []), ...(entry.sourceKeys ?? [])]),
        ];
    }
    return [...merged.values()];
}
export function collectUnavailableLaborCoefficientIssues(input) {
    const catalog = buildWorkCoefficientCatalog({
        schemaParams: input.schemaParams,
        laborParams: input.laborParams,
        methodologyCatalog: input.methodologyCatalog,
    });
    const issues = [];
    for (const group of input.laborParams) {
        if (group.kind === "any_of")
            continue;
        const catalogParam = resolveWorkCoefficientCatalogParam(catalog, group.paramCode, group.schemaFieldUid);
        if (isNumericLaborByValueParam({
            name: group.paramName,
            values: catalogParam?.values,
        })) {
            continue;
        }
        for (const row of group.coefficients ?? []) {
            if (!row.valueCode && !row.valueLabel)
                continue;
            if (isWorkCoefficientValueAvailable({
                paramCode: group.paramCode,
                schemaFieldUid: group.schemaFieldUid,
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
