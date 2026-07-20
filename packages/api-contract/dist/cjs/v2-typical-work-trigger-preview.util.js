"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.canEvaluateTypicalWorkTriggerPreview = canEvaluateTypicalWorkTriggerPreview;
exports.evaluateTypicalWorkTriggerPreview = evaluateTypicalWorkTriggerPreview;
const v2_trigger_formula_util_1 = require("./v2-trigger-formula.util");
const v2_works_catalog_match_util_1 = require("./v2-works-catalog-match.util");
const v2_typical_works_util_1 = require("./v2-typical-works.util");
function canEvaluateTypicalWorkTriggerPreview(draftSource, previewFormData, matchContext) {
    if (draftSource &&
        Object.keys(draftSource).length > 0 &&
        (0, v2_typical_works_util_1.hasTypicalWorkStreamTriggerContext)(draftSource)) {
        return true;
    }
    return (0, v2_typical_works_util_1.hasTypicalWorkPreviewFormContext)(previewFormData, matchContext?.uiSchema);
}
function buildTriggerMatchInput(input) {
    const normalized = (0, v2_works_catalog_match_util_1.normalizeTypicalWorkTriggerRulesForMatch)(input.rules);
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
function evaluateTypicalWorkTriggerPreview(input) {
    const triggerInput = buildTriggerMatchInput(input);
    const conditionsSummary = (0, v2_trigger_formula_util_1.describeTypicalWorkTriggerConditions)({
        mode: input.mode,
        rules: triggerInput.rules,
        triggerFormula: input.triggerFormula,
        triggerArchCount: input.triggerArchCount,
    });
    if (!(0, v2_trigger_formula_util_1.hasTypicalWorkTriggersConfigured)(triggerInput)) {
        return { status: "no_triggers", previewState: "none", conditionsSummary: null };
    }
    if (input.mode === "formula") {
        const formulaError = (0, v2_trigger_formula_util_1.validateTriggerFormulaTokens)(input.triggerFormula?.tokens ?? []);
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
    const match = (0, v2_trigger_formula_util_1.matchTypicalWorkTriggers)(triggerInput, input.draftSource ?? {}, input.previewFormData, {
        ...input.matchContext,
        schemaParams: input.matchContext?.schemaParams,
    });
    return {
        status: match ? "appears" : "hidden",
        previewState: match ? "matched" : "unmatched",
        conditionsSummary,
    };
}
