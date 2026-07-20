import type { V2TypicalWorkTriggerArchCountDto, V2TypicalWorkTriggerFormulaDto, V2TypicalWorkTriggerMode, V2WorkTriggerStatus } from "./v2-typical-work.types";
import type { TypicalWorkRuleLike } from "./v2-works-catalog-match.util";
import { type TypicalWorkTriggerMatchContext } from "./v2-typical-works.util";
export type TriggerPreviewState = "none" | "matched" | "unmatched";
export type TypicalWorkTriggerPreviewInput = {
    mode?: V2TypicalWorkTriggerMode;
    rules: TypicalWorkRuleLike[];
    triggerArchCount?: V2TypicalWorkTriggerArchCountDto | null;
    triggerFormula?: V2TypicalWorkTriggerFormulaDto | null;
    draftSource?: Record<string, unknown>;
    previewFormData?: Record<string, unknown>;
    matchContext?: TypicalWorkTriggerMatchContext;
    /** Перепривязка paramCode/name (поля схемы, алиасы CSV). */
    mapRule?: (rule: TypicalWorkRuleLike) => TypicalWorkRuleLike;
};
export type TypicalWorkTriggerPreviewResult = {
    /** Статус конфигурации + опционально превью (hidden только при previewState=unmatched). */
    status: V2WorkTriggerStatus;
    previewState: TriggerPreviewState;
    conditionsSummary: string | null;
};
export declare function canEvaluateTypicalWorkTriggerPreview(draftSource: Record<string, unknown> | undefined, previewFormData: Record<string, unknown> | undefined, matchContext?: TypicalWorkTriggerMatchContext): boolean;
/**
 * Единая точка проверки триггеров для конструктора и рантайма UI.
 * «hidden» — только когда превью есть, но условия не выполнены.
 * Настроенные и валидные условия без превью → appears + previewState none.
 */
export declare function evaluateTypicalWorkTriggerPreview(input: TypicalWorkTriggerPreviewInput): TypicalWorkTriggerPreviewResult;
