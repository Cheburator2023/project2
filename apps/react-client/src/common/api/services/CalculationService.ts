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
     * Create new calculation
     * Creates a new calculation with the provided data
     * @param requestBody
     * @returns CalculationResponseDto The calculation has been successfully created.
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
            errors: {
                400: `Bad request. Validation failed.`,
                401: `Unauthorized. Authentication required.`,
            },
        });
    }
    /**
     * Get all calculations (paginated)
     * Retrieves a paginated list of all calculations
     * @param page Page number (starting from 1)
     * @param limit Number of items per page (max 100)
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
            errors: {
                401: `Unauthorized. Authentication required.`,
            },
        });
    }
    /**
     * Get all calculations (non-paginated)
     * Retrieves all calculations without pagination
     * @returns CalculationResponseDto List of all calculations
     * @throws ApiError
     */
    public static calculationControllerFindAll(): CancelablePromise<Array<CalculationResponseDto>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/calculation/all/list',
            errors: {
                401: `Unauthorized. Authentication required.`,
            },
        });
    }
    /**
     * Get calculation by ID
     * Retrieves a specific calculation by its unique identifier
     * @param id Calculation unique identifier
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
                401: `Unauthorized. Authentication required.`,
                404: `Calculation not found`,
            },
        });
    }
}
