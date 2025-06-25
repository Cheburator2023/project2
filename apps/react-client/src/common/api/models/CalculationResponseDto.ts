/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CalculationQuestionnaireDataDto } from "./CalculationQuestionnaireDataDto";
export type CalculationResponseDto = {
	/**
	 * Уникальный идентификатор расчета
	 */
	id: string;
	/**
	 * Название расчета
	 */
	name: string;
	/**
	 * Данные анкеты расчета
	 */
	questionnaireData: CalculationQuestionnaireDataDto;
	/**
	 * Финальный коэффициент расчета
	 */
	finalCoefficient: number;
	/**
	 * Дата создания расчета
	 */
	createdAt: string;
};
