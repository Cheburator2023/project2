import {
	ALGORITHM_TYPE_VALUES,
	DATA_SOURCES_COUNT_VALUES,
	DEPLOYMENT_CHANNEL_VALUES,
	INFLUENCE_VALUES,
	INITIATIVE_COST_VALUES,
	INITIATIVE_TIMELINE_VALUES,
	PROBABILITY_VALUES,
	YES_NO_REQUIRED_VALUES,
	YES_NO_VALUES,
} from "../dto/base/calculation-base.dto";

export interface CalculationData {
	name: string;
	modelsCount: number;
	setupComplexity: string;
	initiativeTimeline: (typeof INITIATIVE_TIMELINE_VALUES)[number];
	initiativeCost: (typeof INITIATIVE_COST_VALUES)[number];
	generalUncertainty: {
		businessProcessComplexity: ProbabilityInfluencePair;
		projectSolutionDefects: ProbabilityInfluencePair;
		adjacentProjectsImpact: ProbabilityInfluencePair;
		planningRequirementGaps: ProbabilityInfluencePair;
		contractorPerformanceIssues: ProbabilityInfluencePair;
		qualifiedStaffShortage: ProbabilityInfluencePair;
		sanctionsRisk: ProbabilityInfluencePair;
		controlProceduresGaps: ProbabilityInfluencePair;
		regulatoryChanges: ProbabilityInfluencePair;
		systemUnderutilization: ProbabilityInfluencePair;
		itArchitectureChanges: ProbabilityInfluencePair;
	};
	readyPromReports: (typeof YES_NO_VALUES)[number];
	assessedInitiativesCount?: string;
	dataSourcesCount: (typeof DATA_SOURCES_COUNT_VALUES)[number];
	pilotModelRequired: (typeof YES_NO_REQUIRED_VALUES)[number];
	algorithmComplexity: AlgorithmTypeItem[];
	pilotSupportRequired: (typeof YES_NO_REQUIRED_VALUES)[number];
	autoMlRequired: (typeof YES_NO_REQUIRED_VALUES)[number];
	productionAdditionalReports?: string;
	productionDeploymentChannels: DeploymentChannel[];
	finalCoefficient: number;
}

interface ProbabilityInfluencePair {
	probability: (typeof PROBABILITY_VALUES)[number];
	influence: (typeof INFLUENCE_VALUES)[number];
}

interface AlgorithmTypeItem {
	algorithmType: (typeof ALGORITHM_TYPE_VALUES)[number];
}

interface DeploymentChannel {
	deploymentChannel: (typeof DEPLOYMENT_CHANNEL_VALUES)[number];
}
