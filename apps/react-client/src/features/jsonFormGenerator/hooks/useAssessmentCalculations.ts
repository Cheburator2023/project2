import { useMemo } from "react";
import * as helpers from "../calculations/coefficients";
import * as mainStages from "../calculations/stages";
import type { FormData } from "../types/FormData";

export function useAssessmentCalculations(formData: FormData) {
	// Calculate all coefficients
	const coefficients = useMemo(() => {
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
	}, [formData]);

	// Calculate all stage results
	const stageBaseValues = {
		stage01: 33,
		stage02: 15,
		stage04: 51,
		stage05A: 40,
		stage05: 37,
		amlDrafting: 68, // AML Разработка
		stage05B: 34,
		stage07: 56,
		stage09: 50,
		amlEnforcement: 68, // AML Внедрение
	};
	const stageResults = useMemo(() => {
		const assessedInitiativesCount =
			Number(formData.assessedInitiativesCount) || 1;
		const pilotModelRequired = formData.pilotModelRequired || "Не требуется";
		const pilotSupportRequired =
			formData.pilotSupportRequired || "Не требуется";
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
				stageBaseValues.stage04,
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
	}, [formData]);

	return { coefficients, stageResults };
}
