import type { V2TypicalWorkFormulaDto, V2TypicalWorkRoundingDto, V2WorkFormulaToken } from "./v2-typical-work.types";
export type WorkFormulaEvalContext = {
    norm: number;
    paramCoefficients: Record<string, number>;
    /** Полный formData анкеты — для arch_count_coeff. */
    formData?: Record<string, unknown>;
};
export type WorkFormulaEvalResult = {
    symbolic: string;
    expanded: string;
    value: number | null;
    error: string | null;
};
export declare function isTransitiveOnlyFormula(tokens: V2WorkFormulaToken[]): boolean;
export declare function hasWorkRefToken(tokens: V2WorkFormulaToken[]): boolean;
export declare function isParamToken(token: V2WorkFormulaToken): token is Extract<V2WorkFormulaToken, {
    kind: "param_coeff" | "param_anyof";
}>;
export type WorkFormulaLaborParamRef = {
    paramCode: string;
    paramName?: string | null;
};
/** Сопоставление токена формулы с параметром из блока трудоёмкости (код, подпись, sourceKeys). */
export declare function workFormulaLaborParamMatches(token: {
    paramCode: string;
    paramName?: string | null;
}, group: WorkFormulaLaborParamRef): boolean;
export declare function isWorkFormulaLaborParamKnown(token: Extract<V2WorkFormulaToken, {
    kind: "param_coeff" | "param_anyof";
}>, laborParams: readonly WorkFormulaLaborParamRef[]): boolean;
export declare function normalizeWorkFormulaLaborParamTokens(tokens: V2WorkFormulaToken[], laborParams: readonly WorkFormulaLaborParamRef[]): V2WorkFormulaToken[];
/** Сопоставляет param-токены формулы с блоком трудоёмкости и снимает invalid при совпадении. */
export declare function reconcileFormulaLaborParamTokens(tokens: V2WorkFormulaToken[], laborParams: readonly WorkFormulaLaborParamRef[]): V2WorkFormulaToken[];
export declare function tokensToText(tokens: V2WorkFormulaToken[]): string;
/** Подставляет человекочитаемые имена параметров в токены формулы. */
export declare function applyWorkFormulaParamNames(tokens: V2WorkFormulaToken[], paramNames?: Record<string, string> | null): V2WorkFormulaToken[];
/** Формула с человекочитаемыми именами параметров (для подробного расчёта). */
export declare function formatWorkFormulaReadableSymbolic(tokens: V2WorkFormulaToken[]): string;
/** Формула с подставленными числами (N и коэффициенты → значения). */
export declare function formatWorkFormulaReadableWithValues(tokens: V2WorkFormulaToken[], ctx: {
    norm: number;
    paramCoefficients: Record<string, number>;
    formData?: Record<string, unknown>;
    resolveFactorCoeff?: (paramCode: string) => number;
    /** Подписи для мульти-арх коэффициентов: `max(0.5, 1)` вместо свёрнутого числа. */
    paramCoefficientValueLabels?: Record<string, string>;
}): string;
/** Краткая запись для блока «Общая формула норматива» (N, Кэф-П1, …). */
export declare function formatWorkFormulaGeneralSummary(tokens: V2WorkFormulaToken[], paramOrder: readonly string[]): string;
export declare function parseWorkFormulaText(text: string): {
    tokens: V2WorkFormulaToken[];
    error: string | null;
};
export type ValidateWorkFormulaTokenOptions = {
    allowedParamCodes?: Set<string>;
    laborParams?: readonly WorkFormulaLaborParamRef[];
    /** Разрешить сохранение формулы с помеченными invalid ссылками на параметры */
    allowInvalidParamRefs?: boolean;
    /** Строгая политика: транзитивная ссылка — единственный элемент */
    strictTransitiveExclusive?: boolean;
};
export declare function validateWorkFormulaTokens(tokens: V2WorkFormulaToken[], options?: Set<string> | ValidateWorkFormulaTokenOptions): string | null;
export declare function isParamUsedInFormula(tokens: V2WorkFormulaToken[], paramCode: string): boolean;
export declare function markFormulaParamInvalid(tokens: V2WorkFormulaToken[], paramCode: string): V2WorkFormulaToken[];
export type WorkFormulaLaborParamKindRef = WorkFormulaLaborParamRef & {
    /** by_value → param_coeff; any_of → param_anyof. */
    kind?: "by_value" | "any_of" | null;
};
/**
 * Убирает «осиротевшие» операторы/скобки после удаления операндов из формулы.
 */
export declare function cleanupWorkFormulaTokensAfterOperandRemoval(tokens: V2WorkFormulaToken[]): V2WorkFormulaToken[];
/**
 * Удаляет из формулы param-токены, которых нет в трудоёмкости
 * или чей kind (param_coeff / param_anyof) не совпадает с типом параметра.
 */
export declare function removeIncompatibleLaborKindFormulaTokens(tokens: V2WorkFormulaToken[], laborParams: readonly WorkFormulaLaborParamKindRef[]): V2WorkFormulaToken[];
/** Помечает param-токены формулы invalid, если их нет в блоке трудоёмкости. */
export declare function markUnknownFormulaLaborParamTokensInvalid(tokens: V2WorkFormulaToken[], laborParams: readonly WorkFormulaLaborParamRef[]): V2WorkFormulaToken[];
export declare function evaluateWorkFormula(formula: V2TypicalWorkFormulaDto, ctx: WorkFormulaEvalContext): WorkFormulaEvalResult;
/** Трудозатраты (ч/д) не могут быть отрицательными. */
export declare function clampTypicalWorkEffort(value: number): number;
/** Округление без ограничения снизу — для валидации формулы перед сохранением. */
export declare function roundWorkEffortValue(value: number, rounding: V2TypicalWorkRoundingDto): number;
/**
 * Excel `ОКРУГЛ.*(x; n)` для модельного стрима ошибочно сохраняли как
 * абсолютный шаг `n` (`; 2` → шаг 2 вместо округления до 2 знаков = 0.01).
 * `1` не трогаем — валидный шаг в целых человеко-днях.
 */
export declare function normalizeWorkRoundingStep(step: number | null | undefined): number;
export declare function applyWorkRounding(value: number, rounding: V2TypicalWorkRoundingDto): number;
export declare function previewWorkFormula(formula: V2TypicalWorkFormulaDto, rounding: V2TypicalWorkRoundingDto, ctx: WorkFormulaEvalContext): WorkFormulaEvalResult;
