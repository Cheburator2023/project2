/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { QuestionnaireDataDto } from "./QuestionnaireDataDto";
export type CreateCalculationDto = {
	/**
	 * Данные анкеты (структурированный объект)
	 */
	questionnaireData: QuestionnaireDataDto;
	/**
	 * Финальный коэффициент расчета
	 */
	finalCoefficient: number;
};
