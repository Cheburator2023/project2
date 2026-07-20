"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeAtypicalWorkRowTotal = computeAtypicalWorkRowTotal;
exports.withComputedAtypicalWorkRowTotal = withComputedAtypicalWorkRowTotal;
exports.collectAtypicalWorkArrayPaths = collectAtypicalWorkArrayPaths;
exports.isAtypicalWorksLogicComplete = isAtypicalWorksLogicComplete;
exports.buildAtypicalWorkRowTotalRule = buildAtypicalWorkRowTotalRule;
exports.buildUnifiedAtypicalTotalRule = buildUnifiedAtypicalTotalRule;
exports.resolveAnketaCalculationLogic = resolveAnketaCalculationLogic;
exports.patchV2AnketaCalculationLogicRules = patchV2AnketaCalculationLogicRules;
exports.patchV2AtypicalWorksLogicRules = patchV2AtypicalWorksLogicRules;
exports.collectAtypicalWorkRowsFromData = collectAtypicalWorkRowsFromData;
const v2_anketa_section_ui_util_1 = require("./v2-anketa-section-ui.util");
const v2_default_typical_works_logic_util_1 = require("./v2-default-typical-works-logic.util");
function readRecord(value) {
    return value && typeof value === "object" && !Array.isArray(value)
        ? value
        : undefined;
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
function toFiniteFormNumber(value) {
    if (value === null || value === undefined || value === "")
        return null;
    if (typeof value === "number")
        return Number.isFinite(value) ? value : null;
    if (typeof value === "string") {
        const n = Number(value.replace(",", "."));
        return Number.isFinite(n) ? n : null;
    }
    return null;
}
/** Итог строки нетиповой работы — та же формула, что row_computed на сервере. */
function computeAtypicalWorkRowTotal(estimateHoursPerDay, coefficient) {
    const estimate = toFiniteFormNumber(estimateHoursPerDay);
    const coeff = toFiniteFormNumber(coefficient);
    if (estimate === null || coeff === null)
        return null;
    const product = estimate * coeff;
    return Number.isFinite(product) ? product : null;
}
function withComputedAtypicalWorkRowTotal(row) {
    const total = computeAtypicalWorkRowTotal(row.estimateHoursPerDay, row.coefficient);
    if (total === null) {
        const { total: _removed, ...rest } = row;
        return rest;
    }
    return { ...row, total };
}
/** Dot-пути массивов «Нетиповые работы» из uiSchema (archComponent: atypicalWork). */
function collectAtypicalWorkArrayPaths(uiSchema, prefix = "") {
    const branch = readRecord(uiSchema);
    if (!branch)
        return [];
    const paths = [];
    const arch = (0, v2_anketa_section_ui_util_1.resolveV2AnketaArchComponent)(branch);
    if (arch === "atypicalWork" && prefix) {
        paths.push(prefix);
    }
    for (const key of Object.keys(branch)) {
        if (key.startsWith("ui:"))
            continue;
        paths.push(...collectAtypicalWorkArrayPaths(branch[key], prefix ? `${prefix}.${key}` : key));
    }
    return [...new Set(paths)];
}
function atypicalRowTotalRuleId(arrayPath) {
    return `unified-atypical-row-total:${arrayPath.replace(/\./g, "_")}`;
}
/** Logic snapshot уже содержит row/total правила нетиповых работ. */
function isAtypicalWorksLogicComplete(logic, options) {
    const arrayPaths = collectAtypicalWorkArrayPaths(options?.uiSchema);
    if (arrayPaths.length === 0)
        return true;
    const ruleIds = new Set((logic?.rules ?? []).map((rule) => rule.id));
    for (const path of arrayPaths) {
        if (!ruleIds.has(atypicalRowTotalRuleId(path)))
            return false;
    }
    return ruleIds.has("unified-atypical-total");
}
function isAtypicalPatchedRuleId(id) {
    return (id === "unified-atypical-total" || id.startsWith("unified-atypical-row-total:"));
}
function buildAtypicalArrayReduceTerm(arrayPath) {
    return {
        reduce: [
            { var: arrayPath },
            {
                "+": [
                    { var: "accumulator" },
                    {
                        if: [
                            { "==": [{ var: "current.includeInCalculation" }, false] },
                            0,
                            {
                                max: [0, { var: "current.total" }],
                            },
                        ],
                    },
                ],
            },
            0,
        ],
    };
}
function buildAtypicalWorkRowTotalRule(arrayPath) {
    return {
        id: atypicalRowTotalRuleId(arrayPath),
        kind: "row_computed",
        payload: {
            label: "Per-row итог нетиповой работы",
            fieldVar: "total",
            arrayPath,
            formulaHint: "row.total = оценка (ч/д) × коэффициент",
        },
        condition: {
            "*": [{ var: "estimateHoursPerDay" }, { var: "coefficient" }],
        },
        targetPath: `/${arrayPath.replace(/\./g, "/")}`,
        description: "ФТ-026: итог строки нетиповой работы.",
        dependencies: [],
    };
}
function buildUnifiedAtypicalTotalRule(arrayPaths) {
    if (arrayPaths.length === 0)
        return null;
    const condition = arrayPaths.length === 1
        ? buildAtypicalArrayReduceTerm(arrayPaths[0])
        : {
            "+": arrayPaths.map((path) => buildAtypicalArrayReduceTerm(path)),
        };
    return {
        id: "unified-atypical-total",
        kind: "computed",
        payload: {
            mode: "expert",
            role: "atypical_total",
            label: "Сумма по нетиповым работам",
            calcModel: "unified",
            formulaHint: "Σ нетиповые работы по всем arch-блокам atypicalWork (includeInCalculation ≠ false).",
        },
        condition,
        targetPath: "/summary/atypicalTotal",
        description: "ФТ-026: сумма итоговых оценок нетиповых работ.",
        dependencies: arrayPaths.map((path) => `/${path.replace(/\./g, "/")}`),
    };
}
/** Патч logic только если в snapshot/версии не хватает catalog/row-total правил. */
function resolveAnketaCalculationLogic(logic, options) {
    const upgraded = (0, v2_default_typical_works_logic_util_1.upgradeTypicalWorksCatalogLogicRules)(logic, options);
    const withTypical = (0, v2_default_typical_works_logic_util_1.isTypicalWorksCatalogLogicComplete)(upgraded, options)
        ? upgraded
        : (0, v2_default_typical_works_logic_util_1.patchV2TypicalWorksLogicRules)(upgraded, options);
    return isAtypicalWorksLogicComplete(withTypical, {
        uiSchema: options?.uiSchema,
    })
        ? withTypical
        : patchV2AtypicalWorksLogicRules(withTypical, {
            uiSchema: options?.uiSchema,
        });
}
/** Патч типовых + нетиповых правил калькуляции под uiSchema шаблона. */
function patchV2AnketaCalculationLogicRules(logic, options) {
    return resolveAnketaCalculationLogic(logic, options);
}
/** Добавляет row_computed и unified-atypical-total для arch-блоков «Нетиповые работы». */
function patchV2AtypicalWorksLogicRules(logic, options) {
    const arrayPaths = collectAtypicalWorkArrayPaths(options?.uiSchema);
    if (arrayPaths.length === 0) {
        return logic;
    }
    const rest = (logic?.rules ?? []).filter((rule) => !isAtypicalPatchedRuleId(rule.id));
    const injected = arrayPaths.map((path) => buildAtypicalWorkRowTotalRule(path));
    const atypicalTotal = buildUnifiedAtypicalTotalRule(arrayPaths);
    if (atypicalTotal)
        injected.push(atypicalTotal);
    return { ...logic, rules: [...rest, ...injected] };
}
/** Строки всех массивов нетиповых работ из formData по путям uiSchema. */
function collectAtypicalWorkRowsFromData(data, uiSchema) {
    const paths = collectAtypicalWorkArrayPaths(uiSchema);
    const rows = [];
    for (const path of paths) {
        const arr = readByDotPath(data, path);
        if (Array.isArray(arr))
            rows.push(...arr);
    }
    return rows;
}
