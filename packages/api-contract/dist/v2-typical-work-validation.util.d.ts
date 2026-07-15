import type { PatchV2TypicalWorkRequestDto, V2TypicalWorkNormInputDto, V2TypicalWorkRoundingDto, V2WorkFormulaToken, V2WorkTriggerStatus } from "./v2-typical-work.types";
import { type WorkFormulaLaborParamRef } from "./v2-work-formula.util";
import type { WorkSchemaParamDef } from "./v2-work-schema-params-match.util";
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
export declare function laborParamRefsFromPatchGroups(laborParams: Array<{
    paramCode: string;
    paramName?: string | null;
}>): WorkFormulaLaborParamRef[];
export declare function validateFormulaAgainstLaborParams(tokens: V2WorkFormulaToken[], laborParams: WorkFormulaLaborParamRef[]): ValidationIssue[];
/** Проверяет, что при действующей норме формула не даёт отрицательный итог (после округления). */
export declare function validateFormulaNonNegativeEffort(params: {
    formula?: PatchV2TypicalWorkRequestDto["formula"];
    formulaTerms?: PatchV2TypicalWorkRequestDto["formulaTerms"];
    rounding?: V2TypicalWorkRoundingDto;
    norms: V2TypicalWorkNormInputDto[];
    laborParams?: PatchV2TypicalWorkRequestDto["laborParams"];
    coverageDate: string;
}): ValidationIssue[];
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
export type WorkCoefficientCatalogParam = WorkTriggerStatusCatalogParam & {
    sourceKeys?: string[];
};
export declare function resolveWorkCoefficientCatalogParam(catalog: WorkCoefficientCatalogParam[], paramCode: string): WorkCoefficientCatalogParam | undefined;
/** Параметр трудоёмкости из поля схемы анкеты (`field_*`), не из глобального CSV. */
export declare function isSchemaFieldLaborParamCode(paramCode: string): boolean;
/**
 * F-03 §578: значение коэффициента трудоёмкости доступно, только если оно
 * присутствует в активном глобальном справочнике значений параметра. Если
 * значение удалено — коэффициент исключается из расчёта и помечается в UI
 * меткой «Значение недоступно» (сохранение не блокируется).
 *
 * Строки-флаги без значения (valueCode/valueLabel = null) задают «параметр
 * присутствует» и не ссылаются на словарь — они всегда доступны.
 */
export declare function isWorkCoefficientValueAvailable(row: WorkCoefficientRowInput, catalog: WorkCoefficientCatalogParam[], atDate?: string): boolean;
export type WorkCoefficientCatalogSourceParam = {
    code: string;
    name?: string;
    sourceKeys?: string[];
    values: Array<{
        code: string;
        label: string;
    }>;
};
export declare function isWorkSchemaLaborParamCandidate(param: Pick<WorkSchemaParamDef, "values">): boolean;
/** Каталог коэффициентов как в TypicalWorkEditableCard.coefficientCatalog. */
export declare function buildWorkCoefficientCatalog(input: {
    schemaParams: WorkSchemaParamDef[];
    laborParams: Array<{
        paramCode: string;
        paramName?: string | null;
    }>;
    methodologyCatalog?: WorkCoefficientCatalogSourceParam[];
}): WorkCoefficientCatalogParam[];
export type UnavailableLaborCoefficientIssue = {
    kind: "labor_value";
    paramCode: string;
    paramName?: string | null;
    message: string;
};
export declare function collectUnavailableLaborCoefficientIssues(input: {
    laborParams: Array<{
        paramCode: string;
        paramName?: string | null;
        kind?: string | null;
        coefficients?: Array<{
            valueCode: string | null;
            valueLabel: string | null;
        }>;
    }>;
    schemaParams: WorkSchemaParamDef[];
    methodologyCatalog?: WorkCoefficientCatalogSourceParam[];
    atDate?: string;
}): UnavailableLaborCoefficientIssue[];
