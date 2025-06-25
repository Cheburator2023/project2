/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { QuestionnaireDataDto } from "./QuestionnaireDataDto";
export type CalculationResponseDto = {
	/**
	 * Уникальный идентификатор расчета (UUID)
	 */
	id: string;
	/**
	 * Данные анкеты (структурированный объект)
	 */
	questionnaireData: QuestionnaireDataDto;
	/**
	 * Финальный коэффициент расчета
	 */
	finalCoefficient: number;
	/**
	 * Дата и время создания расчета (ISO 8601)
	 */
	createdAt: string;
};
