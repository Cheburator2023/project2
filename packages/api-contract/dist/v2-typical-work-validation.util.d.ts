import type { PatchV2TypicalWorkRequestDto, V2TypicalWorkNormInputDto, V2TypicalWorkRoundingDto, V2WorkFormulaToken, V2WorkTriggerStatus } from "./v2-typical-work.types";
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
export type WorkTriggerStatusRuleInput = {
    paramCode: string;
    paramName?: string | null;
    operator?: string;
    valueCode: string | null;
    valueLabel: string | null;
    values?: Array<{
        code: string;
        label: string | null;
    }>;
};
export type WorkTriggerStatusCatalogParam = {
    code: string;
    values: Array<{
        code: string;
        label: string;
        validFrom?: string | null;
        validTo?: string | null;
    }>;
};
export declare function isTypicalWorkParameterValueActiveOnDate(value: {
    validFrom?: string | null;
    validTo?: string | null;
}, atDate: string): boolean;
export declare function filterTypicalWorkParameterValuesActiveOnDate<T extends {
    validFrom?: string | null;
    validTo?: string | null;
}>(values: T[], atDate: string): T[];
/** F-03/v4: статус триггеров с учётом каталога и (опционально) черновика ответов. */
export declare function computeWorkTriggerStatus(rules: WorkTriggerStatusRuleInput[], catalog?: WorkTriggerStatusCatalogParam[], atDate?: string, draftSource?: Record<string, unknown>): V2WorkTriggerStatus;
export declare function isWorkTriggerGroupInvalid(paramCode: string, rules: WorkTriggerStatusRuleInput[], catalog: WorkTriggerStatusCatalogParam[], atDate?: string): boolean;
export type WorkCoefficientRowInput = {
    paramCode: string;
    valueCode: string | null;
    valueLabel: string | null;
};
/**
 * F-03 §578: значение коэффициента трудоёмкости доступно, только если оно
 * присутствует в активном глобальном справочнике значений параметра. Если
 * значение удалено — коэффициент исключается из расчёта и помечается в UI
 * меткой «Значение недоступно» (сохранение не блокируется).
 *
 * Строки-флаги без значения (valueCode/valueLabel = null) задают «параметр
 * присутствует» и не ссылаются на словарь — они всегда доступны.
 */
export declare function isWorkCoefficientValueAvailable(row: WorkCoefficientRowInput, catalog: WorkTriggerStatusCatalogParam[], atDate?: string): boolean;
