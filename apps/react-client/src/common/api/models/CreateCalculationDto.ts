/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AlgorithmTypeItemDto } from "./AlgorithmTypeItemDto";
import type { DeploymentChannelDto } from "./DeploymentChannelDto";
import type { GeneralUncertaintyDto } from "./GeneralUncertaintyDto";
export type CreateCalculationDto = {
	/**
	 * Название расчета
	 */
	name: string;
	/**
	 * > 1 для каскадов и ансамблей моделей
	 */
	modelsCount: number;
	/**
	 * Проведение регулярной валидации Моделей Регулятором нормативно не установлено.
	 */
	setupComplexity: 1 | 2 | 3 | 4 | 5;
	initiativeTimeline:
		| "Менее 1 мес."
		| "1-4 мес."
		| "4-10 мес."
		| "10-18 мес."
		| "Более 18 мес.";
	initiativeCost:
		| "До 45.3 млн."
		| "45.3-438 млн."
		| "438-870 млн."
		| "870 млн. - 2 млрд."
		| "От 2 млрд.";
	generalUncertainty: GeneralUncertaintyDto;
	readyPromReports: "Да" | "Нет";
	assessedInitiativesCount?:
		| "1"
		| "2"
		| "3"
		| "4"
		| "5"
		| "6"
		| "7"
		| "8"
		| "9"
		| "10";
	dataSourcesCount: "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10";
	pilotModelRequired: "Да" | "Не требуется";
	algorithmComplexity: Array<AlgorithmTypeItemDto>;
	pilotSupportRequired: "Да" | "Не требуется";
	autoMlRequired: "Да" | "Не требуется";
	productionAdditionalReports:
		| "1"
		| "2"
		| "3"
		| "4"
		| "5"
		| "6"
		| "7"
		| "8"
		| "9"
		| "10";
	productionDeploymentChannels: Array<DeploymentChannelDto>;
	/**
	 * Финальный коэффициент расчета
	 */
	finalCoefficient: number;
};
