export function calculateStage01(
	baseValue: number,
	modelsCountCoefficient: number,
	setupComplexityCoefficient: number,
	generalUncertaintyCoefficient: number,
	readyPromReportsCoefficient: number,
): number {
	const result =
		baseValue *
		modelsCountCoefficient *
		setupComplexityCoefficient *
		generalUncertaintyCoefficient *
		readyPromReportsCoefficient;

	// Round up to 2 decimal places
	return Math.round(result * 100) / 100;
}

export function calculateStage02(
	baseValue: number,
	assessedInitiativesCount: number,
	dataSourcesCountCoefficient: number,
	generalUncertaintyCoefficient: number,
	readyPromReports: string,
	dataSourcesCount: string,
): number {
	if (readyPromReports === "Да" || Number(dataSourcesCount) === 0) {
		return 0;
	}

	let result: any;
	if (assessedInitiativesCount > 1) {
		result =
			(baseValue *
				generalUncertaintyCoefficient *
				dataSourcesCountCoefficient) /
			assessedInitiativesCount;
	} else {
		result =
			baseValue * generalUncertaintyCoefficient * dataSourcesCountCoefficient;
	}

	// Round up to 2 decimal places
	return Math.round(result * 100) / 100;
}

export function calculateStage04(
	baseValue: number,
	assessedInitiativesCount: number,
	setupComplexityCoefficient: number,
	generalUncertaintyCoefficient: number,
	readyPromReports: string,
): number {
	// If 'Наличие готовых пром витрин' is 'Да', set baseValue to 0 as per business logic
	if (readyPromReports === "Да") {
		return 0;
	}

	let result: any;
	if (assessedInitiativesCount > 1) {
		result =
			(baseValue * setupComplexityCoefficient * generalUncertaintyCoefficient) /
			assessedInitiativesCount;
	} else {
		result =
			baseValue * setupComplexityCoefficient * generalUncertaintyCoefficient;
	}

	// Round up to 2 decimal places
	return Math.round(result * 100) / 100;
}

export function calculateStage05A(
	baseValue: number,
	modelsCountCoefficient: number,
	setupComplexityCoefficient: number,
	generalUncertaintyCoefficient: number,
	readyPromReportsCoefficient: number,
	algorithmComplexityCoefficient: number,
	pilotModelRequired: string,
): number {
	if (pilotModelRequired === "Не требуется") {
		return 0;
	}

	const result =
		baseValue *
		modelsCountCoefficient *
		setupComplexityCoefficient *
		generalUncertaintyCoefficient *
		readyPromReportsCoefficient *
		algorithmComplexityCoefficient;

	// Round up to 2 decimal places
	return Math.round(result * 100) / 100;
}

export function calculateStage05(
	baseValue: number,
	modelsCountCoefficient: number,
	setupComplexityCoefficient: number,
	generalUncertaintyCoefficient: number,
	readyPromReportsCoefficient: number,
	algorithmComplexityCoefficient: number,
): number {
	const result =
		baseValue *
		modelsCountCoefficient *
		setupComplexityCoefficient *
		generalUncertaintyCoefficient *
		readyPromReportsCoefficient *
		algorithmComplexityCoefficient;

	// Round up to 2 decimal places
	return Math.round(result * 100) / 100;
}

export function calculateAMLDrafting(
	baseValue: number,
	modelsCountCoefficient: number,
	setupComplexityCoefficient: number,
	generalUncertaintyCoefficient: number,
	autoMlRequired: string,
): number {
	if (autoMlRequired === "Не требуется") {
		return 0;
	}

	const result =
		baseValue *
		modelsCountCoefficient *
		setupComplexityCoefficient *
		generalUncertaintyCoefficient;

	// Round up to 2 decimal places
	return Math.round(result * 100) / 100;
}

export function calculateStage05B(
	baseValue: number,
	generalUncertaintyCoefficient: number,
	readyPromReportsCoefficient: number,
	pilotSupportRequired: string,
): number {
	if (pilotSupportRequired === "Не требуется") {
		return 0;
	}

	const result =
		baseValue * generalUncertaintyCoefficient * readyPromReportsCoefficient;

	// Round up to 2 decimal places
	return Math.round(result * 100) / 100;
}

export function calculateStage07(
	baseValue: number,
	assessedInitiativesCount: number,
	setupComplexityCoefficient: number,
	generalUncertaintyCoefficient: number,
	productionAdditionalReportsCoefficient: number,
	productionAdditionalReports: string,
): number {
	if (productionAdditionalReports === "Не требуется") {
		return 0;
	}

	let result: any;
	if (assessedInitiativesCount > 0) {
		result =
			(baseValue *
				setupComplexityCoefficient *
				generalUncertaintyCoefficient *
				productionAdditionalReportsCoefficient) /
			assessedInitiativesCount;
	} else {
		result =
			baseValue *
			setupComplexityCoefficient *
			generalUncertaintyCoefficient *
			productionAdditionalReportsCoefficient;
	}

	// Round up to 2 decimal places
	return Math.round(result * 100) / 100;
}

export function calculateStage09(
	baseValue: number,
	modelsCountCoefficient: number,
	setupComplexityCoefficient: number,
	generalUncertaintyCoefficient: number,
	algorithmComplexityCoefficient: number,
	deploymentChannelsCoefficient: number,
	productionDeploymentChannels: string[],
): number {
	if (
		productionDeploymentChannels.length === 0 ||
		productionDeploymentChannels.includes("Не требуется")
	) {
		return 0;
	}

	const result =
		baseValue *
		modelsCountCoefficient *
		setupComplexityCoefficient *
		generalUncertaintyCoefficient *
		algorithmComplexityCoefficient *
		deploymentChannelsCoefficient;

	// Round up to 2 decimal places
	return Math.round(result * 100) / 100;
}

export function calculateAMLEnforcement(
	baseValue: number,
	modelsCountCoefficient: number,
	setupComplexityCoefficient: number,
	generalUncertaintyCoefficient: number,
	autoMlRequired: string,
): number {
	if (autoMlRequired === "Не требуется") {
		return 0;
	}

	const result =
		baseValue *
		modelsCountCoefficient *
		setupComplexityCoefficient *
		generalUncertaintyCoefficient;

	// Round up to 2 decimal places
	return Math.round(result * 100) / 100;
}
