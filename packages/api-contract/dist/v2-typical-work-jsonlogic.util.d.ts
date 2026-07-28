import type { V2JsonLogicValue } from "./v2-template.types";
import type { TypicalWorkRuleLike, TypicalWorkTriggerArchCountLike } from "./v2-works-catalog-match.util";
import type { V2TypicalWorkFormulaDto, V2TypicalWorkRoundingDto, V2TypicalWorkStoredCalculationLogicDto, V2TypicalWorkTriggerFormulaDto, V2TypicalWorkTriggerMode, V2WorkFormulaToken } from "./v2-typical-work.types";
import { type TypicalWorkTriggerMatchInput } from "./v2-trigger-formula.util";
import type { V2TypicalWorkFormulaTermsDto } from "./v2-typical-work-v4.types";
/** Скомпилированная расчётная логика типовой работы (F-03 → JsonLogic). */
export type V2TypicalWorkCalculationLogicDto = {
    /** v1 — схема компиляции */
    version: 1;
    /** Условия появления (логическое И). Вычисляется по `source`. */
    include: V2JsonLogicValue;
    /** Формула итога (норма, коэффициенты, округление). */
    result: V2JsonLogicValue;
};
export type TypicalWorkJsonLogicEvalContext = {
    norm: number;
    paramCoefficients: Record<string, number>;
    source?: Record<string, unknown>;
    formData?: Record<string, unknown>;
};
export type TypicalWorkCalculationEvalInput = {
    logic: V2TypicalWorkCalculationLogicDto;
    rules: TypicalWorkRuleLike[];
    source: Record<string, unknown>;
    formData?: Record<string, unknown>;
    triggerMode?: V2TypicalWorkTriggerMode;
    triggerArchCount?: TypicalWorkTriggerArchCountLike | null;
    triggerFormula?: V2TypicalWorkTriggerFormulaDto | null;
    norm: number;
    paramCoefficients: Record<string, number>;
    rounding: V2TypicalWorkRoundingDto;
};
export type TypicalWorkCalculationEvalResult = {
    included: boolean;
    symbolic: string;
    expanded: string;
    value: number | null;
    error: string | null;
};
/** Компилирует token-формулу в JsonLogic-выражение (+, −, ×, ÷, var). */
export declare function compileWorkFormulaTokensToJsonLogic(tokens: V2WorkFormulaToken[]): V2JsonLogicValue | null;
export declare function compileTypicalWorkTriggersToJsonLogic(input: TypicalWorkTriggerMatchInput): V2JsonLogicValue;
/** Компилирует триггеры: (ПТ₁ И ПТ₂ …) [И/ИЛИ] arch-count. Пустой список без arch → false. */
export declare function compileTypicalWorkTriggerRulesToJsonLogic(rules: TypicalWorkRuleLike[], triggerArchCount?: TypicalWorkTriggerArchCountLike | null): V2JsonLogicValue;
/** Оборачивает выражение округлением (custom op roundStep). */
export declare function compileTypicalWorkRoundingJsonLogic(inner: V2JsonLogicValue, rounding: V2TypicalWorkRoundingDto): V2JsonLogicValue;
export declare function compileTypicalWorkCalculationLogic(input: {
    formula: V2TypicalWorkFormulaDto;
    rounding: V2TypicalWorkRoundingDto;
    rules: TypicalWorkRuleLike[];
    triggerArchCount?: TypicalWorkTriggerArchCountLike | null;
    triggerMode?: V2TypicalWorkTriggerMode;
    triggerFormula?: V2TypicalWorkTriggerFormulaDto | null;
}): V2TypicalWorkCalculationLogicDto | null;
/** Компилирует только result для сохранения в version_config (без include). */
export declare function compileStoredTypicalWorkResultLogic(formula: V2TypicalWorkFormulaDto, rounding: V2TypicalWorkRoundingDto): V2TypicalWorkStoredCalculationLogicDto | null;
/** Вычисляет подмножество JsonLogic для result/include (без внешнего движка). */
export declare function evaluateTypicalWorkJsonLogicValue(rule: V2JsonLogicValue, data: Record<string, unknown>): unknown;
/** Вычисляет только result-часть (превью формулы в карточке). */
export declare function evaluateTypicalWorkResultJsonLogic(logic: Pick<V2TypicalWorkCalculationLogicDto, "result">, ctx: TypicalWorkJsonLogicEvalContext, formulaText: string): Omit<TypicalWorkCalculationEvalResult, "included">;
/** Полный расчёт для runtime: триггеры + формула. */
export declare function evaluateTypicalWorkCalculation(input: TypicalWorkCalculationEvalInput): TypicalWorkCalculationEvalResult;
/** Превью: JsonLogic если есть, иначе token-движок. */
export declare function previewTypicalWorkCalculation(logic: V2TypicalWorkStoredCalculationLogicDto | null | undefined, fallback: {
    formula: V2TypicalWorkFormulaDto;
    rounding: V2TypicalWorkRoundingDto;
}, ctx: TypicalWorkJsonLogicEvalContext): Omit<TypicalWorkCalculationEvalResult, "included">;
/** Собирает полную логику из сохранённого result и актуальных триггеров. */
export declare function assembleTypicalWorkCalculationLogic(stored: Pick<V2TypicalWorkCalculationLogicDto, "result"> | null | undefined, rules: TypicalWorkRuleLike[], fallback?: {
    formula: V2TypicalWorkFormulaDto;
    rounding: V2TypicalWorkRoundingDto;
}, triggerInput?: TypicalWorkTriggerMatchInput | null): V2TypicalWorkCalculationLogicDto | null;
export type VersionConfigFormulaLike = {
    formula: unknown;
    formulaText?: string | null;
    roundingMode: string;
    roundingStep?: string | number | null;
};
/** Собирает JsonLogic result из сохранённой формулы version_config. */
export declare function compileCalculationLogicFromVersionConfig(config: VersionConfigFormulaLike): V2TypicalWorkStoredCalculationLogicDto | null;
export declare function needsCalculationLogicBackfill(raw: unknown): boolean;
export declare function parseStoredTypicalWorkCalculationLogic(raw: unknown): V2TypicalWorkStoredCalculationLogicDto | null;
/** Дополняет paramCoefficients значениями из resolveFactorCoeff для всех коэф. в формуле. */
export declare function fillFormulaParamCoefficients(tokens: readonly V2WorkFormulaToken[], paramCoefficients: Record<string, number>, resolveFactorCoeff: (paramCode: string) => number): Record<string, number>;
/** Итог по формуле: JsonLogic (из токенов) → token-движок → terms (упрощённая модель). */
export declare function computeTypicalWorkFormulaTotal(params: {
    calculationLogic: V2TypicalWorkStoredCalculationLogicDto | null | undefined;
    formula: unknown;
    formulaText?: string | null;
    terms: V2TypicalWorkFormulaTermsDto;
    rounding: V2TypicalWorkRoundingDto;
    norm: number;
    paramCoefficients: Record<string, number>;
    source?: Record<string, unknown>;
    formData?: Record<string, unknown>;
    resolveFactorCoeff: (paramCode: string) => number;
}): number | null;
export type TypicalWorkFormulaFactorPart = {
    sourceLabel: string | null;
    answerLabel: string;
    coefficient: number;
};
export type TypicalWorkFormulaFactorLine = {
    paramCode: string;
    paramName: string;
    value: number;
    valueLabel?: string;
    aggregation?: "single" | "max";
    parts?: TypicalWorkFormulaFactorPart[];
};
export type TypicalWorkInstanceBreakdownLine = {
    sourceLabel: string;
    index: number;
    expanded: string;
    total: number;
};
/** Разбор формулы типовой работы для «Подробного расчёта». */
export type TypicalWorkFormulaBreakdownDto = {
    symbolic: string;
    expanded: string;
    factors: TypicalWorkFormulaFactorLine[];
    baseNorm: number;
    coefficient: number;
    total: number;
    /** Per-instance: строки по каждому экземпляру арх-компонента. */
    instanceBreakdown?: TypicalWorkInstanceBreakdownLine[];
};
/** Собирает символьную формулу, подстановку и список коэффициентов с реальными значениями. */
export declare function buildTypicalWorkFormulaBreakdown(params: {
    calculationLogic?: V2TypicalWorkStoredCalculationLogicDto | null;
    formula: unknown;
    formulaText?: string | null;
    terms: V2TypicalWorkFormulaTermsDto;
    rounding: V2TypicalWorkRoundingDto;
    norm: number;
    paramCoefficients: Record<string, number>;
    paramNames?: Record<string, string>;
    source?: Record<string, unknown>;
    formData?: Record<string, unknown>;
    resolveFactorCoeff: (paramCode: string) => number;
    coefficient: number;
    total: number;
    paramCoefficientDetails?: Record<string, {
        value: number;
        aggregation: "single" | "max";
        formulaValueLabel: string;
        parts: TypicalWorkFormulaFactorPart[];
    }>;
    instanceBreakdown?: TypicalWorkInstanceBreakdownLine[];
    /** Если задан — подменяет expanded (сумма per-instance). */
    expandedOverride?: string;
}): TypicalWorkFormulaBreakdownDto;
