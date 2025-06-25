/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CalculationResponseDto } from "./CalculationResponseDto";
import type { PaginationMetaDto } from "./PaginationMetaDto";
export type PaginatedCalculationResponseDto = {
	/**
	 * Список расчетов
	 */
	data: Array<CalculationResponseDto>;
	/**
	 * Метаданные пагинации
	 */
	meta: PaginationMetaDto;
};
