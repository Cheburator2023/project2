/**
 * SA_LOGIC v4: terms-формула и расширенные enum-ы (операторы/статусы — в v2-typical-work.types).
 */
export declare const V2_WORK_RULE_OPERATOR_V4_VALUES: readonly ["=", "!=", ">=", "<=", ">", "<", "in", "not_in"];
export type V2WorkRuleOperatorV4 = (typeof V2_WORK_RULE_OPERATOR_V4_VALUES)[number];
export declare const V2_WORK_TRIGGER_STATUS_V4_VALUES: readonly ["appears", "hidden", "no_triggers", "invalid"];
export type V2WorkTriggerStatusV4 = (typeof V2_WORK_TRIGGER_STATUS_V4_VALUES)[number];
export declare const V2_LABOR_PARAM_KIND_VALUES: readonly ["by_value", "any_of"];
export type V2LaborParamKind = (typeof V2_LABOR_PARAM_KIND_VALUES)[number];
export declare const V2_WORK_FORMULA_TERM_KIND_VALUES: readonly ["base_norm", "multiplier", "additive", "transitive"];
export type V2WorkFormulaTermKind = (typeof V2_WORK_FORMULA_TERM_KIND_VALUES)[number];
export type V2WorkFormulaFactorDto = {
    id: string;
    paramCode: string;
    paramName?: string | null;
    order: number;
};
export type V2WorkFormulaTermDto = {
    id: string;
    kind: V2WorkFormulaTermKind;
    title: string;
    order: number;
    baseValue?: number;
    sourceAssignmentId?: string | null;
    sourceWorkId?: string | null;
    sourceWorkName?: string | null;
    factors: V2WorkFormulaFactorDto[];
};
export type V2TypicalWorkFormulaTermsDto = {
    version: 2;
    terms: V2WorkFormulaTermDto[];
    text: string;
};
