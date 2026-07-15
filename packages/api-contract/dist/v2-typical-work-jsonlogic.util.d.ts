import type { V2JsonLogicValue } from "./v2-template.types";
import type { TypicalWorkRuleLike } from "./v2-works-catalog-match.util";
import type { V2TypicalWorkFormulaDto, V2TypicalWorkRoundingDto, V2TypicalWorkStoredCalculationLogicDto, V2WorkFormulaToken } from "./v2-typical-work.types";
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
/** Компилирует триггеры работы в JsonLogic (логическое И). Пустой список → false. */
export declare function compileTypicalWorkTriggerRulesToJsonLogic(rules: TypicalWorkRuleLike[]): V2JsonLogicValue;
/** Оборачивает выражение округлением (custom op roundStep). */
export declare function compileTypicalWorkRoundingJsonLogic(inner: V2JsonLogicValue, rounding: V2TypicalWorkRoundingDto): V2JsonLogicValue;
export declare function compileTypicalWorkCalculationLogic(input: {
    formula: V2TypicalWorkFormulaDto;
    rounding: V2TypicalWorkRoundingDto;
    rules: TypicalWorkRuleLike[];
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
}): V2TypicalWorkCalculationLogicDto | null;
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
