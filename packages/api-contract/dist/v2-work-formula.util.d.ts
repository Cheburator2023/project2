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
export declare function tokensToText(tokens: V2WorkFormulaToken[]): string;
export declare function parseWorkFormulaText(text: string): {
    tokens: V2WorkFormulaToken[];
    error: string | null;
};
export declare function validateWorkFormulaTokens(tokens: V2WorkFormulaToken[], allowedParamCodes?: Set<string>): string | null;
export declare function evaluateWorkFormula(formula: V2TypicalWorkFormulaDto, ctx: WorkFormulaEvalContext): WorkFormulaEvalResult;
export declare function applyWorkRounding(value: number, rounding: V2TypicalWorkRoundingDto): number;
export declare function previewWorkFormula(formula: V2TypicalWorkFormulaDto, rounding: V2TypicalWorkRoundingDto, ctx: WorkFormulaEvalContext): WorkFormulaEvalResult;
