import type { V2LogicRuleDto } from "./v2-template.types";
export declare const V2_OVERALL_UNCERTAINTY_CONFIG_RULE_ID = "v2-overall-uncertainty-config";
export declare const V2_OVERALL_UNCERTAINTY_CONFIG_PAYLOAD_ROLE: "overall_uncertainty_config";
/** Уровень серьёзности: три формулировки для вопросов анкеты. */
export type V2UncertaintySeverityLevel = {
    id: string;
    /** Подпись в п.3.1 Сроки. */
    timelineLabel: string;
    /** Подпись в п.3.2 Стоимость. */
    costLabel: string;
    /** Подпись «Влияние на Цели» в п.3.4. */
    goalsLabel: string;
};
export type V2UncertaintyProbabilityLevel = {
    id: string;
    label: string;
};
/** Группа риска: коэффициент, прибавляемый к базе (напр. 0.10). */
export type V2UncertaintyRiskGroup = {
    id: string;
    name: string;
    coef: number;
};
/** Диапазон «за количество отмеченных рисков». */
export type V2UncertaintyRiskCountRange = {
    minCount: number;
    /** null = без верхней границы (N+). */
    maxCount: number | null;
    coef: number;
};
export type V2UncertaintyRiskCatalogItem = {
    id: string;
    name: string;
};
/**
 * Конфигурация модуля «Общая неопределённость» (Опросник СА, п.3).
 * `matrix[severityIdx][probabilityIdx] = groupId`.
 */
export type V2OverallUncertaintyConfig = {
    version: 2;
    severityLevels: V2UncertaintySeverityLevel[];
    probabilityLevels: V2UncertaintyProbabilityLevel[];
    groups: V2UncertaintyRiskGroup[];
    riskCountRanges: V2UncertaintyRiskCountRange[];
    /** Строки = серьёзность (низ→выс), столбцы = вероятность (низ→выс). */
    matrix: string[][];
    risks: V2UncertaintyRiskCatalogItem[];
};
export type V2OverallUncertaintyPreviewState = {
    /** false = «Не применимо», поправка 0, коэфф. = 1. */
    enabled: boolean;
    timelineIdx: number;
    costIdx: number;
    /** Ручная поправка 0–30%; null = не задана (считаем по рискам). */
    adjPct: number | null;
    risks: Array<{
        id: string;
        enabled: boolean;
        probIdx: number;
        /** Индекс влияния на Цели (= severity level). */
        goalsIdx: number;
    }>;
};
export type V2OverallUncertaintyRiskContribution = {
    id: string;
    name: string;
    severityIdx: number;
    severityLabel: string;
    probIdx: number;
    probLabel: string;
    groupId: string;
    groupName: string;
    coef: number;
};
export type V2OverallUncertaintyCalcBreakdown = {
    applicable: boolean;
    timelineLabel: string;
    costLabel: string;
    baseSeverityIdx: number;
    baseSeverityLabel: string;
    manualAdjPct: number | null;
    manualOverridesRisks: boolean;
    enabledRiskCount: number;
    riskContributions: V2OverallUncertaintyRiskContribution[];
    riskAvgCoef: number;
    riskCountCoef: number;
    autoAdj: number;
    effectiveAdj: number;
    /** Итоговый коэффициент = 1 + поправка. */
    coefficient: number;
    /** Построчный предпросмотр формулы. */
    formulaLines: string[];
};
export declare function createDefaultOverallUncertaintyConfig(): V2OverallUncertaintyConfig;
export declare function createDefaultOverallUncertaintyPreviewState(config: V2OverallUncertaintyConfig): V2OverallUncertaintyPreviewState;
export declare function resolveUncertaintyRiskCountCoef(count: number, ranges: readonly V2UncertaintyRiskCountRange[]): number;
/**
 * Предпросмотр коэффициента п.3 по методике настройщика:
 * - выкл. → 1;
 * - база = max(индекс Сроков, индекс Стоимости);
 * - риск: severity = max(база, влияние на Цели) → матрица → коэфф. группы;
 * - автопоправка = avg(коэфф.) × множитель за количество;
 * - ручная поправка 0–30% полностью перекрывает авто;
 * - итог = 1 + поправка.
 */
export declare function calculateOverallUncertaintyPreview(config: V2OverallUncertaintyConfig, preview: V2OverallUncertaintyPreviewState): V2OverallUncertaintyCalcBreakdown;
/** Подгоняет матрицу под размеры шкал при add/remove. */
export declare function resizeUncertaintyMatrix(config: V2OverallUncertaintyConfig): V2OverallUncertaintyConfig;
export declare function isOverallUncertaintyConfigLogicRule(rule: V2LogicRuleDto): boolean;
export declare function parseOverallUncertaintyConfigFromLogic(rules: readonly V2LogicRuleDto[] | undefined): V2OverallUncertaintyConfig;
export declare function buildOverallUncertaintyConfigLogicRule(config: V2OverallUncertaintyConfig): V2LogicRuleDto;
export declare function mergeOverallUncertaintyConfigIntoLogic(rules: V2LogicRuleDto[], config: V2OverallUncertaintyConfig): V2LogicRuleDto[];
