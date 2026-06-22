import type { V2JsonLogicValue, V2LogicRuleDto } from "./v2-template.types";
export type V2ParamDependencyCondition = {
    id: string;
    sourceParamCode: string;
    operator: "=" | "!=";
    valueCode: string;
    valueLabel: string;
};
export type V2ParamDependencyTarget = {
    targetParamCode: string;
    rules: V2ParamDependencyCondition[];
};
export type V2ParamDependencyGraph = {
    targets: V2ParamDependencyTarget[];
};
export type V2ParamFieldBinding = {
    paramCode: string;
    paramName: string;
    pointers: string[];
};
export declare const V2_PARAM_DEPENDENCY_RULE_ID_PREFIX = "param-dep-";
export declare function isParamDependencyLogicRule(rule: V2LogicRuleDto): boolean;
export declare function parseParamDependencyGraphFromLogic(rules: V2LogicRuleDto[]): V2ParamDependencyGraph;
export declare function buildParamDependencyVisibilityRules(graph: V2ParamDependencyGraph, bindings: V2ParamFieldBinding[]): V2LogicRuleDto[];
export declare function mergeParamDependencyRulesIntoLogic(rules: V2LogicRuleDto[], graph: V2ParamDependencyGraph, bindings: V2ParamFieldBinding[]): V2LogicRuleDto[];
export type V2ParamDefLike = {
    code: string;
    name: string;
};
/** Видимость целевого параметра по правилам И в контексте одной строки/объекта. */
export declare function evaluateParamDependencyRulesForSource(rules: V2ParamDependencyCondition[], source: Record<string, unknown>, paramDefs: V2ParamDefLike[]): boolean;
export declare function resolveHiddenParamCodesForSource(graph: V2ParamDependencyGraph, source: Record<string, unknown>, paramDefs: V2ParamDefLike[]): Set<string>;
/** Ключи полей source-объекта, соответствующие скрытым paramCode. */
export declare function resolveHiddenSourceFieldKeys(hiddenParamCodes: ReadonlySet<string>, paramDefs: V2ParamDefLike[], source: Record<string, unknown>): Set<string>;
/** Исключает множители скрытых полей из JsonLogic `*`-произведения (ФТ-024). */
export declare function filterCoefficientLogicForHiddenFields(logic: V2JsonLogicValue, hiddenSourceFields: ReadonlySet<string>): V2JsonLogicValue;
/** Условие видимости поля внутри строки массива (для per-row preview). */
export declare function buildPerRowItemVisibilityCondition(rules: V2ParamDependencyCondition[], sourcePointers: string[], targetPointer: string): V2JsonLogicValue;
