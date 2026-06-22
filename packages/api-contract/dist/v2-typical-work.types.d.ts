/**
 * F-03: глобальный справочник типовых работ (вариант A — отдельные таблицы БД).
 * Нормы, условия и коэффициенты — разрез (работа × стрим-исполнитель).
 * Формула и округление — конфигурация версии шаблона.
 */
export declare const V2_WORK_RULE_OPERATOR_VALUES: readonly ["=", "!=", ">=", "<=", ">", "<"];
export type V2WorkRuleOperator = (typeof V2_WORK_RULE_OPERATOR_VALUES)[number];
export declare const V2_WORK_ROUNDING_MODE_VALUES: readonly ["CEIL", "FLOOR", "ROUND", "NONE"];
export type V2WorkRoundingMode = (typeof V2_WORK_ROUNDING_MODE_VALUES)[number];
export declare const V2_WORK_TRIGGER_STATUS_VALUES: readonly ["appears", "no_triggers", "invalid"];
export type V2WorkTriggerStatus = (typeof V2_WORK_TRIGGER_STATUS_VALUES)[number];
export declare const V2_LOGIC_WORKSPACE_TAB_VALUES: readonly ["works", "dependencies", "jsonlogic"];
export type V2LogicWorkspaceTab = (typeof V2_LOGIC_WORKSPACE_TAB_VALUES)[number];
export type V2WorkFormulaOperatorToken = "+" | "-" | "*" | "/";
export type V2WorkFormulaToken = {
    kind: "norm";
} | {
    kind: "param_coeff";
    paramCode: string;
    paramName?: string;
} | {
    kind: "number";
    value: number;
} | {
    kind: "operator";
    op: V2WorkFormulaOperatorToken;
} | {
    kind: "paren_open";
} | {
    kind: "paren_close";
};
export type V2TypicalWorkNormDto = {
    id: string;
    streamExecutor: string;
    normValue: number;
    validFrom: string;
    validTo: string | null;
};
export type V2TypicalWorkRuleDto = {
    id: string;
    streamExecutor: string;
    paramCode: string;
    paramName: string | null;
    operator: V2WorkRuleOperator;
    valueCode: string | null;
    valueLabel: string | null;
};
export type V2TypicalWorkLaborCoefficientDto = {
    id: string;
    streamExecutor: string;
    paramCode: string;
    paramName: string | null;
    valueCode: string | null;
    valueLabel: string | null;
    coefficient: number;
};
export type V2TypicalWorkLaborParamGroupDto = {
    paramCode: string;
    paramName: string | null;
    coefficients: V2TypicalWorkLaborCoefficientDto[];
};
export type V2TypicalWorkFormulaDto = {
    tokens: V2WorkFormulaToken[];
    text: string;
};
export type V2TypicalWorkRoundingDto = {
    mode: V2WorkRoundingMode;
    step: number | null;
};
export type V2TypicalWorkListItemDto = {
    id: string;
    name: string;
    archComponentType: string;
    workType: string | null;
    triggerStatus: V2WorkTriggerStatus;
    currentNorm: number | null;
    streams: string[];
    /** Действующая норма на сегодня по каждому назначенному стриму (ключ — streamExecutor в БД). */
    normsByStream?: Record<string, number | null>;
    /** Число параметров трудоёмкости по стриму (ключ — streamExecutor в БД). */
    laborParamCountByStream?: Record<string, number>;
};
export type V2TypicalWorkListResponseDto = {
    total: number;
    items: V2TypicalWorkListItemDto[];
    archComponentTypes: string[];
};
export type V2TypicalWorkCardDto = {
    id: string;
    name: string;
    archComponentType: string;
    workType: string | null;
    streamExecutor: string;
    triggerStatus: V2WorkTriggerStatus;
    norms: V2TypicalWorkNormDto[];
    rules: V2TypicalWorkRuleDto[];
    laborParams: V2TypicalWorkLaborParamGroupDto[];
    formula: V2TypicalWorkFormulaDto;
    rounding: V2TypicalWorkRoundingDto;
};
export type V2TypicalWorkPreviewRequestDto = {
    streamExecutor: string;
    atDate?: string;
    answers?: Record<string, string>;
};
export type V2TypicalWorkPreviewResponseDto = {
    formulaSymbolic: string;
    formulaExpanded: string;
    result: number | null;
    error: string | null;
};
export type V2TypicalWorkNormInputDto = {
    id?: string;
    normValue: number;
    validFrom: string;
    validTo?: string | null;
};
export type V2TypicalWorkRuleInputDto = {
    id?: string;
    paramCode: string;
    paramName?: string | null;
    operator: V2WorkRuleOperator;
    valueCode?: string | null;
    valueLabel?: string | null;
};
export type V2TypicalWorkLaborCoefficientInputDto = {
    id?: string;
    paramCode: string;
    paramName?: string | null;
    valueCode?: string | null;
    valueLabel?: string | null;
    coefficient: number;
};
export type PatchV2TypicalWorkRequestDto = {
    streamExecutor: string;
    templateVersionId?: string;
    name?: string;
    archComponentType?: string;
    norms?: V2TypicalWorkNormInputDto[];
    rules?: V2TypicalWorkRuleInputDto[];
    laborCoefficients?: V2TypicalWorkLaborCoefficientInputDto[];
    formula?: V2TypicalWorkFormulaDto;
    rounding?: V2TypicalWorkRoundingDto;
};
export type CreateV2TypicalWorkRequestDto = {
    name: string;
    archComponentType: string;
    workType?: string | null;
};
export type V2TypicalWorkFieldErrorDto = {
    path: string;
    message: string;
};
export type V2TypicalWorkQuestionnaireUsageDto = {
    questionnaireId: string;
    calcName: string;
    version: string;
};
export type V2DeleteTypicalWorkConflictDto = {
    code: "WORK_IN_USE";
    usedInQuestionnaireVersions: V2TypicalWorkQuestionnaireUsageDto[];
};
export type V2TypicalWorkParameterValueDto = {
    code: string;
    label: string;
    coefficient: number | null;
};
export type V2TypicalWorkParameterDto = {
    code: string;
    name: string;
    description: string | null;
    values: V2TypicalWorkParameterValueDto[];
};
export type V2TypicalWorkParameterListResponseDto = {
    items: V2TypicalWorkParameterDto[];
};
export type V2ParameterDependencyDto = {
    paramCode: string;
    paramName: string;
    dependsOnParamCode: string | null;
    dependsOnParamName: string | null;
    description: string | null;
};
export type V2ParameterDependencyListResponseDto = {
    items: V2ParameterDependencyDto[];
};
/** Норма, действующая на дату (для дерева и превью). */
export declare function resolveActiveNormOnDate(norms: Pick<V2TypicalWorkNormDto, "streamExecutor" | "normValue" | "validFrom" | "validTo">[], streamExecutor: string, atDate: string): number | null;
export declare function defaultWorkFormula(): V2TypicalWorkFormulaDto;
export declare function defaultWorkRounding(): V2TypicalWorkRoundingDto;
