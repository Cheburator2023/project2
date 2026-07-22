"use strict";
/**
 * F-03: глобальный справочник типовых работ (вариант A — отдельные таблицы БД).
 * Нормы, условия и коэффициенты — разрез (работа × стрим-исполнитель).
 * Формула и округление — конфигурация версии шаблона.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.V2_TYPICAL_WORK_TRIGGER_MODE_VALUES = exports.V2_TYPICAL_WORK_TRIGGER_ARCH_COUNT_OPERATOR_VALUES = exports.V2_WORK_FORMULA_ARCH_COUNT_KINDS = exports.V2_LOGIC_WORKSPACE_TAB_VALUES = exports.V2_WORK_TRIGGER_STATUS_VALUES = exports.V2_WORK_ROUNDING_MODE_VALUES = exports.V2_WORK_RULE_OPERATOR_VALUES = void 0;
exports.defaultTriggerArchCount = defaultTriggerArchCount;
exports.defaultTriggerFormula = defaultTriggerFormula;
exports.resolveActiveNormOnDate = resolveActiveNormOnDate;
exports.defaultWorkFormula = defaultWorkFormula;
exports.defaultWorkRounding = defaultWorkRounding;
exports.V2_WORK_RULE_OPERATOR_VALUES = [
    "=",
    "!=",
    ">=",
    "<=",
    ">",
    "<",
    "in",
    "not_in",
];
exports.V2_WORK_ROUNDING_MODE_VALUES = [
    "CEIL",
    "FLOOR",
    "ROUND",
    "NONE",
];
exports.V2_WORK_TRIGGER_STATUS_VALUES = [
    "appears",
    "hidden",
    "no_triggers",
    "invalid",
];
exports.V2_LOGIC_WORKSPACE_TAB_VALUES = [
    "works",
    "atypicalWorks",
    "dependencies",
    "uncertainty",
    "jsonlogic",
];
exports.V2_WORK_FORMULA_ARCH_COUNT_KINDS = [
    "model",
    "sourceSystem",
    "dataMart",
    "dataProcess",
    "modelService",
];
exports.V2_TYPICAL_WORK_TRIGGER_ARCH_COUNT_OPERATOR_VALUES = [
    ">=",
    "<=",
    "=",
    ">",
    "<",
];
function defaultTriggerArchCount() {
    return { kind: null, steps: [], combinator: "and" };
}
exports.V2_TYPICAL_WORK_TRIGGER_MODE_VALUES = ["simple", "formula"];
function defaultTriggerFormula() {
    return { tokens: [], text: "" };
}
/** Норма, действующая на дату (для дерева и превью). */
function resolveActiveNormOnDate(norms, streamExecutor, atDate) {
    const day = atDate.slice(0, 10);
    const streams = new Set((typeof streamExecutor === "string"
        ? [streamExecutor]
        : [...streamExecutor])
        .map((value) => value.trim())
        .filter(Boolean));
    const matching = norms.filter((n) => {
        if (!streams.has(n.streamExecutor))
            return false;
        const from = n.validFrom.slice(0, 10);
        const to = n.validTo?.slice(0, 10) ?? null;
        if (day < from)
            return false;
        if (to && day > to)
            return false;
        return true;
    });
    if (matching.length === 0)
        return null;
    return matching[0]?.normValue ?? null;
}
function defaultWorkFormula() {
    return { tokens: [{ kind: "norm" }], text: "N" };
}
function defaultWorkRounding() {
    return { mode: "CEIL", step: 0.1 };
}
