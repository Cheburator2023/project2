import { create } from "zustand";
import * as helpers from "../calculations/coefficients";
import * as mainStages from "../calculations/stages";
import type { FormData } from "../types/FormData";

export interface StageValues {
	stage01: number;
	stage02: number;
	stage03: number;
	stage05A: number;
	stage05: number;
	amlDrafting: number;
	stage05B: number;
	stage07: number;
	stage09: number;
	amlEnforcement: number;
}

interface AssessmentState {
	formData: FormData;
	stageBaseValues: StageValues;
	coefficients: {
		modelsCountCoefficient: number;
		setupComplexityCoefficient: number;
		generalUncertaintyCoefficient: number;
		readyPromReportsCoefficient: number;
		dataSourcesCountCoefficient: number;
		pilotModelRequired: number;
		algorithmComplexityCoefficient: number;
		pilotSupportRequired: number;
		autoMlRequired: number;
		productionAdditionalReportsCoefficient: number;
		deploymentChannelsCoefficient: number;
	};
	stageResults: StageValues;
	setFormData: (data: FormData) => void;
	updateFormData: (updates: Partial<FormData>) => void;
}

const stageBaseValues: StageValues = {
	stage01: 33,
	stage02: 15,
	stage03: 51,
	stage05A: 40,
	stage05: 37,
	amlDrafting: 68, // AML Разработка
	stage05B: 34,
	stage07: 56,
	stage09: 50,
	amlEnforcement: 68, // AML Внедрение
};

const stageResults: StageValues = {
	stage01: 0,
	stage02: 0,
	stage03: 0,
	stage05A: 0,
	stage05: 0,
	amlDrafting: 0,
	stage05B: 0,
	stage07: 0,
	stage09: 0,
	amlEnforcement: 0,
};

const calculateCoefficients = (formData: FormData) => {
	const modelsCount = Number(formData.modelsCount) || 1;
	const dataSourcesCount = Number(formData.dataSourcesCount) || 1;

	return {
		modelsCountCoefficient: helpers.calculateModelsCoefficient(modelsCount),
		setupComplexityCoefficient: helpers.calculateSetupComplexityCoefficient(
			formData.setupComplexity,
		),
		generalUncertaintyCoefficient: helpers.calculateTotalUncertainty(
			formData.generalUncertainty || [],
			Number(formData.uncertaintyAdjustment) || 0,
		),
		readyPromReportsCoefficient: helpers.getReadyPromReportsCoefficient(
			formData.readyPromReports || "Нет",
		),
		dataSourcesCountCoefficient:
			helpers.calculateDataSourceCoefficient(dataSourcesCount),
		pilotModelRequired: helpers.getPilotModelCoefficient(
			formData.pilotModelRequired || "Не требуется",
		),
		algorithmComplexityCoefficient:
			helpers.calculateAlgorithmComplexityCoefficient(
				formData.algorithmComplexity || [],
			),
		pilotSupportRequired: helpers.getPilotSupportCoefficient(
			formData.pilotSupportRequired || "Не требуется",
		),
		autoMlRequired: helpers.getAutoMlCoefficient(
			formData.autoMlRequired || "Не требуется",
		),
		productionAdditionalReportsCoefficient:
			helpers.getProductionAdditionalReportsCoefficient(
				formData.productionAdditionalReports || "1",
			),
		deploymentChannelsCoefficient:
			helpers.calculateDeploymentChannelCoefficient(
				formData.productionDeploymentChannels || [],
			),
	};
};

const calculateStageResults = (
	formData: FormData,
	coefficients: ReturnType<typeof calculateCoefficients>,
) => {
	const assessedInitiativesCount =
		Number(formData.assessedInitiativesCount) || 1;
	const pilotModelRequired = formData.pilotModelRequired || "Не требуется";
	const pilotSupportRequired = formData.pilotSupportRequired || "Не требуется";
	const autoMlRequired = formData.autoMlRequired || "Не требуется";
	const productionAdditionalReports =
		formData.productionAdditionalReports || "1";
	const productionDeploymentChannels =
		formData.productionDeploymentChannels || [];

	return {
		stage01: mainStages.calculateStage01(
			stageBaseValues.stage01,
			coefficients.modelsCountCoefficient,
			coefficients.setupComplexityCoefficient,
			coefficients.generalUncertaintyCoefficient,
			coefficients.readyPromReportsCoefficient,
		),
		stage02: mainStages.calculateStage02(
			stageBaseValues.stage02,
			assessedInitiativesCount,
			coefficients.dataSourcesCountCoefficient,
			coefficients.generalUncertaintyCoefficient,
			formData.readyPromReports || "Нет",
		),
		stage03: mainStages.calculateStage03(
			stageBaseValues.stage03,
			assessedInitiativesCount,
			coefficients.setupComplexityCoefficient,
			coefficients.generalUncertaintyCoefficient,
			formData.readyPromReports || "Нет",
		),
		stage05A: mainStages.calculateStage05A(
			stageBaseValues.stage05A,
			coefficients.modelsCountCoefficient,
			coefficients.setupComplexityCoefficient,
			coefficients.generalUncertaintyCoefficient,
			coefficients.readyPromReportsCoefficient,
			coefficients.algorithmComplexityCoefficient,
			pilotModelRequired,
		),
		stage05: mainStages.calculateStage05(
			stageBaseValues.stage05,
			coefficients.modelsCountCoefficient,
			coefficients.setupComplexityCoefficient,
			coefficients.generalUncertaintyCoefficient,
			coefficients.readyPromReportsCoefficient,
			coefficients.algorithmComplexityCoefficient,
		),
		amlDrafting: mainStages.calculateAMLDrafting(
			stageBaseValues.amlDrafting,
			coefficients.modelsCountCoefficient,
			coefficients.setupComplexityCoefficient,
			coefficients.generalUncertaintyCoefficient,
			autoMlRequired,
		),
		stage05B: mainStages.calculateStage05B(
			stageBaseValues.stage05B,
			coefficients.generalUncertaintyCoefficient,
			coefficients.readyPromReportsCoefficient,
			pilotSupportRequired,
		),
		stage07: mainStages.calculateStage07(
			stageBaseValues.stage07,
			assessedInitiativesCount,
			coefficients.setupComplexityCoefficient,
			coefficients.generalUncertaintyCoefficient,
			coefficients.productionAdditionalReportsCoefficient,
			productionAdditionalReports,
		),
		stage09: mainStages.calculateStage09(
			stageBaseValues.stage09,
			coefficients.modelsCountCoefficient,
			coefficients.setupComplexityCoefficient,
			coefficients.generalUncertaintyCoefficient,
			coefficients.algorithmComplexityCoefficient,
			coefficients.deploymentChannelsCoefficient,
			productionDeploymentChannels,
		),
		amlEnforcement: mainStages.calculateAMLEnforcement(
			stageBaseValues.amlEnforcement,
			coefficients.modelsCountCoefficient,
			coefficients.setupComplexityCoefficient,
			coefficients.generalUncertaintyCoefficient,
			autoMlRequired,
		),
	};
};

export const assessmentCalculationsStore = create<AssessmentState>(
	(set, _get) => ({
		formData: {} as FormData,
		stageBaseValues,
		coefficients: {
			modelsCountCoefficient: 0,
			setupComplexityCoefficient: 0,
			generalUncertaintyCoefficient: 0,
			readyPromReportsCoefficient: 0,
			dataSourcesCountCoefficient: 0,
			pilotModelRequired: 0,
			algorithmComplexityCoefficient: 0,
			pilotSupportRequired: 0,
			autoMlRequired: 0,
			productionAdditionalReportsCoefficient: 0,
			deploymentChannelsCoefficient: 0,
		},
		stageResults,
		setFormData: (data: FormData) => {
			set((state) => {
				const newFormData = data;
				const newCoefficients = calculateCoefficients(newFormData);
				const newStageResults = calculateStageResults(
					newFormData,
					newCoefficients,
				);

				return {
					...state,
					formData: newFormData,
					coefficients: newCoefficients,
					stageResults: newStageResults,
				};
			});
		},
		updateFormData: (updates: Partial<FormData>) => {
			set((state) => {
				const newFormData = { ...state.formData, ...updates };
				const newCoefficients = calculateCoefficients(newFormData);
				const newStageResults = calculateStageResults(
					newFormData,
					newCoefficients,
				);

				return {
					...state,
					formData: newFormData,
					coefficients: newCoefficients,
					stageResults: newStageResults,
				};
			});
		},
	}),
);
