import { useCalculationControllerFindOne } from "@react-client/common/api/generated/queries/calculation";
import { CalculationResponseDto } from "@react-client/common/api/generated/types/calculationResponseDto";
import { IBasicFormData } from "../stores/useAnketaCRUDFormsStore";
import { IAssessmentFormData } from "../types/FormData";

export const useParentCalculationData = (parentId?: string) => {
	const { data, isLoading, error } = useCalculationControllerFindOne(
		parentId!,
		{ query: { enabled: !!parentId } },
	);

	return {
		parentData: data,
		isLoading,
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
		modelsCount: data.questionnaireData.modelsCount,
		algorithmComplexity: data.questionnaireData.algorithmComplexity,
		setupComplexity: data.questionnaireData.setupComplexity,
		initiativeTimeline: data.questionnaireData.initiativeTimeline,
		initiativeCost: data.questionnaireData.initiativeCost,
		generalUncertainty:
			(data.questionnaireData.generalUncertainty as any) || [],
		autoMlRequired: data.questionnaireData.autoMlRequired,
		productionAdditionalReports:
			data.questionnaireData.productionAdditionalReports || "",
		productionDeploymentChannels:
			(data.questionnaireData.productionDeploymentChannels as any) || [],
	};
};
