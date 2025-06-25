// Enum values for client-side type safety
export const INITIATIVE_TIMELINE_VALUES = [
	"Менее 1 мес.",
	"1-4 мес.",
	"4-10 мес.",
	"10-18 мес.",
	"Более 18 мес.",
] as const;

export const INITIATIVE_COST_VALUES = [
	"До 45.3 млн.",
	"45.3-438 млн.",
	"438-870 млн.",
	"870 млн. - 2 млрд.",
	"От 2 млрд.",
] as const;

export const PROBABILITY_VALUES = [
	"Не применимо",
	"Реализация не чаще 1 раза в 10 лет",
	"Реализация 1 раз в 3-10 лет",
	"Реализация 1 раз в 1-3 года",
	"Реализация 1 раз в год",
	"Реализация 1 раз в 6 мес. или чаще",
] as const;

export const INFLUENCE_VALUES = [
	"Незначительное влияние на вторичные функции в рамках проектной деятельности",
	"Незначительное влияние на задачи и сроки достижения целей проекта",
	"Реализация проекта с контролируемыми отклонениями от изначальных целей",
	"Значительный негативный эффект на возможность достижения целей проекта",
	"Критичное отклонение качества реализации проекта",
] as const;

export const SIMPLE_INFLUENCE_VALUES = [
	"Незначительное",
	"Существенное",
	"Критичное",
] as const;

export const YES_NO_VALUES = ["Да", "Нет"] as const;
export const YES_NO_REQUIRED_VALUES = ["Да", "Не требуется"] as const;

export const ALGORITHM_TYPE_VALUES = [
	"Табличные данные",
	"Текстовая аналитика_Классические модели",
	"Текстовая аналитика_LLM",
	"Аудио Аналитика",
	"Компьютерное зрение_CV",
	"Оптимизационная задача",
	"Гео-аналитика",
	"Графовая аналитика",
] as const;

export const DEPLOYMENT_CHANNEL_VALUES = [
	"Батч",
	"Батч+загрузка данных потребителю",
	"Батч + Онлайн",
	"Онлайн",
	"Онлайн gpu",
	"Стриминг",
	"Мобильные устройства",
	"LLM",
	"Гео-сервисы",
	"Внедрение в облаке",
	"Графовая платформа",
] as const;

export const DATA_SOURCES_COUNT_VALUES = [
	"1",
	"2",
	"3",
	"4",
	"5",
	"6",
	"7",
	"8",
	"9",
	"10",
] as const;

export const UNCERTAINTY_TYPE_VALUES = [
	"businessProcessComplexity",
	"projectSolutionDefects",
	"adjacentProjectsImpact",
	"planningRequirementGaps",
	"contractorPerformanceIssues",
	"qualifiedStaffShortage",
	"sanctionsRisk",
	"controlProceduresGaps",
	"regulatoryChanges",
	"systemUnderutilization",
	"itArchitectureChanges",
] as const;

// Type definitions
export type InitiativeTimeline = (typeof INITIATIVE_TIMELINE_VALUES)[number];
export type InitiativeCost = (typeof INITIATIVE_COST_VALUES)[number];
export type Probability = (typeof PROBABILITY_VALUES)[number];
export type Influence = (typeof INFLUENCE_VALUES)[number];
export type SimpleInfluence = (typeof SIMPLE_INFLUENCE_VALUES)[number];
export type YesNo = (typeof YES_NO_VALUES)[number];
export type YesNoRequired = (typeof YES_NO_REQUIRED_VALUES)[number];
export type AlgorithmType = (typeof ALGORITHM_TYPE_VALUES)[number];
export type DeploymentChannel = (typeof DEPLOYMENT_CHANNEL_VALUES)[number];
export type DataSourcesCount = (typeof DATA_SOURCES_COUNT_VALUES)[number];
export type UncertaintyType = (typeof UNCERTAINTY_TYPE_VALUES)[number];

// Base types
export interface ProbabilityInfluencePair {
	probability: Probability;
	influence: Influence;
}

export interface SimpleProbabilityInfluencePair {
	probability: Probability;
	influence: SimpleInfluence;
}

export interface AlgorithmTypeItem {
	algorithmType: AlgorithmType;
}

export interface DeploymentChannelItem {
	deploymentChannel: DeploymentChannel;
}

export interface UncertaintyItem {
	type: UncertaintyType;
	probability: Probability;
	influence: SimpleInfluence;
}

// Request DTOs
export interface CreateCalculationRequest {
	name: string;
	modelsCount: number;
	setupComplexity: string;
	initiativeTimeline: InitiativeTimeline;
	initiativeCost: InitiativeCost;
	uncertaintyAdjustment?: number;
	generalUncertainty: UncertaintyItem[];
	readyPromReports: YesNo;
	assessedInitiativesCount?: number;
	dataSourcesCount: DataSourcesCount;
	pilotModelRequired: YesNoRequired;
	algorithmComplexity: AlgorithmTypeItem[];
	pilotSupportRequired: YesNoRequired;
	autoMlRequired: YesNoRequired;
	productionAdditionalReports: number;
	productionDeploymentChannels: DeploymentChannel[];
	finalCoefficient: number;
}

// Response DTOs
export interface CalculationQuestionnaireData {
	name: string;
	modelsCount: number;
	setupComplexity: string;
	initiativeTimeline: InitiativeTimeline;
	initiativeCost: InitiativeCost;
	uncertaintyAdjustment?: number;
	generalUncertainty: Record<string, SimpleProbabilityInfluencePair>;
	readyPromReports: YesNo;
	assessedInitiativesCount?: string;
	dataSourcesCount: DataSourcesCount;
	pilotModelRequired: YesNoRequired;
	algorithmComplexity: AlgorithmTypeItem[];
	pilotSupportRequired: YesNoRequired;
	autoMlRequired: YesNoRequired;
	productionAdditionalReports?: string;
	productionDeploymentChannels: DeploymentChannelItem[];
}

export interface CalculationResponse {
	id: string;
	name: string;
	questionnaireData: CalculationQuestionnaireData;
	finalCoefficient: number;
	createdAt: string;
}

export interface PaginationMeta {
	total: number;
	page: number;
	limit: number;
	lastPage: number;
}

export interface PaginatedCalculationResponse {
	data: CalculationResponse[];
	meta: PaginationMeta;
}

// Pagination
export interface PaginationParams {
	page?: number;
	limit?: number;
}
