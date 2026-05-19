import type {
	CalculationResponseDto,
	DeploymentChannel,
	UncertaintyItemDto,
} from "@smart-anketa/api-contract";

import { useCalculationControllerFindOne } from "@react-client/common/api/queries/calculation";
import { IBasicFormData } from "../stores/useAnketaCRUDFormsStore";
import { IAssessmentFormData } from "../types/FormData";

const normalizeGeneralUncertainty = (value: unknown): UncertaintyItemDto[] => {
	if (Array.isArray(value)) {
		return value as UncertaintyItemDto[];
	}

	if (value && typeof value === "object") {
		return Object.entries(
			value as Record<string, { probability?: string; influence?: string }>,
		).map(([type, payload]) => ({
			type,
			probability: payload?.probability ?? "",
			influence: payload?.influence ?? "",
		})) as UncertaintyItemDto[];
	}

	return [];
};

const normalizeDeploymentChannels = (value: unknown): DeploymentChannel[] => {
	if (!Array.isArray(value)) {
		return [];
	}

	return value
		.map((item) => (typeof item === "string" ? item : item?.deploymentChannel))
		.filter(Boolean) as DeploymentChannel[];
};

export const useParentCalculationData = (parentId?: string) => {
	const { data, isLoading, error, isError } = useCalculationControllerFindOne(
		parentId!,
		{ query: { enabled: !!parentId } },
	);

	return {
		parentData: data,
		isLoading,
		hasError: isError,
		error,
		mapToBasicForm: data ? mapCalculationToBasicForm(data) : null,
		mapToAssessmentForm: data ? mapCalculationToAssessmentForm(data) : null,
	};
};

export const mapCalculationToBasicForm = (
	data: CalculationResponseDto,
): IBasicFormData => {
	return {
		calcName: data.calcName,
		rfd: data.rfd,
		streamExecutor: data.streamExecutor,
		department: data.department,
		customerName: data.customerName,
		comment: data.comment,
		createdAt: data.createdAt,
		id: data.id,
		author: data.author,
	};
};

export const mapCalculationToAssessmentForm = (
	data: CalculationResponseDto,
): IAssessmentFormData => {
	return {
		modelDeveloped: data.questionnaireData.modelDeveloped || "Нет",
		modelsCount: data.questionnaireData.modelsCount,
		algorithmComplexity: data.questionnaireData.algorithmComplexity,
		setupComplexity: data.questionnaireData.setupComplexity,
		initiativeTimeline:
			data.questionnaireData.initiativeTimeline == null
				? undefined
				: data.questionnaireData.initiativeTimeline,
		initiativeCost:
			data.questionnaireData.initiativeCost == null
				? undefined
				: data.questionnaireData.initiativeCost,
		generalUncertainty: normalizeGeneralUncertainty(
			data.questionnaireData.generalUncertainty,
		),
		autoMlRequired: data.questionnaireData.autoMlRequired,
		productionAdditionalReports:
			data.questionnaireData.productionAdditionalReports || "",
		productionDeploymentChannels: normalizeDeploymentChannels(
			data.questionnaireData.productionDeploymentChannels,
		),
		dataSourcesCount: data.questionnaireData.dataSourcesCount,
		readyPromReports: data.questionnaireData.readyPromReports ?? "",
		uncertaintyAdjustment: data.questionnaireData.uncertaintyAdjustment,
		pilotSupportRequired: data.questionnaireData.pilotSupportRequired,
		pilotModelRequired: data.questionnaireData.pilotModelRequired,
		assessedInitiativesCount: data.questionnaireData.assessedInitiativesCount,
	};
};
