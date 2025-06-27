export interface CalculationData {
	name: string;
	modelsCount: number;
	setupComplexity: number;
	initiativeTimeline: string;
	initiativeCost: string;
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
	readyPromReports: string;
	assessedInitiativesCount?: string;
	dataSourcesCount: string;
	pilotModelRequired: string;
	algorithmComplexity: AlgorithmTypeItem[];
	pilotSupportRequired: string;
	autoMlRequired: string;
	productionAdditionalReports: string;
	productionDeploymentChannels: DeploymentChannel[];
	finalCoefficient: number;
}

interface ProbabilityInfluencePair {
	probability: string;
	influence: string;
}

interface AlgorithmTypeItem {
	algorithmType: string;
}

interface DeploymentChannel {
	deploymentChannel: string;
}
