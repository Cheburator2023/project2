export interface ProbabilityInfluencePair {
	probability: string;
	influence: string;
}

export interface UncertaintyItem extends ProbabilityInfluencePair {
	type: string;
}

export interface IAssessmentFormData {
	modelsCount: number;
	setupComplexity: string;
	initiativeTimeline?: string;
	initiativeCost?: string;
	generalUncertainty: UncertaintyItem[];
	readyPromReports_assessedInitiativesCount_dataSourcesCount?: {
		readyPromReports: string;
		assessedInitiativesCount?: number;
		dataSourcesCount?: string;
	};
	pilotModelRequired_pilotSupportRequired?: {
		pilotModelRequired: string;
		pilotSupportRequired: string;
	};
	algorithmComplexity: { algorithmType: string }[];
	autoMlRequired: string;
	productionAdditionalReports: string;
	productionDeploymentChannels: string[];
	[key: string]: any;
}
