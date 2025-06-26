/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AlgorithmTypeItemDto } from "./AlgorithmTypeItemDto";
export type CalculationQuestionnaireDataDto = {
	/**
	 * Название расчета
	 */
	name: string;
	/**
	 * Сложность настройки
	 */
	setupComplexity: string;
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
	 * Количество моделей
	 */
	modelsCount: number;
	/**
	 * Корректировка неопределенности
	 */
	uncertaintyAdjustment: number;
	/**
	 * Факторы общей неопределенности
	 */
	generalUncertainty: Record<
		string,
		{
			probability?: string;
			influence?: string;
		}
	>;
	/**
	 * Наличие готовых промоделированных отчетов
	 */
	readyPromReports: "Да" | "Нет";
	/**
	 * Количество оцененных инициатив
	 */
	assessedInitiativesCount: string;
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
	productionAdditionalReports: string;
	/**
	 * Каналы развертывания в продакшен
	 */
	productionDeploymentChannels: Array<Record<string, any>>;
};
