import type { V2TypicalWorkNormInputDto, V2TypicalWorkRoundingDto, V2WorkFormulaToken } from "./v2-typical-work.types";
export type ValidationIssue = {
    path: string;
    message: string;
};
export declare function validateNormInputs(norms: V2TypicalWorkNormInputDto[], streamExecutor: string): ValidationIssue[];
export declare function validateRoundingInput(rounding: V2TypicalWorkRoundingDto): ValidationIssue[];
export declare function validateCoefficientValue(value: number, path: string): ValidationIssue[];
export declare function validateWorkName(name: string): ValidationIssue[];
export declare function collectAllowedParamCodes(laborInputs: Array<{
    paramCode: string;
}>): Set<string>;
export declare function validateFormulaAgainstParams(tokens: V2WorkFormulaToken[], allowedParamCodes: Set<string>): ValidationIssue[];
