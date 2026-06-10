import type { V2LogicRuleDto } from "./v2-template.types";
/** JSON Pointer `/a/b` → `a.b` для `{"var": "a.b"}` в JsonLogic. */
export declare function v2JsonPointerToVarPath(pointer: string): string;
/**
 * Правило visibility: целевое поле видно, когда булево поле-источник равно `whenChecked`.
 * Универсальный шаблон для чекбоксов и любых boolean-полей.
 */
export declare function buildBooleanVisibilityRule(params: {
    id: string;
    targetPointer: string;
    sourcePointer: string;
    /** Показывать цель, когда источник = true (по умолчанию). false — показ при выключенном чекбоксе. */
    whenChecked?: boolean;
    description?: string;
}): V2LogicRuleDto;
