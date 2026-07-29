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
    /** Цвет-метка группы в матрице и легенде (hex). */
    color?: string;
};
/** Свёртка коэффициентов отмеченных рисков: сумма (базовый вариант) или среднее. */
export type V2UncertaintyAggregationMode = "sum" | "avg";
/** Настройки поля «Поправка, %»: границы, дефолт и подсказка пользователю. */
export type V2UncertaintyAdjustmentSettings = {
    minPct: number;
    maxPct: number;
    defaultPct: number;
    hint: string;
};
export declare const V2_UNCERTAINTY_ADJUSTMENT_DEFAULTS: V2UncertaintyAdjustmentSettings;
/** Вероятность «Не применимо»: риск отмечен, но в расчёт вносит ноль. */
export declare function isUncertaintyNotApplicableLabel(label: string): boolean;
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
    /** @deprecated не участвует в методике; хранится для обратной совместимости. */
    riskCountRanges: V2UncertaintyRiskCountRange[];
    /** Свёртка коэффициентов рисков: сумма (базовый вариант) или среднее. */
    aggregation: V2UncertaintyAggregationMode;
    /** Границы/дефолт/подсказка поля «Поправка, %». */
    adjustment: V2UncertaintyAdjustmentSettings;
    /** Строки = серьёзность (низ→выс), столбцы = вероятность (низ→выс). */
    matrix: string[][];
    risks: V2UncertaintyRiskCatalogItem[];
    /**
     * Дефолты правой панели (то, что видит/заполняет пользователь анкеты):
     * тоггл «Заполняется» / «Не применимо», сроки, стоимость, отмеченные риски, поправка.
     * Версия шаблона не хранит formData — поэтому состояние лежит здесь, в logic-config.
     */
    calculator?: V2OverallUncertaintyPreviewState;
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
    /** Введённая пользователем поправка (%), null = не задана (берётся дефолт). */
    manualAdjPct: number | null;
    enabledRiskCount: number;
    riskContributions: V2OverallUncertaintyRiskContribution[];
    /** Режим свёртки, применённый к рискам. */
    aggregation: V2UncertaintyAggregationMode;
    /** Агрегат по рискам: сумма или среднее коэффициентов. */
    riskAggregate: number;
    /** Доля поправки = поправка% / 100. */
    adjustmentShare: number;
    /** Итоговый коэффициент = 1 + агрегат + поправка/100. */
    coefficient: number;
    /** Построчный предпросмотр формулы. */
    formulaLines: string[];
};
export declare const V2_UNCERTAINTY_GROUP_DEFAULT_COLORS: Record<string, string>;
export declare function createDefaultOverallUncertaintyConfig(): V2OverallUncertaintyConfig;
export declare function createDefaultOverallUncertaintyPreviewState(config: V2OverallUncertaintyConfig): V2OverallUncertaintyPreviewState;
/**
 * Подгоняет состояние калькулятора под актуальные шкалы/каталог рисков
 * (индексы, id рисков, adjPct).
 */
export declare function normalizeOverallUncertaintyCalculatorState(config: V2OverallUncertaintyConfig, calculator?: V2OverallUncertaintyPreviewState | null): V2OverallUncertaintyPreviewState;
/** Вшивает нормализованный calculator в конфиг (после parse / resize / правок шкал). */
export declare function withNormalizedOverallUncertaintyCalculator(config: V2OverallUncertaintyConfig, calculator?: V2OverallUncertaintyPreviewState | null): V2OverallUncertaintyConfig;
/** Обрезает поправку (%) до границ, заданных конфигуратором. */
export declare function clampUncertaintyAdjustmentPct(pct: number, settings: V2UncertaintyAdjustmentSettings): number;
export declare function resolveUncertaintyRiskCountCoef(count: number, ranges: readonly V2UncertaintyRiskCountRange[]): number;
/**
 * Коэффициент общей неопределённости по методике конфигуратора:
 * 1. база = худший из двух — Сроки и Стоимость (max индексов);
 * 2. уровень риска = худший из трёх — база и «влияние на Цели» (max);
 * 3. уровень × вероятность → ячейка матрицы → группа → коэффициент
 *    (вероятность «Не применимо» всегда даёт 0);
 * 4. агрегат = сумма (базовый вариант) или среднее коэффициентов;
 * 5. итог = 1 + агрегат + поправка/100 (поправка добавляется, не перекрывает).
 */
export declare function calculateOverallUncertaintyPreview(config: V2OverallUncertaintyConfig, preview: V2OverallUncertaintyPreviewState): V2OverallUncertaintyCalcBreakdown;
/** Подгоняет матрицу под размеры шкал при add/remove. */
export declare function resizeUncertaintyMatrix(config: V2OverallUncertaintyConfig): V2OverallUncertaintyConfig;
export declare function isOverallUncertaintyConfigLogicRule(rule: V2LogicRuleDto): boolean;
export declare function parseOverallUncertaintyConfigFromLogic(rules: readonly V2LogicRuleDto[] | undefined): V2OverallUncertaintyConfig;
export declare function buildOverallUncertaintyConfigLogicRule(config: V2OverallUncertaintyConfig): V2LogicRuleDto;
export declare function mergeOverallUncertaintyConfigIntoLogic(rules: V2LogicRuleDto[], config: V2OverallUncertaintyConfig): V2LogicRuleDto[];
