import { describeTypicalWorkTriggerConditions, hasTypicalWorkTriggersConfigured, matchTypicalWorkTriggers, validateTriggerFormulaTokens, } from "./v2-trigger-formula.util";
import { normalizeTypicalWorkTriggerRulesForMatch } from "./v2-works-catalog-match.util";
import { hasTypicalWorkPreviewFormContext, hasTypicalWorkStreamTriggerContext, } from "./v2-typical-works.util";
export function canEvaluateTypicalWorkTriggerPreview(draftSource, previewFormData, matchContext) {
    if (draftSource &&
        Object.keys(draftSource).length > 0 &&
        hasTypicalWorkStreamTriggerContext(draftSource)) {
        return true;
    }
    return hasTypicalWorkPreviewFormContext(previewFormData, matchContext?.uiSchema);
}
function buildTriggerMatchInput(input) {
    const normalized = normalizeTypicalWorkTriggerRulesForMatch(input.rules);
    const rules = normalized.map((rule) => input.mapRule ? input.mapRule(rule) : rule);
    return {
        mode: input.mode ?? "simple",
        rules,
        triggerArchCount: input.triggerArchCount,
        triggerFormula: input.triggerFormula,
    };
}
/**
 * Единая точка проверки триггеров для конструктора и рантайма UI.
 * «hidden» — только когда превью есть, но условия не выполнены.
 * Настроенные и валидные условия без превью → appears + previewState none.
 */
export function evaluateTypicalWorkTriggerPreview(input) {
    const triggerInput = buildTriggerMatchInput(input);
    const conditionsSummary = describeTypicalWorkTriggerConditions({
        mode: input.mode,
        rules: triggerInput.rules,
        triggerFormula: input.triggerFormula,
        triggerArchCount: input.triggerArchCount,
    });
    if (!hasTypicalWorkTriggersConfigured(triggerInput)) {
        return { status: "no_triggers", previewState: "none", conditionsSummary: null };
    }
    if (input.mode === "formula") {
        const formulaError = validateTriggerFormulaTokens(input.triggerFormula?.tokens ?? []);
        if (formulaError) {
            return {
                status: "invalid",
                previewState: "none",
                conditionsSummary,
            };
        }
    }
    if (!canEvaluateTypicalWorkTriggerPreview(input.draftSource, input.previewFormData, input.matchContext)) {
        return {
            status: "appears",
            previewState: "none",
            conditionsSummary,
        };
    }
    const match = matchTypicalWorkTriggers(triggerInput, input.draftSource ?? {}, input.previewFormData, {
        ...input.matchContext,
        schemaParams: input.matchContext?.schemaParams,
    });
    return {
        status: match ? "appears" : "hidden",
        previewState: match ? "matched" : "unmatched",
        conditionsSummary,
    };
}
