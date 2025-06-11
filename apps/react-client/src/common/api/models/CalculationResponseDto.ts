/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type CalculationResponseDto = {
	id: string;
	name: string;
	/**
	 * Данные анкеты в формате JSON
	 */
	questionnaireData: Record<string, any>;
	finalCoefficient: number;
	createdAt: string;
};
