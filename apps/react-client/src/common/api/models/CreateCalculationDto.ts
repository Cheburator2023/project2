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
	 * Количество моделей (>1 для каскадов и ансамблей моделей)
	 */
	modelsCount: number;
	/**
	 * Сложность настройки (1 - минимальная, 5 - максимальная)
	 */
	setupComplexity: number;
	/**
	 * Срок реализации инициативы
	 */
	initiativeTimeline:
		| "Менее 1 мес."
		| "1-4 мес."
		| "4-10 мес."
		| "10-18 мес."
		| "Более 18 мес.";
	/**
	 * Стоимость инициативы
	 */
	initiativeCost:
		| "До 45.3 млн."
		| "45.3-438 млн."
		| "438-870 млн."
		| "870 млн. - 2 млрд."
		| "От 2 млрд.";
	/**
	 * Факторы общей неопределенности
	 */
	generalUncertainty: GeneralUncertaintyDto;
	/**
	 * Наличие готовых промоделированных отчетов
	 */
	readyPromReports: "Да" | "Нет";
	/**
	 * Количество оцененных инициатив
	 */
	assessedInitiativesCount:
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
	/**
	 * Количество источников данных
	 */
	dataSourcesCount: "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10";
	/**
	 * Требуется ли пилотная модель
	 */
	pilotModelRequired: "Да" | "Не требуется";
	/**
	 * Сложность алгоритмов
	 */
	algorithmComplexity: Array<AlgorithmTypeItemDto>;
	/**
	 * Требуется ли поддержка пилота
	 */
	pilotSupportRequired: "Да" | "Не требуется";
	/**
	 * Требуется ли AutoML
	 */
	autoMlRequired: "Да" | "Не требуется";
	/**
	 * Дополнительные отчеты для продакшена
	 */
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
	/**
	 * Каналы развертывания в продакшен
	 */
	productionDeploymentChannels: Array<DeploymentChannelDto>;
	/**
	 * Финальный коэффициент расчета
	 */
	finalCoefficient: number;
};
