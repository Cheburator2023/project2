import type { V2LogicRuleDto } from "./v2-template.types";
export declare const V2_DEVIATION_COEFFICIENTS_CONFIG_RULE_ID = "__v2_deviation_coefficients_config__";
export declare const V2_DEVIATION_COEFFICIENTS_CONFIG_PAYLOAD_ROLE: "deviation_coefficients_config";
export type V2DeviationLabelCoefficient = {
    label: string;
    coefficient: number;
};
export type V2DeviationCountStep = {
    count: number;
    coefficient: number;
};
/** Работа, участвующая в колонках отклонений панели итогов. */
export type V2DeviationWorkEntry = {
    workId: string;
    workName: string;
    /** Участвует в расчёте/отображении отклонений. */
    enabled: boolean;
};
/**
 * Редактируемые коэффициенты, раньше захардкоженные в legacy СФЕРА-оценке
 * и используемые для отклонений (база vs поправка).
 */
export type V2DeviationCoefficientsConfig = {
    version: 1;
    /** Прирост коэф. за каждую модель сверх 1 (было 0.75). */
    modelsCountIncrement: number;
    /** Коэф. при «готовые промышленные отчёты = Да» (было 0.5). */
    readyPromYesCoefficient: number;
    /** Прирост за каждый доп. отчёт сверх 1 (было 0.75). */
    productionReportsIncrement: number;
    /** Ступени коэф. по числу источников данных. */
    sourceCountSteps: V2DeviationCountStep[];
    /** Коэф. по типу алгоритма. */
    algorithmTypeCoefficients: V2DeviationLabelCoefficient[];
    /** Коэф. по каналу внедрения. */
    deploymentChannelCoefficients: V2DeviationLabelCoefficient[];
    /** Работы, для которых считаем/показываем отклонения (модельные + любые добавленные). */
    works: V2DeviationWorkEntry[];
};
export declare function createDefaultDeviationCoefficientsConfig(): V2DeviationCoefficientsConfig;
export declare function isDeviationCoefficientsConfigLogicRule(rule: V2LogicRuleDto): boolean;
export declare function parseDeviationCoefficientsConfigFromLogic(rules: readonly V2LogicRuleDto[] | undefined): V2DeviationCoefficientsConfig;
export declare function buildDeviationCoefficientsConfigLogicRule(config: V2DeviationCoefficientsConfig): V2LogicRuleDto;
export declare function mergeDeviationCoefficientsConfigIntoLogic(rules: V2LogicRuleDto[], config: V2DeviationCoefficientsConfig): V2LogicRuleDto[];
export declare function resolveSourceCountCoefficient(config: V2DeviationCoefficientsConfig, dataSourceCount: number): number;
export declare function resolveAlgorithmTypeCoefficient(config: V2DeviationCoefficientsConfig, algorithmTypes: string[]): number;
export declare function resolveDeploymentChannelCoefficient(config: V2DeviationCoefficientsConfig, channels: string[]): number;
