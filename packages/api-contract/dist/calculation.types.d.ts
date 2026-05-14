import { ALGORITHM_TYPE_VALUES, DATA_SOURCES_COUNT_VALUES, DEPLOYMENT_CHANNEL_VALUES, INITIATIVE_COST_VALUES, INITIATIVE_TIMELINE_VALUES, INFLUENCE_VALUES, PROBABILITY_VALUES, SETUP_COMPLEXITY_VALUES, UNCERTAINTY_TYPE_VALUES, YES_NO_REQUIRED_VALUES, YES_NO_VALUES } from "./calculation.constants";
export type SetupComplexity = (typeof SETUP_COMPLEXITY_VALUES)[number];
export type InitiativeTimeline = (typeof INITIATIVE_TIMELINE_VALUES)[number];
export type InitiativeCost = (typeof INITIATIVE_COST_VALUES)[number];
export type Probability = (typeof PROBABILITY_VALUES)[number];
export type Influence = (typeof INFLUENCE_VALUES)[number];
export type YesNo = (typeof YES_NO_VALUES)[number];
export type YesNoRequired = (typeof YES_NO_REQUIRED_VALUES)[number];
export type AlgorithmType = (typeof ALGORITHM_TYPE_VALUES)[number];
export type DeploymentChannel = (typeof DEPLOYMENT_CHANNEL_VALUES)[number];
export type DataSourcesCount = (typeof DATA_SOURCES_COUNT_VALUES)[number];
export type UncertaintyTypeKey = (typeof UNCERTAINTY_TYPE_VALUES)[number];
export declare const CalculationStatusValues: {
    readonly ACTIVE: "Активная";
    readonly ARCHIVE: "Архивная";
};
export type CalculationStatus = (typeof CalculationStatusValues)[keyof typeof CalculationStatusValues];
export interface UncertaintyItemDto {
    type: UncertaintyTypeKey;
    probability: Probability;
    influence: Influence;
}
export type UncertaintyMapEntry = {
    probability?: string;
    influence?: string;
};
/** JSONB may store either normalized array rows or legacy map form. */
export type GeneralUncertaintyPersisted = UncertaintyItemDto[] | Record<string, UncertaintyMapEntry>;
/** Stored rows may use plain enum strings or legacy `{ deploymentChannel }` objects. */
export type ProductionDeploymentChannelPersisted = DeploymentChannel | {
    deploymentChannel?: DeploymentChannel;
};
export interface AlgorithmTypeItemDto {
    algorithmType: AlgorithmType;
}
export interface CalculationResultItemDto {
    stageName: string;
    score: number;
    stageBaseValue?: number;
    percentFromAverage?: number;
    offset?: number;
    disabled?: boolean;
}
/** Nested questionnaire payload (extends base questionnaire fields). */
export interface CalculationQuestionnaireDataDto {
    calcName: string;
    setupComplexity: SetupComplexity;
    initiativeTimeline?: InitiativeTimeline | null;
    initiativeCost?: InitiativeCost | null;
    modelDeveloped?: YesNo;
    modelsCount: number;
    uncertaintyAdjustment?: number;
    generalUncertainty?: GeneralUncertaintyPersisted;
    readyPromReports: YesNo | "";
    assessedInitiativesCount?: number;
    dataSourcesCount: DataSourcesCount;
    pilotModelRequired: YesNoRequired;
    algorithmComplexity: AlgorithmTypeItemDto[];
    pilotSupportRequired: YesNoRequired;
    autoMlRequired: YesNoRequired;
    productionAdditionalReports?: string;
    productionDeploymentChannels: ProductionDeploymentChannelPersisted[];
    calculationResult?: CalculationResultItemDto[];
}
export interface CalculationResponseDto {
    id: string;
    calcName: string;
    rfd: string;
    streamExecutor: string;
    department: string[];
    customerName: string;
    comment: string;
    questionnaireData: CalculationQuestionnaireDataDto;
    finalCoefficient: number;
    createdAt: string;
    author: string;
    status: CalculationStatus;
    version: string;
    seriesId: string | null;
    parentCalcId?: string;
    readableId: string | null;
    parentReadableId?: string | null;
    seriesLatestVersion?: string;
}
export interface CreateCalculationDto {
    calcName: string;
    setupComplexity: SetupComplexity;
    initiativeTimeline?: InitiativeTimeline | null;
    initiativeCost?: InitiativeCost | null;
    modelDeveloped?: YesNo;
    modelsCount: number;
    uncertaintyAdjustment?: number;
    generalUncertainty: UncertaintyItemDto[];
    readyPromReports?: YesNo | "";
    assessedInitiativesCount?: number;
    dataSourcesCount: DataSourcesCount;
    pilotModelRequired: YesNoRequired;
    algorithmComplexity?: AlgorithmTypeItemDto[];
    pilotSupportRequired: YesNoRequired;
    autoMlRequired: YesNoRequired;
    productionAdditionalReports: string;
    productionDeploymentChannels: DeploymentChannel[];
    streamExecutor?: string;
    department?: string[];
    customerName?: string;
    comment?: string;
    finalCoefficient: number;
    calculationResult?: CalculationResultItemDto[];
}
/** PATCH-style payload for clone / new-version / revision flows. */
export interface CreateCalculationRevisionDto {
    calcName?: string;
    rfd?: string;
    streamExecutor?: string;
    department?: string[];
    customerName?: string;
    comment?: string;
    questionnaireData?: Partial<CalculationQuestionnaireDataDto>;
    finalCoefficient?: number;
    calculationResult?: CalculationResultItemDto[];
    modelDeveloped?: YesNo;
}
export type CreateNewVersionDto = CreateCalculationRevisionDto;
export type CreateCloneDto = CreateCalculationRevisionDto;
export interface PaginationMetaDto {
    total: number;
    page: number;
    limit: number;
    lastPage: number;
}
export interface PaginatedCalculationResponseDto {
    data: CalculationResponseDto[];
    meta: PaginationMetaDto;
}
export interface CalculationControllerFindAllPaginatedParams {
    page?: number;
    limit?: number;
}
export interface CalculationControllerExportToExcelParams {
    filterModel?: string;
    sortModel?: string;
    selectedIds?: string[];
}
