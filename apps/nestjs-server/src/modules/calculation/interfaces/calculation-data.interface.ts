export interface CalculationData {
	modelsCount: number;
	setupComplexity: number;
	initiativeTimeline: string;
	initiativeCost: string;
	generalUncertainty: UncertaintyItem[];
	readyPromReports: string;
	assessedInitiativesCount?: string;
	dataSourcesCount: string;
	pilotModelRequired: string;
	algorithmComplexity: AlgorithmComplexity;
	pilotSupportRequired: string;
	autoMlRequired: string;
	productionAdditionalReports: string;
	productionDeploymentChannels: DeploymentChannel[];
}

export interface UncertaintyItem {
	itemType: string;
	probability: string;
	influence: string;
}

export interface AlgorithmComplexity {
	algorithmType: string;
}

export interface DeploymentChannel {
	deploymentChannel: string;
}
