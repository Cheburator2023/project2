/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CalculationResponseDto } from '../models/CalculationResponseDto';
import type { CreateCalculationDto } from '../models/CreateCalculationDto';
import type { PaginatedCalculationResponseDto } from '../models/PaginatedCalculationResponseDto';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class CalculationService {
    /**
     * Save calculation result
     * @param requestBody
     * @returns CalculationResponseDto The calculation has been successfully saved.
     * @throws ApiError
     */
    public static calculationControllerCreate(
        requestBody: CreateCalculationDto,
    ): CancelablePromise<CalculationResponseDto> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/calculation',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Get all calculations (paginated)
     * @param page Page number (starting from 1)
     * @param limit Number of items per page
     * @returns PaginatedCalculationResponseDto Paginated list of calculations
     * @throws ApiError
     */
    public static calculationControllerFindAllPaginated(
        page: number = 1,
        limit: number = 10,
    ): CancelablePromise<PaginatedCalculationResponseDto> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/calculation/all',
            query: {
                'page': page,
                'limit': limit,
            },
        });
    }
    /**
     * Get all calculations (non-paginated)
     * @returns CalculationResponseDto List of all calculations
     * @throws ApiError
     */
    public static calculationControllerFindAll(): CancelablePromise<Array<CalculationResponseDto>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/calculation/all/list',
        });
    }
    /**
     * Get calculation by ID
     * @param id
     * @returns CalculationResponseDto Calculation data
     * @throws ApiError
     */
    public static calculationControllerFindOne(
        id: string,
    ): CancelablePromise<CalculationResponseDto> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/calculation/{id}',
            path: {
                'id': id,
            },
            errors: {
                400: `Invalid UUID format`,
                404: `Calculation not found`,
            },
        });
    }
}
