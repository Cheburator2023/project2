import type { V2WorkFormulaArchCountKind } from "./v2-typical-work.types";
import { type TypicalWorkTriggerMatchInput } from "./v2-trigger-formula.util";
import type { TypicalWorkTriggerMatchContext } from "./v2-typical-works.util";
/** Маркер в formData: принудительный count для arch_count_coeff в per-instance режиме. */
export declare const V2_PER_INSTANCE_ARCH_COUNT_OVERRIDE_KEY = "__v2PerInstanceArchCountOverride";
export type ArchComponentInstance = {
    sourceLabel: string;
    row: Record<string, unknown>;
    index: number;
};
/**
 * Коды полей «Название …» из параметров схемы для данного arch-компонента.
 */
export declare function resolveArchInstanceNameFieldKeys(schemaParams: ReadonlyArray<{
    code: string;
    name: string;
    archComponent?: string | null;
    values?: ReadonlyArray<unknown>;
}>, kind: V2WorkFormulaArchCountKind | null): string[];
/**
 * Маппинг подписи/типа работы (`Модель`, `Система-источник`, …)
 * → kind для arch_count / списка экземпляров.
 */
export declare function resolveArchComponentKindFromType(archComponentType: string | null | undefined): V2WorkFormulaArchCountKind | null;
/**
 * Экземпляры арх-компонента для per-instance расчёта.
 * `modelService` — без fan-out (один синтетический контекст).
 * Пустой список (кроме modelService) → [] (вклад работы = 0).
 */
export declare function listArchComponentInstances(formData: Record<string, unknown>, archComponentType: string | null | undefined, options?: {
    preferredNameKeys?: readonly string[];
    schemaParams?: ReadonlyArray<{
        code: string;
        name: string;
        archComponent?: string | null;
        values?: ReadonlyArray<unknown>;
    }>;
}): ArchComponentInstance[];
export declare function readPerInstanceArchCountOverride(formData: Record<string, unknown> | null | undefined, kind: V2WorkFormulaArchCountKind): number | null;
/** formData с принудительным arch_count для kind итерации (=1). */
export declare function withPerInstanceArchCountOverride(formData: Record<string, unknown>, kind: V2WorkFormulaArchCountKind | null, count?: number): Record<string, unknown>;
/**
 * formData, где массив итерируемого kind содержит только текущий экземпляр —
 * labor deep-lookup не подтягивает соседние экземпляры.
 */
export declare function formDataWithSingleArchInstance(formData: Record<string, unknown>, kind: V2WorkFormulaArchCountKind | null, instance: ArchComponentInstance): Record<string, unknown>;
export type TypicalWorkInstanceEvalResult = {
    sourceLabel: string;
    index: number;
    expanded: string;
    total: number;
    paramCoefficients?: Record<string, number>;
};
/**
 * Подпись для пустого per-instance расчёта (нет заполненных экземпляров арх. компонента).
 */
export declare function formatEmptyArchInstanceBreakdown(archComponentType: string | null | undefined): string;
/**
 * Экземпляры есть, но ни один не удовлетворяет триггеру появления работы
 * (например AutoML=Да только у части моделей).
 */
export declare function formatNoTriggerMatchingArchInstanceBreakdown(archComponentType: string | null | undefined): string;
/**
 * Контекст триггера для экземпляра fan-out.
 *
 * Для «Модель»:
 * - пустые/дефолтные поля строки (workType: "") не затирают модельный сервис;
 * - осмысленные поля модели (autoML true/false, algorithmType, …) перекрывают
 *   контекст — иначе autoML=false с flatten/другой модели «убивает» AutoML-работы.
 */
export declare function mergeArchInstanceTriggerSource(kind: V2WorkFormulaArchCountKind | null | undefined, baseSource: Record<string, unknown>, instanceRow: Record<string, unknown>): Record<string, unknown>;
/**
 * Per-instance: включать экземпляр в сумму только если на нём сработал
 * триггер появления работы (параметры строки + arch_count на срезе formData).
 */
export declare function archInstanceMatchesWorkTrigger(params: {
    triggerInput: TypicalWorkTriggerMatchInput;
    source: Record<string, unknown>;
    formData: Record<string, unknown>;
    matchContext?: TypicalWorkTriggerMatchContext;
}): boolean;
/**
 * Триггер появления работы на уровне каталога.
 *
 * Для fan-out арх-компонентов (Модель, СИ, …) достаточно совпадения
 * **хотя бы на одном** экземпляре. Иначе flatten formData перезаписывает
 * поля вроде autoML последней строкой и работа пропадает, даже если
 * у одной модели AutoML=Да.
 *
 * В сумму по-прежнему попадают только совпавшие экземпляры
 * (`evaluateWorkAcrossArchInstances` / `archInstanceMatchesWorkTrigger`).
 */
export declare function matchTypicalWorkAppearanceTriggers(params: {
    triggerInput: TypicalWorkTriggerMatchInput;
    archComponentType: string | null | undefined;
    source: Record<string, unknown>;
    formData: Record<string, unknown>;
    matchContext?: TypicalWorkTriggerMatchContext;
}): boolean;
export declare function formatPerInstanceBreakdownExpanded(instances: ReadonlyArray<{
    sourceLabel: string;
    total: number;
    expanded?: string;
    index?: number;
}>, total: number): string;
