import { createDefaultOverallUncertaintyConfig, parseOverallUncertaintyConfigFromLogic, } from "./v2-overall-uncertainty-config.util";
function isPlainRecord(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function readRecord(value) {
    return isPlainRecord(value) ? value : undefined;
}
function parseAdjPct(value) {
    if (value == null || value === "")
        return null;
    const parsed = Number(String(value).replace(",", ".").replace("%", "").trim());
    if (!Number.isFinite(parsed))
        return null;
    return Math.min(30, Math.max(0, parsed));
}
function indexOfLabel(labels, value) {
    const trimmed = value.trim();
    if (!trimmed)
        return -1;
    return labels.findIndex((label) => label === trimmed);
}
export function parseUncertaintyRiskFormEntry(value) {
    if (value == null || value === "")
        return null;
    if (typeof value === "string") {
        const trimmed = value.trim();
        return trimmed ? trimmed : null;
    }
    if (!isPlainRecord(value))
        return null;
    const probability = typeof value.probability === "string" ? value.probability.trim() : "";
    const goals = typeof value.goals === "string" ? value.goals.trim() : "";
    if (!probability && !goals)
        return null;
    return { probability, goals };
}
export function isStructuredUncertaintyRiskEntry(value) {
    const parsed = parseUncertaintyRiskFormEntry(value);
    return Boolean(parsed && typeof parsed === "object");
}
export function riskGroupHasStructuredEntries(riskGroup) {
    if (!riskGroup)
        return false;
    return Object.values(riskGroup).some((value) => isStructuredUncertaintyRiskEntry(value));
}
/** Legacy: строка = имя группы («Низкий» / …). */
export function isLegacyUncertaintyGroupName(value, config) {
    return config.groups.some((group) => group.name === value.trim());
}
/**
 * Собирает preview-состояние методики из formData.uncertaintyCalculation.
 * Structured risk = { probability, goals }; legacy string goals/group handled separately.
 */
export function mapFormDataToOverallUncertaintyPreview(formData, config) {
    const uncertainty = readRecord(formData.uncertaintyCalculation);
    const riskGroup = readRecord(uncertainty?.riskGroup);
    const timelineLabel = typeof uncertainty?.initiativeTimeline === "string"
        ? uncertainty.initiativeTimeline.trim()
        : "";
    const costLabel = typeof uncertainty?.initiativeCost === "string"
        ? uncertainty.initiativeCost.trim()
        : "";
    const adjPct = parseAdjPct(uncertainty?.uncertaintyAdjustment ?? uncertainty?.field_QCwwo5c5);
    const timelineIdx = Math.max(0, indexOfLabel(config.severityLevels.map((level) => level.timelineLabel), timelineLabel));
    const costIdx = Math.max(0, indexOfLabel(config.severityLevels.map((level) => level.costLabel), costLabel));
    const goalsLabels = config.severityLevels.map((level) => level.goalsLabel);
    const probLabels = config.probabilityLevels.map((level) => level.label);
    const risks = config.risks.map((risk) => {
        const raw = riskGroup?.[risk.id];
        const parsed = parseUncertaintyRiskFormEntry(raw);
        if (!parsed || typeof parsed === "string") {
            // Legacy string as goals label (schema sync) → goals only, lowest prob.
            if (typeof parsed === "string") {
                const goalsIdx = indexOfLabel(goalsLabels, parsed);
                if (goalsIdx >= 0) {
                    return {
                        id: risk.id,
                        enabled: true,
                        probIdx: 0,
                        goalsIdx,
                    };
                }
            }
            return {
                id: risk.id,
                enabled: false,
                probIdx: 0,
                goalsIdx: 0,
            };
        }
        const probIdx = Math.max(0, indexOfLabel(probLabels, parsed.probability ?? ""));
        const goalsIdx = Math.max(0, indexOfLabel(goalsLabels, parsed.goals ?? ""));
        const enabled = Boolean(parsed.probability?.trim() && parsed.goals?.trim());
        return { id: risk.id, enabled, probIdx, goalsIdx };
    });
    // Include catalog risks missing from config.risks but present in formData.
    if (riskGroup) {
        for (const [id, raw] of Object.entries(riskGroup)) {
            if (risks.some((risk) => risk.id === id))
                continue;
            const parsed = parseUncertaintyRiskFormEntry(raw);
            if (!parsed || typeof parsed === "string")
                continue;
            if (!parsed.probability?.trim() || !parsed.goals?.trim())
                continue;
            risks.push({
                id,
                enabled: true,
                probIdx: Math.max(0, indexOfLabel(probLabels, parsed.probability)),
                goalsIdx: Math.max(0, indexOfLabel(goalsLabels, parsed.goals)),
            });
        }
    }
    const hasRisks = risks.some((risk) => risk.enabled);
    const enabled = Boolean(timelineLabel) ||
        Boolean(costLabel) ||
        hasRisks ||
        adjPct != null;
    return {
        enabled,
        timelineIdx,
        costIdx,
        adjPct,
        risks,
    };
}
export function resolveOverallUncertaintyConfig(options) {
    if (options?.config)
        return options.config;
    if (options?.logicRules) {
        return parseOverallUncertaintyConfigFromLogic(options.logicRules);
    }
    return createDefaultOverallUncertaintyConfig();
}
/**
 * Legacy path: Σ group increments + adjustment%/100 (старые анкеты с «Низкий»/…).
 */
export function resolveLegacyUncertaintyCoefficientFromRiskGroupNames(formData, config) {
    const uncertainty = readRecord(formData.uncertaintyCalculation);
    const riskGroup = readRecord(uncertainty?.riskGroup);
    if (!riskGroup || riskGroupHasStructuredEntries(riskGroup))
        return null;
    const entries = Object.values(riskGroup)
        .map((value) => (typeof value === "string" ? value.trim() : ""))
        .filter(Boolean);
    if (entries.length === 0)
        return null;
    if (!entries.every((value) => isLegacyUncertaintyGroupName(value, config))) {
        return null;
    }
    const adjPct = parseAdjPct(uncertainty?.uncertaintyAdjustment ?? uncertainty?.field_QCwwo5c5);
    const groupByName = new Map(config.groups.map((group) => [group.name, group.coef]));
    const riskSum = entries.reduce((sum, name) => sum + (groupByName.get(name) ?? 0), 0);
    const coefficient = Math.round((1 + riskSum + (adjPct ?? 0) / 100) * 100) / 100;
    return { calculated: true, coefficient };
}
