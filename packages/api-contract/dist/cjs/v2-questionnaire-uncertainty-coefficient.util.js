"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.V2_TYPICAL_WORK_UNCERTAINTY_PARAM_CODE = void 0;
exports.mapV2UncertaintyRiskLevelIncrement = mapV2UncertaintyRiskLevelIncrement;
exports.resolveV2QuestionnaireUncertaintyCoefficient = resolveV2QuestionnaireUncertaintyCoefficient;
exports.isTypicalWorkComputedUncertaintyParam = isTypicalWorkComputedUncertaintyParam;
exports.applyComputedOverallUncertaintyToTypicalWorkParamCoefficients = applyComputedOverallUncertaintyToTypicalWorkParamCoefficients;
exports.syncAtypicalWorkCoefficientsInFormData = syncAtypicalWorkCoefficientsInFormData;
const v2_atypical_works_logic_util_1 = require("./v2-atypical-works-logic.util");
const v2_overall_uncertainty_config_util_1 = require("./v2-overall-uncertainty-config.util");
const v2_overall_uncertainty_runtime_util_1 = require("./v2-overall-uncertainty-runtime.util");
function isPlainRecord(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function readRecord(value) {
    return isPlainRecord(value) ? value : undefined;
}
function readByDotPath(data, dotPath) {
    const segments = dotPath.split(".").filter(Boolean);
    let current = data;
    for (const segment of segments) {
        const obj = readRecord(current);
        if (!obj)
            return undefined;
        current = obj[segment];
    }
    return current;
}
function writeByDotPath(data, dotPath, value) {
    const segments = dotPath.split(".").filter(Boolean);
    if (segments.length === 0)
        return data;
    const next = { ...data };
    let current = next;
    for (let i = 0; i < segments.length - 1; i++) {
        const key = segments[i];
        const existing = readRecord(current[key]);
        const child = existing ? { ...existing } : {};
        current[key] = child;
        current = child;
    }
    current[segments[segments.length - 1]] = value;
    return next;
}
/** Приращение к коэффициенту неопределённости по уровню риска (legacy v2 riskGroup). */
function mapV2UncertaintyRiskLevelIncrement(level) {
    switch (level) {
        case "Низкий":
            return 0.03;
        case "Средний":
            return 0.05;
        case "Высокий":
            return 0.07;
        case "Очень высокий":
            return 0.1;
        default:
            return 0;
    }
}
/**
 * Коэффициент общей неопределённости по методике вкладки «Общая неопределённость».
 * Config берётся из logic rules шаблона (или дефолт СА).
 * Legacy riskGroup со строками «Низкий»/… сохраняет старую формулу Σ+поправка.
 */
function resolveV2QuestionnaireUncertaintyCoefficient(formData, options) {
    const config = (0, v2_overall_uncertainty_runtime_util_1.resolveOverallUncertaintyConfig)(options);
    const legacy = (0, v2_overall_uncertainty_runtime_util_1.resolveLegacyUncertaintyCoefficientFromRiskGroupNames)(formData, config);
    if (legacy)
        return legacy;
    const preview = (0, v2_overall_uncertainty_runtime_util_1.mapFormDataToOverallUncertaintyPreview)(formData, config);
    if (!preview.enabled) {
        return { calculated: false, coefficient: 1 };
    }
    const breakdown = (0, v2_overall_uncertainty_config_util_1.calculateOverallUncertaintyPreview)(config, preview);
    const hasManual = preview.adjPct != null;
    const hasRisks = preview.risks.some((risk) => risk.enabled);
    return {
        calculated: hasManual || hasRisks,
        coefficient: breakdown.coefficient,
    };
}
/** Код параметра «Общая неопределённость» в формулах типовых работ модельного стрима. */
exports.V2_TYPICAL_WORK_UNCERTAINTY_PARAM_CODE = "overallUncertainty";
function normalizeTypicalWorkUncertaintyParamLabel(value) {
    return value.trim().toLowerCase().replace(/ё/g, "е");
}
/** Параметр трудоёмкости «Общая неопределённость» — вычисляемый, не из справочника коэффициентов. */
function isTypicalWorkComputedUncertaintyParam(paramCode, paramName) {
    if (paramCode === exports.V2_TYPICAL_WORK_UNCERTAINTY_PARAM_CODE)
        return true;
    if (!paramName)
        return false;
    return (normalizeTypicalWorkUncertaintyParamLabel(paramName) ===
        "общая неопределенность");
}
/**
 * Подставляет коэффициент общей неопределённости из uncertaintyCalculation
 * по методике конфигуратора (K = 1 + поправка).
 */
function applyComputedOverallUncertaintyToTypicalWorkParamCoefficients(formData, paramCoefficients, options) {
    const refs = options?.laborParamRefs ?? [];
    const formulaCodes = options?.formulaParamCodes ?? [];
    const usesUncertainty = refs.some((ref) => isTypicalWorkComputedUncertaintyParam(ref.paramCode, ref.paramName)) ||
        formulaCodes.some((code) => isTypicalWorkComputedUncertaintyParam(code, null));
    if (!usesUncertainty)
        return;
    const { coefficient } = resolveV2QuestionnaireUncertaintyCoefficient(formData, {
        config: options?.config,
        logicRules: options?.logicRules,
    });
    paramCoefficients[exports.V2_TYPICAL_WORK_UNCERTAINTY_PARAM_CODE] = coefficient;
    for (const ref of refs) {
        if (isTypicalWorkComputedUncertaintyParam(ref.paramCode, ref.paramName)) {
            paramCoefficients[ref.paramCode] = coefficient;
        }
    }
}
/** Подставляет коэффициент неопределённости во все строки arch-блоков atypicalWork. */
function syncAtypicalWorkCoefficientsInFormData(formData, uiSchema, coefficient) {
    const paths = (0, v2_atypical_works_logic_util_1.collectAtypicalWorkArrayPaths)(uiSchema);
    let next = formData;
    const updatedPaths = [];
    let changed = false;
    for (const path of paths) {
        const arr = readByDotPath(next, path);
        if (!Array.isArray(arr) || arr.length === 0)
            continue;
        let pathChanged = false;
        const nextArr = arr.map((row) => {
            if (!isPlainRecord(row))
                return row;
            const prevCoeff = Number(row.coefficient);
            if (Number.isFinite(prevCoeff) && prevCoeff === coefficient)
                return row;
            pathChanged = true;
            return { ...row, coefficient };
        });
        if (pathChanged) {
            next = writeByDotPath(next, path, nextArr);
            updatedPaths.push(path);
            changed = true;
        }
    }
    return { formData: next, updatedPaths, changed };
}
