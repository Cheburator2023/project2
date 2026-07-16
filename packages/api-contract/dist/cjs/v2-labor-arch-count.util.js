"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isArchCountLaborParamName = isArchCountLaborParamName;
exports.laborCoefficientValuesToArchCountSteps = laborCoefficientValuesToArchCountSteps;
exports.resolveArchCountLaborFromCatalog = resolveArchCountLaborFromCatalog;
exports.splitCatalogLaborArchCounts = splitCatalogLaborArchCounts;
exports.extractLaborArchCountsFromFormula = extractLaborArchCountsFromFormula;
exports.reconcileFormulaWithLaborArchCounts = reconcileFormulaWithLaborArchCounts;
exports.defaultLaborArchCounts = defaultLaborArchCounts;
const v2_csv_formula_import_util_1 = require("./v2-csv-formula-import.util");
const v2_work_arch_count_coeff_util_1 = require("./v2-work-arch-count-coeff.util");
const v2_work_formula_util_1 = require("./v2-work-formula.util");
function buildLinearArchCountSteps(maxCount, increment = 0.75) {
    const steps = [];
    for (let count = 1; count <= maxCount; count += 1) {
        const coefficient = count === 1 ? 1 : Math.round((1 + (count - 1) * increment) * 10000) / 10000;
        steps.push({ count, coefficient });
    }
    return steps;
}
const MODEL_STREAM_SOURCE_COUNT_STEPS = [
    { count: 1, coefficient: 1 },
    { count: 2, coefficient: 1.2 },
    { count: 3, coefficient: 1.4 },
    { count: 4, coefficient: 1.6 },
    { count: 5, coefficient: 1.8 },
    { count: 6, coefficient: 2 },
    { count: 7, coefficient: 2.2 },
    { count: 8, coefficient: 2.4 },
    { count: 9, coefficient: 2.6 },
    { count: 10, coefficient: 3 },
];
function formatArchCountFormulaSteps(steps) {
    return steps
        .map((step) => `${step.count}=${String(step.coefficient).replace(".", ",")}`)
        .join("; ");
}
const ARCH_COUNT_LABOR_PARAM_LABELS = {
    [(0, v2_csv_formula_import_util_1.normalizeParamLabel)("Кол-во моделей")]: {
        kind: "model",
        defaultSteps: formatArchCountFormulaSteps(buildLinearArchCountSteps(15)),
    },
    [(0, v2_csv_formula_import_util_1.normalizeParamLabel)("Количество моделей")]: {
        kind: "model",
        defaultSteps: formatArchCountFormulaSteps(buildLinearArchCountSteps(15)),
    },
    [(0, v2_csv_formula_import_util_1.normalizeParamLabel)("Кол-во источников для проработки")]: {
        kind: "sourceSystem",
        defaultSteps: formatArchCountFormulaSteps(MODEL_STREAM_SOURCE_COUNT_STEPS),
    },
};
function isArchCountLaborParamName(paramName) {
    return Boolean(ARCH_COUNT_LABOR_PARAM_LABELS[(0, v2_csv_formula_import_util_1.normalizeParamLabel)(paramName)]);
}
function laborCoefficientValuesToArchCountSteps(values) {
    return values
        .map((row) => ({
        count: Number(String(row.label).trim()),
        coefficient: row.coefficient,
    }))
        .filter((step) => Number.isInteger(step.count) &&
        step.count >= 1 &&
        Number.isFinite(step.coefficient) &&
        step.coefficient > 0)
        .sort((a, b) => a.count - b.count);
}
function resolveArchCountLaborFromCatalog(paramName, values) {
    const config = ARCH_COUNT_LABOR_PARAM_LABELS[(0, v2_csv_formula_import_util_1.normalizeParamLabel)(paramName)];
    if (!config)
        return null;
    const fromValues = values?.length
        ? laborCoefficientValuesToArchCountSteps(values)
        : [];
    const fromDefault = (0, v2_work_arch_count_coeff_util_1.parseArchCountCoeffSteps)(config.defaultSteps) ?? [];
    return {
        kind: config.kind,
        steps: fromValues.length > 0 ? fromValues : fromDefault,
        paramName: paramName.trim(),
    };
}
function splitCatalogLaborArchCounts(input) {
    const laborArchCounts = [];
    const archParamNames = new Set();
    for (const paramName of input.laborParams) {
        const group = input.laborCoefficients?.find((row) => row.paramName.trim() === paramName.trim());
        const arch = resolveArchCountLaborFromCatalog(paramName, group?.values);
        if (arch) {
            laborArchCounts.push(arch);
            archParamNames.add(paramName.trim());
        }
    }
    return {
        laborParams: input.laborParams.filter((param) => !archParamNames.has(param.trim())),
        laborCoefficients: (input.laborCoefficients ?? []).filter((group) => !archParamNames.has(group.paramName.trim())),
        laborArchCounts,
    };
}
function extractLaborArchCountsFromFormula(formula) {
    const result = [];
    const seen = new Set();
    for (const token of formula.tokens) {
        if (token.kind !== "arch_count_coeff")
            continue;
        if (seen.has(token.archComponentKind))
            continue;
        seen.add(token.archComponentKind);
        result.push({
            kind: token.archComponentKind,
            steps: [...token.steps],
            paramName: null,
        });
    }
    return result;
}
function reconcileFormulaWithLaborArchCounts(formula, laborArchCounts) {
    const archKinds = new Set(laborArchCounts.map((row) => row.kind));
    const baseTokens = formula.tokens.filter((token) => token.kind !== "arch_count_coeff" ||
        !archKinds.has(token.archComponentKind));
    const archTokens = laborArchCounts.map((row) => ({
        kind: "arch_count_coeff",
        archComponentKind: row.kind,
        steps: [...row.steps],
    }));
    if (archTokens.length === 0) {
        return {
            tokens: baseTokens,
            text: (0, v2_work_formula_util_1.tokensToText)(baseTokens),
        };
    }
    const normIndex = baseTokens.findIndex((token) => token.kind === "norm");
    const insertAt = normIndex >= 0 ? normIndex + 1 : 0;
    const nextTokens = [...baseTokens];
    if (insertAt < nextTokens.length &&
        nextTokens[insertAt]?.kind === "operator" &&
        nextTokens[insertAt]?.op === "*") {
        nextTokens.splice(insertAt + 1, 0, ...archTokens);
    }
    else if (insertAt === 0 || nextTokens.length === 0) {
        nextTokens.push(...archTokens);
    }
    else {
        nextTokens.splice(insertAt, 0, { kind: "operator", op: "*" }, ...archTokens);
    }
    return {
        tokens: nextTokens,
        text: (0, v2_work_formula_util_1.tokensToText)(nextTokens),
    };
}
function defaultLaborArchCounts() {
    return [];
}
