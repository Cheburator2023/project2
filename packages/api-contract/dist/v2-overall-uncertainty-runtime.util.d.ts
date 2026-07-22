import { type V2OverallUncertaintyConfig, type V2OverallUncertaintyPreviewState } from "./v2-overall-uncertainty-config.util";
import type { V2LogicRuleDto } from "./v2-template.types";
/** Запись риска в formData: новая форма или legacy-строка. */
export type V2UncertaintyRiskFormEntry = {
    probability?: string;
    goals?: string;
};
export declare function parseUncertaintyRiskFormEntry(value: unknown): V2UncertaintyRiskFormEntry | string | null;
export declare function isStructuredUncertaintyRiskEntry(value: unknown): value is V2UncertaintyRiskFormEntry;
export declare function riskGroupHasStructuredEntries(riskGroup: Record<string, unknown> | undefined): boolean;
/** Legacy: строка = имя группы («Низкий» / …). */
export declare function isLegacyUncertaintyGroupName(value: string, config: V2OverallUncertaintyConfig): boolean;
/**
 * Собирает preview-состояние методики из formData.uncertaintyCalculation.
 * Structured risk = { probability, goals }; legacy string goals/group handled separately.
 */
export declare function mapFormDataToOverallUncertaintyPreview(formData: Record<string, unknown>, config: V2OverallUncertaintyConfig): V2OverallUncertaintyPreviewState;
export type ResolveOverallUncertaintyOptions = {
    config?: V2OverallUncertaintyConfig;
    logicRules?: readonly V2LogicRuleDto[];
};
export declare function resolveOverallUncertaintyConfig(options?: ResolveOverallUncertaintyOptions): V2OverallUncertaintyConfig;
/**
 * Legacy path: Σ group increments + adjustment%/100 (старые анкеты с «Низкий»/…).
 */
export declare function resolveLegacyUncertaintyCoefficientFromRiskGroupNames(formData: Record<string, unknown>, config: V2OverallUncertaintyConfig): {
    calculated: boolean;
    coefficient: number;
} | null;
