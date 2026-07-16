import type { V2WorkArchCountCoeffStep, V2WorkFormulaArchCountKind } from "./v2-typical-work.types";
export declare const V2_WORK_ARCH_COUNT_LIMITS: Record<V2WorkFormulaArchCountKind, {
    min: number;
    max: number;
}>;
export type { V2WorkArchCountCoeffStep, V2WorkFormulaArchCountKind };
export { V2_WORK_FORMULA_ARCH_COUNT_KINDS } from "./v2-typical-work.types";
export declare function formatWorkArchCountKindLabel(kind: V2WorkFormulaArchCountKind): string;
export declare function parseWorkArchCountKindLabel(label: string): V2WorkFormulaArchCountKind | null;
export declare function formatArchCountCoeffSteps(steps: readonly V2WorkArchCountCoeffStep[]): string;
export declare function parseArchCountCoeffSteps(raw: string): V2WorkArchCountCoeffStep[] | null;
export declare function validateArchCountCoeffSteps(kind: V2WorkFormulaArchCountKind, steps: readonly V2WorkArchCountCoeffStep[]): string | null;
export declare function lookupArchCountCoefficient(steps: readonly V2WorkArchCountCoeffStep[], count: number): number | null;
/** Количество арх. компонентов в formData анкеты (не в строке каталога). */
export declare function resolveWorkArchComponentCount(formData: Record<string, unknown>, kind: V2WorkFormulaArchCountKind): number;
export declare function resolveArchCountCoeffFromToken(formData: Record<string, unknown>, kind: V2WorkFormulaArchCountKind, steps: readonly V2WorkArchCountCoeffStep[]): number;
/** Триггер по количеству компонентов: выполнен, если count ≥ минимальный порог из steps. */
export declare function archCountTriggerMatches(formData: Record<string, unknown>, kind: V2WorkFormulaArchCountKind, steps: readonly V2WorkArchCountCoeffStep[]): boolean;
