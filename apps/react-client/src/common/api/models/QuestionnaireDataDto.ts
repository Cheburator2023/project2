/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AlgorithmTypeItemDto } from "./AlgorithmTypeItemDto";
import type { DeploymentChannelDto } from "./DeploymentChannelDto";
import type { GeneralUncertaintyDto } from "./GeneralUncertaintyDto";
export type QuestionnaireDataDto = {
	/**
	 * Название расчета
	 */
	name: string;
	/**
	 * Количество моделей (>1 для каскадов и ансамблей моделей)
	 */
	modelsCount: number;
	/**
	 * Сложность настройки
	 */
	setupComplexity: string;
	/**
	 * Срок реализации инициативы
	 */
	initiativeTimeline: string;
	/**
	 * Стоимость инициативы
	 */
	initiativeCost: string;
	/**
	 * Факторы общей неопределенности
	 */
	generalUncertainty: GeneralUncertaintyDto;
	/**
	 * Наличие готовых промоделированных отчетов
	 */
	readyPromReports: string;
	/**
	 * Количество оцененных инициатив
	 */
	assessedInitiativesCount?: string;
	/**
	 * Количество источников данных
	 */
	dataSourcesCount: string;
	/**
	 * Требуется ли пилотная модель
	 */
	pilotModelRequired: string;
	/**
	 * Сложность алгоритмов
	 */
	algorithmComplexity: Array<AlgorithmTypeItemDto>;
	/**
	 * Требуется ли поддержка пилота
	 */
	pilotSupportRequired: string;
	/**
	 * Требуется ли AutoML
	 */
	autoMlRequired: string;
	/**
	 * Дополнительные отчеты для продакшена
	 */
	productionAdditionalReports: string;
	/**
	 * Каналы развертывания в продакшен
	 */
	productionDeploymentChannels: Array<DeploymentChannelDto>;
};
