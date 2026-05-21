// @ts-nocheck
import { DecimalJS as Decimal } from "../../../../utils/decimal";

function roundup2d(val: Decimal.Value): number {
	return new Decimal(val).toDecimalPlaces(2, Decimal.ROUND_UP).toNumber();
}

export function calculateStage01(
	baseValue: number,
	modelsCountCoefficient: number,
	setupComplexityCoefficient: number,
	generalUncertaintyCoefficient: number,
	readyPromReportsCoefficient: number,
): number {
	const d = new Decimal(baseValue)
		.mul(modelsCountCoefficient)
		.mul(setupComplexityCoefficient)
		.mul(generalUncertaintyCoefficient)
		.mul(readyPromReportsCoefficient);
	return roundup2d(d);
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
	let d: Decimal;
	if (assessedInitiativesCount > 1) {
		d = new Decimal(baseValue)
			.mul(generalUncertaintyCoefficient)
			.mul(dataSourcesCountCoefficient)
			.div(assessedInitiativesCount);
	} else {
		d = new Decimal(baseValue)
			.mul(generalUncertaintyCoefficient)
			.mul(dataSourcesCountCoefficient);
	}
	return roundup2d(d);
}

export function calculateStage04(
	baseValue: number,
	assessedInitiativesCount: number,
	setupComplexityCoefficient: number,
	generalUncertaintyCoefficient: number,
	readyPromReports: string,
	dataSourcesCount: string,
): number {
	if (readyPromReports === "Да") {
		return 0;
	}
	let d: Decimal;
	if (assessedInitiativesCount > 1 && Number(dataSourcesCount) !== 0) {
		d = new Decimal(baseValue)
			.mul(setupComplexityCoefficient)
			.mul(generalUncertaintyCoefficient)
			.div(assessedInitiativesCount);
	} else {
		d = new Decimal(baseValue)
			.mul(setupComplexityCoefficient)
			.mul(generalUncertaintyCoefficient);
	}
	return roundup2d(d);
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
	const d = new Decimal(baseValue)
		.mul(modelsCountCoefficient)
		.mul(setupComplexityCoefficient)
		.mul(generalUncertaintyCoefficient)
		.mul(readyPromReportsCoefficient)
		.mul(algorithmComplexityCoefficient);
	return roundup2d(d);
}

export function calculateStage05(
	baseValue: number,
	modelsCountCoefficient: number,
	setupComplexityCoefficient: number,
	generalUncertaintyCoefficient: number,
	readyPromReportsCoefficient: number,
	algorithmComplexityCoefficient: number,
): number {
	const d = new Decimal(baseValue)
		.mul(modelsCountCoefficient)
		.mul(setupComplexityCoefficient)
		.mul(generalUncertaintyCoefficient)
		.mul(readyPromReportsCoefficient)
		.mul(algorithmComplexityCoefficient);
	return roundup2d(d);
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
	const d = new Decimal(baseValue)
		.mul(modelsCountCoefficient)
		.mul(setupComplexityCoefficient)
		.mul(generalUncertaintyCoefficient);
	return roundup2d(d);
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
	const d = new Decimal(baseValue)
		.mul(generalUncertaintyCoefficient)
		.mul(readyPromReportsCoefficient);
	return roundup2d(d);
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
	let d: Decimal;
	if (assessedInitiativesCount > 0) {
		d = new Decimal(baseValue)
			.mul(setupComplexityCoefficient)
			.mul(generalUncertaintyCoefficient)
			.mul(productionAdditionalReportsCoefficient)
			.div(assessedInitiativesCount);
	} else {
		d = new Decimal(baseValue)
			.mul(setupComplexityCoefficient)
			.mul(generalUncertaintyCoefficient)
			.mul(productionAdditionalReportsCoefficient);
	}
	return roundup2d(d);
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
	const d = new Decimal(baseValue)
		.mul(modelsCountCoefficient)
		.mul(setupComplexityCoefficient)
		.mul(generalUncertaintyCoefficient)
		.mul(algorithmComplexityCoefficient)
		.mul(deploymentChannelsCoefficient);
	return roundup2d(d);
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
	const d = new Decimal(baseValue)
		.mul(modelsCountCoefficient)
		.mul(setupComplexityCoefficient)
		.mul(generalUncertaintyCoefficient);
	return roundup2d(d);
}
