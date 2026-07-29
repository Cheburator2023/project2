import type { V2JsonLogicValue } from "./v2-template.types";
import type { V2TriggerFormulaToken, V2TypicalWorkRuleValueDto, V2TypicalWorkTriggerFormulaDto, V2TypicalWorkTriggerMode, V2WorkRuleOperator } from "./v2-typical-work.types";
import type { TypicalWorkRuleLike, TypicalWorkTriggerArchCountLike } from "./v2-works-catalog-match.util";
import { type TypicalWorkTriggerMatchContext } from "./v2-typical-works.util";
export declare function triggerParamTokenToRule(token: Extract<V2TriggerFormulaToken, {
    kind: "param";
}>): TypicalWorkRuleLike;
export declare function describeTriggerFormulaToken(token: V2TriggerFormulaToken): string;
export declare function triggerFormulaTokensToText(tokens: readonly V2TriggerFormulaToken[]): string;
/** Человекочитаемое описание одного param-условия (simple mode). */
export declare function describeTypicalWorkSimpleTriggerRule(rule: TypicalWorkRuleLike): string;
/** Формула условий появления работы для UI (simple или formula mode). */
export declare function describeTypicalWorkTriggerConditions(input: {
    mode?: V2TypicalWorkTriggerMode;
    rules: TypicalWorkRuleLike[];
    triggerFormula?: V2TypicalWorkTriggerFormulaDto | null;
    triggerArchCount?: TypicalWorkTriggerArchCountLike | null;
}): string | null;
export declare function validateTriggerFormulaTokens(tokens: readonly V2TriggerFormulaToken[]): string | null;
/** Компилирует формулу триггеров в JsonLogic (И/ИЛИ, скобки). */
export declare function compileTriggerFormulaTokensToJsonLogic(tokens: readonly V2TriggerFormulaToken[]): V2JsonLogicValue;
export type TriggerFormulaEvalContext = {
    source: Record<string, unknown>;
    formData?: Record<string, unknown>;
};
/** Вычисляет формулу триггеров (И/ИЛИ, скобки). Пустая → false. */
export declare function evaluateTriggerFormula(tokens: readonly V2TriggerFormulaToken[], ctx: TriggerFormulaEvalContext): boolean;
export declare function isTriggerFormulaConfigured(formula: V2TypicalWorkTriggerFormulaDto | null | undefined): boolean;
export declare function createDefaultTriggerParamToken(input: {
    paramCode: string;
    paramName: string;
    schemaFieldUid?: string | null;
    operator?: V2WorkRuleOperator;
    valueCode?: string | null;
    valueLabel?: string | null;
    values?: V2TypicalWorkRuleValueDto[];
}): V2TriggerFormulaToken;
export type TypicalWorkTriggerMatchInput = {
    mode?: V2TypicalWorkTriggerMode;
    rules: TypicalWorkRuleLike[];
    triggerArchCount?: TypicalWorkTriggerArchCountLike | null;
    triggerFormula?: V2TypicalWorkTriggerFormulaDto | null;
};
export declare function matchTypicalWorkTriggers(input: TypicalWorkTriggerMatchInput, source: Record<string, unknown>, formData?: Record<string, unknown>, matchContext?: TypicalWorkTriggerMatchContext): boolean;
export declare function hasTypicalWorkTriggersConfigured(input: TypicalWorkTriggerMatchInput): boolean;
