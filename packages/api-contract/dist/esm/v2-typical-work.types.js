/**
 * F-03: глобальный справочник типовых работ (вариант A — отдельные таблицы БД).
 * Нормы, условия и коэффициенты — разрез (работа × стрим-исполнитель).
 * Формула и округление — конфигурация версии шаблона.
 */
export const V2_WORK_RULE_OPERATOR_VALUES = [
    "=",
    "!=",
    ">=",
    "<=",
    ">",
    "<",
    "in",
    "not_in",
];
export const V2_WORK_ROUNDING_MODE_VALUES = [
    "CEIL",
    "FLOOR",
    "ROUND",
    "NONE",
];
export const V2_WORK_TRIGGER_STATUS_VALUES = [
    "appears",
    "hidden",
    "no_triggers",
    "invalid",
];
export const V2_LOGIC_WORKSPACE_TAB_VALUES = [
    "works",
    "atypicalWorks",
    "dependencies",
    "jsonlogic",
];
export const V2_WORK_FORMULA_ARCH_COUNT_KINDS = [
    "model",
    "sourceSystem",
    "dataMart",
    "dataProcess",
    "modelService",
];
/** Норма, действующая на дату (для дерева и превью). */
export function resolveActiveNormOnDate(norms, streamExecutor, atDate) {
    const day = atDate.slice(0, 10);
    const matching = norms.filter((n) => {
        if (n.streamExecutor !== streamExecutor)
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
export function defaultWorkFormula() {
    return { tokens: [{ kind: "norm" }], text: "N" };
}
export function defaultWorkRounding() {
    return { mode: "CEIL", step: 0.1 };
}
