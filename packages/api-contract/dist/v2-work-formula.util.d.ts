import type { V2TypicalWorkFormulaDto, V2TypicalWorkRoundingDto, V2WorkFormulaToken } from "./v2-typical-work.types";
export type WorkFormulaEvalContext = {
    norm: number;
    paramCoefficients: Record<string, number>;
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
export declare function tokensToText(tokens: V2WorkFormulaToken[]): string;
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
/** Помечает param-токены формулы invalid, если их нет в блоке трудоёмкости. */
export declare function markUnknownFormulaLaborParamTokensInvalid(tokens: V2WorkFormulaToken[], laborParams: readonly WorkFormulaLaborParamRef[]): V2WorkFormulaToken[];
export declare function evaluateWorkFormula(formula: V2TypicalWorkFormulaDto, ctx: WorkFormulaEvalContext): WorkFormulaEvalResult;
/** Трудозатраты (ч/д) не могут быть отрицательными. */
export declare function clampTypicalWorkEffort(value: number): number;
/** Округление без ограничения снизу — для валидации формулы перед сохранением. */
export declare function roundWorkEffortValue(value: number, rounding: V2TypicalWorkRoundingDto): number;
export declare function applyWorkRounding(value: number, rounding: V2TypicalWorkRoundingDto): number;
export declare function previewWorkFormula(formula: V2TypicalWorkFormulaDto, rounding: V2TypicalWorkRoundingDto, ctx: WorkFormulaEvalContext): WorkFormulaEvalResult;
