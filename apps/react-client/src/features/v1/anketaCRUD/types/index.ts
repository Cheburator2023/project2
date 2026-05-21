import type {
	AlgorithmTypeItemDto,
	CalculationResponseDto,
	DataSourcesCount,
	DeploymentChannel,
	UncertaintyItemDto,
	YesNo,
	YesNoRequired,
} from "@smart-anketa/api-contract";

export interface AnketaForm {
	meta: {
		calculationName: string;
		rfd?: string;
		streamExecutor: string;
		department: string;
		customerName?: string;
		comment?: string;
		relatedModels?: string[];
		status?: CalculationResponseDto["status"];
		createdAt?: CalculationResponseDto["createdAt"];
		id?: CalculationResponseDto["id"];
		author?: CalculationResponseDto["author"];
	};
	calculation: {
		modelsCount: number;
		generalUncertainty: UncertaintyItemDto[];
		assessedInitiativesCount: number;
		dataSourcesCount: DataSourcesCount;
		pilotModelRequired: YesNoRequired;
		pilotSupportRequired: YesNoRequired;
		algorithmComplexity: AlgorithmTypeItemDto[];
		autoMlRequired: YesNoRequired;
		productionAdditionalReports: string;
		productionDeploymentChannels: DeploymentChannel[];
		setupComplexity: string;
		readyPromReports: YesNo | "";
	};
}
