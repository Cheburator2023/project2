import type { V2TypicalWorkTriggerArchCountOperator, V2WorkArchCountCoeffStep, V2WorkFormulaArchCountKind } from "./v2-typical-work.types";
export declare const V2_WORK_ARCH_COUNT_LIMITS: Record<V2WorkFormulaArchCountKind, {
    min: number;
    max: number;
}>;
export type { V2WorkArchCountCoeffStep, V2WorkFormulaArchCountKind };
export { V2_WORK_FORMULA_ARCH_COUNT_KINDS } from "./v2-typical-work.types";
export declare function formatWorkArchCountKindLabel(kind: V2WorkFormulaArchCountKind): string;
export declare function formatArchCountCoeffFactorLabel(kind: V2WorkFormulaArchCountKind): string;
export declare function parseWorkArchCountKindLabel(label: string): V2WorkFormulaArchCountKind | null;
export declare function formatArchCountCoeffSteps(steps: readonly V2WorkArchCountCoeffStep[]): string;
export declare function parseArchCountCoeffSteps(raw: string): V2WorkArchCountCoeffStep[] | null;
export declare function resolveLaborArchCountOperator(step: Pick<V2WorkArchCountCoeffStep, "operator">): V2TypicalWorkTriggerArchCountOperator;
export declare function compareArchCount(actual: number, operator: V2TypicalWorkTriggerArchCountOperator, threshold: number): boolean;
/**
 * Безопасный eval формулы коэффициента от N (фактическое количество).
 * Допускаются: N, числа, + - * /, скобки.
 */
export declare function evalArchCountCoefficientFormula(formula: string, n: number): number | null;
export declare function validateArchCountCoefficientFormula(formula: string, sampleN: number): string | null;
export declare function validateArchCountCoeffSteps(kind: V2WorkFormulaArchCountKind, steps: readonly V2WorkArchCountCoeffStep[]): string | null;
/** Labor: first matching step (operator + threshold), const or formula. */
export declare function lookupArchCountCoefficient(steps: readonly V2WorkArchCountCoeffStep[], count: number): number | null;
export declare function formatLaborArchCountStepLabel(step: V2WorkArchCountCoeffStep): string;
/** Количество арх. компонентов в formData анкеты (не в строке каталога). */
export declare function resolveWorkArchComponentCount(formData: Record<string, unknown>, kind: V2WorkFormulaArchCountKind): number;
export declare function resolveArchCountCoeffFromToken(formData: Record<string, unknown>, kind: V2WorkFormulaArchCountKind, steps: readonly V2WorkArchCountCoeffStep[]): number;
export declare function encodeTriggerArchCountSteps(operator: V2TypicalWorkTriggerArchCountOperator, threshold: number): V2WorkArchCountCoeffStep[];
export declare function decodeTriggerArchCountCondition(steps: readonly V2WorkArchCountCoeffStep[]): {
    operator: V2TypicalWorkTriggerArchCountOperator;
    threshold: number;
} | null;
export declare function isTriggerArchCountConfigured(triggerArchCount?: {
    kind?: V2WorkFormulaArchCountKind | null;
    steps?: readonly V2WorkArchCountCoeffStep[] | null;
} | null): boolean;
export declare function formatTriggerArchCountConditionLabel(kind: V2WorkFormulaArchCountKind, steps: readonly V2WorkArchCountCoeffStep[]): string;
export declare function validateTriggerArchCountCondition(kind: V2WorkFormulaArchCountKind, steps: readonly V2WorkArchCountCoeffStep[]): string | null;
/** Триггер по количеству компонентов (оператор сравнения + порог). */
export declare function archCountTriggerMatches(formData: Record<string, unknown>, kind: V2WorkFormulaArchCountKind, steps: readonly V2WorkArchCountCoeffStep[]): boolean;
