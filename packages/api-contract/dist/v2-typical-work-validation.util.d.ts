import type { PatchV2TypicalWorkRequestDto, V2TypicalWorkNormInputDto, V2TypicalWorkRoundingDto, V2WorkFormulaToken } from "./v2-typical-work.types";
export type ValidationIssue = {
    path: string;
    message: string;
};
/** Сколько норм действуют на указанную дату (после базовой валидации периодов). */
export declare function countActiveNormsOnDate(norms: V2TypicalWorkNormInputDto[], atDate: string): number;
export type ValidateNormInputsOptions = {
    /** F-03: на дату расчёта должна быть ровно одна действующая норма. */
    coverageDate?: string | null;
};
export declare function validateNormInputs(norms: V2TypicalWorkNormInputDto[], streamExecutor: string, options?: ValidateNormInputsOptions): ValidationIssue[];
export declare function validateRoundingInput(rounding: V2TypicalWorkRoundingDto): ValidationIssue[];
export declare function validateCoefficientValue(value: number, path: string): ValidationIssue[];
export declare function validateWorkName(name: string): ValidationIssue[];
export declare function collectAllowedParamCodes(laborInputs: Array<{
    paramCode: string;
}>): Set<string>;
export declare function validateFormulaAgainstParams(tokens: V2WorkFormulaToken[], allowedParamCodes: Set<string>): ValidationIssue[];
export type CollectPatchValidationOptions = {
    coverageDate?: string;
};
/** Клиентская валидация PATCH типовой работы перед автосохранением. */
export declare function collectTypicalWorkPatchValidationErrors(dto: PatchV2TypicalWorkRequestDto, options?: CollectPatchValidationOptions): ValidationIssue[];
