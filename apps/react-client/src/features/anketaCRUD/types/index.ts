import { AlgorithmTypeItemDto } from "@react-client/common/api/generated/types/algorithmTypeItemDto";
import { CreateCalculationDtoAutoMlRequired } from "@react-client/common/api/generated/types/createCalculationDtoAutoMlRequired";
import { CreateCalculationDtoDataSourcesCount } from "@react-client/common/api/generated/types/createCalculationDtoDataSourcesCount";
import { CreateCalculationDtoPilotModelRequired } from "@react-client/common/api/generated/types/createCalculationDtoPilotModelRequired";
import { CreateCalculationDtoPilotSupportRequired } from "@react-client/common/api/generated/types/createCalculationDtoPilotSupportRequired";
import { CreateCalculationDtoProductionDeploymentChannelsItem } from "@react-client/common/api/generated/types/createCalculationDtoProductionDeploymentChannelsItem";
import { CreateCalculationDtoReadyPromReports } from "@react-client/common/api/generated/types/createCalculationDtoReadyPromReports";
import { UncertaintyItemDto } from "@react-client/common/api/generated/types/uncertaintyItemDto";

export interface AnketaForm {
	meta: {
		calculationName: string;
		rfd?: string;
		streamExecutor: string;
		department: string;
		customerName?: string;
		comment?: string;
		relatedModels?: string[];
		status?: string;
		createdAt?: string;
		id?: string;
		author?: string;
	};
	calculation: {
		modelsCount: number;
		generalUncertainty: UncertaintyItemDto;
		assessedInitiativesCount: number;
		dataSourcesCount: CreateCalculationDtoDataSourcesCount;
		pilotModelRequired: CreateCalculationDtoPilotModelRequired;
		pilotSupportRequired: CreateCalculationDtoPilotSupportRequired;
		algorithmComplexity: AlgorithmTypeItemDto;
		autoMlRequired: CreateCalculationDtoAutoMlRequired;
		productionAdditionalReports: string | number;
		productionDeploymentChannels: CreateCalculationDtoProductionDeploymentChannelsItem[];
		setupComplexity: string;
		readyPromReports: CreateCalculationDtoReadyPromReports;
	};
}
