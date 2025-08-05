import {
	BadRequestException,
	Injectable,
	NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { CreateCalculationDto, PaginationDto } from "../dto";
import { UpdateCalculationDto } from "../dto/request/update-calculation.dto";
import { Calculation } from "../entities/calculation.entity";
import { PaginatedResult } from "../interfaces/paginated-result.interface";
import { AbortSignal } from "node-abort-controller";
import { CustomLogger } from "src/shared/services/logger.service";
import { v4 as uuidv4 } from "uuid";
import { RetryUtil } from "src/shared/utils/retry.util";

@Injectable()
export class CalculationService {

    constructor(
        @InjectRepository(Calculation)
        private calculationRepository: Repository<Calculation>,
        private readonly customLogger: CustomLogger,
    ) {}

    /**
     * Creates a new calculation
     */
    async create(
        createCalculationDto: CreateCalculationDto,
        user: any,
        signal?: AbortSignal,
    ): Promise<Calculation> {
        return RetryUtil.withRetry(
            async () => {
        const eventId = uuidv4();
        this.customLogger.log(`Creating calculation [${eventId}]`, 'CalculationService.create');
        this.checkAborted(signal);

        try {
            const hasValidAlgorithm = createCalculationDto.algorithmComplexity?.some(item =>
                item?.algorithmType?.trim() !== "");

            if (!hasValidAlgorithm) {
                throw new Error("At least one algorithm type must have a non-empty value");
            }

            const generalUncertaintyObject = {};
            if (createCalculationDto.generalUncertainty) {
                createCalculationDto.generalUncertainty.forEach((item) => {
                    generalUncertaintyObject[item.type] = {
                        probability: item.probability,
                        influence: item.influence,
                    };
                });
            }

            this.checkAborted(signal);

            const authorName = user
                ? `${user.given_name || ""} ${user.family_name || ""}`.trim() ||
                user.preferred_username ||
                user.email ||
                "Система"
                : "Система";

            const calculationResult =
                (createCalculationDto as any).calculationResult?.map((item) => ({
                    stageName: item.stageName,
                    score: item.score,
                    stageBaseValue: item.stageBaseValue,
                    percentFromAverage: item.percentFromAverage,
                    offset: item.offset,
                    disabled: item.disabled,
                })) || [];

            this.checkAborted(signal);

            const calculation = this.calculationRepository.create({
                calcName: createCalculationDto.calcName || "Новый расчет",
                rfd: createCalculationDto.rfd || "",
                streamExecutor: createCalculationDto.streamExecutor,
                department: createCalculationDto.department,
                customerName: createCalculationDto.customerName,
                comment: createCalculationDto.comment,
                questionnaireData: {
                    calcName: createCalculationDto.calcName || "Новый расчет",
                    modelsCount: createCalculationDto.modelsCount,
                    setupComplexity: createCalculationDto.setupComplexity,
                    initiativeTimeline: createCalculationDto.initiativeTimeline,
                    initiativeCost: createCalculationDto.initiativeCost,
                    uncertaintyAdjustment: createCalculationDto.uncertaintyAdjustment,
                    generalUncertainty: generalUncertaintyObject,
                    readyPromReports: createCalculationDto.readyPromReports,
                    assessedInitiativesCount:
                        createCalculationDto.assessedInitiativesCount?.toString(),
                    dataSourcesCount: createCalculationDto.dataSourcesCount,
                    pilotModelRequired: createCalculationDto.pilotModelRequired,
                    algorithmComplexity: createCalculationDto.algorithmComplexity,
                    pilotSupportRequired: createCalculationDto.pilotSupportRequired,
                    autoMlRequired: createCalculationDto.autoMlRequired,
                    productionAdditionalReports:
                        createCalculationDto.productionAdditionalReports?.toString(),
                    productionDeploymentChannels:
                        createCalculationDto.productionDeploymentChannels.map((channel) => ({
                            deploymentChannel: channel,
                        })),
                    calculationResult:
                        calculationResult.length > 0 ? calculationResult : undefined,
                },
                finalCoefficient: createCalculationDto.finalCoefficient,
                author: authorName,
            } as Partial<Calculation>);

            this.checkAborted(signal);

            const savedCalculation = await this.calculationRepository.save(calculation);
            this.customLogger.log(`Calculation created successfully [${eventId}]`, 'CalculationService.create');

            return savedCalculation;
        } catch (error) {
            this.customLogger.error(
                "Failed to create calculation",
                error.stack,
                "CalculationService.create",
                {
                    error: error.message,
                    dto: createCalculationDto,
                },
            );
            if (error.message === "At least one algorithm type must have a non-empty value")
            {
                throw new BadRequestException({
                    message: "Validation failed.",
                    errors: [{
                        field: "algorithmComplexity",
                        message: "At least one algorithm type must have a non-empty value",
                    }]
                })
            }

            throw new BadRequestException(
                `Failed to create calculation: ${error.message}`,
            );
        }
            },
            3,
            1000,
            (error) => !(error instanceof BadRequestException || error?.name === "AbortError")
        );
    }

    /**
     * Updates calculation basic information
     */
    async updateCalculation(
        id: string,
        updateDto: UpdateCalculationDto,
        signal?: AbortSignal,
    ): Promise<Calculation> {
        return RetryUtil.withRetry(
            async () => {
        this.customLogger.log(`Updating calculation with ID: ${id}`);
        this.checkAborted(signal);

        try {
            const calculation = await this.calculationRepository.findOne({
                where: { id },
            });

            if (!calculation) {
                this.customLogger.warn(`Calculation with ID ${id} not found`);
                throw new NotFoundException(`Calculation with ID ${id} not found`);
            }

            this.checkAborted(signal);

            if (updateDto.calcName !== undefined) {
                calculation.calcName = updateDto.calcName;
                calculation.questionnaireData.calcName = updateDto.calcName;
            }
            if (updateDto.rfd !== undefined) calculation.rfd = updateDto.rfd;
            if (updateDto.streamExecutor !== undefined)
                calculation.streamExecutor = updateDto.streamExecutor;
            if (updateDto.department !== undefined)
                calculation.department = updateDto.department;
            if (updateDto.customerName !== undefined)
                calculation.customerName = updateDto.customerName;
            if (updateDto.comment !== undefined)
                calculation.comment = updateDto.comment;

            this.checkAborted(signal);

            const updatedCalculation = await this.calculationRepository.save(
                calculation,
            );
            this.customLogger.log(`Successfully updated calculation with ID: ${id}`);
            return updatedCalculation;
        } catch (error) {
            this.customLogger.error(
                `Failed to update calculation with ID: ${id}`,
                error.stack,
                "CalculationService.updateCalculation",
                {
                    error: error.message,
                    updateDto,
                },
            );
            if (error instanceof NotFoundException) {
                throw error;
            }
            throw new BadRequestException(
                `Failed to update calculation: ${error.message}`,
            );
        }
            },
            3,
            1000,
            (error) => !(error instanceof NotFoundException || error?.name === "AbortError")
        );
    }

    /**
     * Finds a calculation by ID
     */
    async findOne(
        id: string,
        signal?: AbortSignal,
    ): Promise<Calculation> {
        return RetryUtil.withRetry(
            async () => {
        this.customLogger.log(`Fetching calculation with ID: ${id}`);
        this.checkAborted(signal);

        try {
            const calculation = await this.calculationRepository.findOne({
                where: { id },
            });

            this.checkAborted(signal);

            if (!calculation) {
                this.customLogger.warn(`Calculation with ID ${id} not found`);
                throw new NotFoundException(`Calculation with ID ${id} not found`);
            }

            this.customLogger.log(`Successfully fetched calculation with ID: ${id}`);
            return calculation;
        } catch (error) {
            this.customLogger.error(
                `Failed to fetch calculation with ID: ${id}`,
                error.stack,
                "CalculationService.findOne",
                {
                    error: error.message,
                    calculationId: id,
                },
            );
            throw error;
        }
            },
            3,
            1000,
            (error) => !(error instanceof NotFoundException || error?.name === "AbortError")
        );
    }

    /**
     * Finds all calculations with pagination
     */
    async findAllPaginated(
        paginationDto: PaginationDto,
        signal?: AbortSignal,
    ): Promise<PaginatedResult<Calculation>> {
        return RetryUtil.withRetry(
            async () => {
        this.customLogger.log(
            `Fetching paginated calculations, page: ${paginationDto.page}, limit: ${paginationDto.limit}`,
        );
        this.checkAborted(signal);

        try {
            const skip = (paginationDto.page - 1) * paginationDto.limit;

            this.checkAborted(signal);

            const [results, total] = await this.calculationRepository.findAndCount({
                skip,
                take: paginationDto.limit,
                order: { createdAt: "DESC" },
            });

            this.checkAborted(signal);

            return {
                data: results,
                meta: {
                    total,
                    page: paginationDto.page,
                    limit: paginationDto.limit,
                    lastPage: Math.ceil(total / paginationDto.limit),
                },
            };
        } catch (error) {
            this.customLogger.error(
                "Failed to fetch paginated calculations",
                error.stack,
                "CalculationService.findAllPaginated",
                {
                    error: error.message,
                    pagination: paginationDto,
                },
            );
            throw new BadRequestException(
                `Failed to fetch paginated calculations: ${error.message}`,
            );
        }
            },
            3,
            1000,
            (error) => !(error?.name === "AbortError")
        );
    }

    /**
     * Finds all calculations without pagination
     */
    async findAll(signal?: AbortSignal): Promise<Calculation[]> {
        return RetryUtil.withRetry(
            async () => {
        this.customLogger.log("Fetching all calculations");
        this.checkAborted(signal);

        try {
            const calculations = await this.calculationRepository.find({
                order: { createdAt: "DESC" },
            });

            this.checkAborted(signal);

            return calculations;
        } catch (error) {
            this.customLogger.error(
                "Failed to fetch calculations",
                error.stack,
                "CalculationService.findAll",
                {
                    error: error.message,
                },
            );
            throw new BadRequestException(
                `Failed to fetch calculations: ${error.message}`,
            );
        }
            },
            3,
            1000,
            (error) => !(error?.name === "AbortError")
        );
    }

    /**
     * Export all calculations without pagination
     */
    async findAllForExport(
        filters?: {
            name?: string;
            finalCoefficient?: { min?: number; max?: number };
            createdAt?: { from?: Date; to?: Date };
            status?: string;
        },
        sort?: { field: string; order: "ASC" | "DESC" },
        selectedIds?: string[],
        signal?: AbortSignal,
    ): Promise<Calculation[]> {
        return RetryUtil.withRetry(
            async () => {
        this.checkAborted(signal);

        try {
            const queryBuilder =
                this.calculationRepository.createQueryBuilder("calculation");

		if (filters) {
			if (filters.name) {
				queryBuilder.andWhere("calculation.name LIKE :name", {
					name: `%${filters.name}%`,
				});
			}

			if (filters.finalCoefficient) {
				if (filters.finalCoefficient.min !== undefined) {
					queryBuilder.andWhere(
						"calculation.finalCoefficient >= :minCoefficient",
						{
							minCoefficient: filters.finalCoefficient.min,
						},
					);
				}
				if (filters.finalCoefficient.max !== undefined) {
					queryBuilder.andWhere(
						"calculation.finalCoefficient <= :maxCoefficient",
						{
							maxCoefficient: filters.finalCoefficient.max,
						},
					);
				}
			}

                if (filters.createdAt) {
                    if (filters.createdAt.from) {
                        queryBuilder.andWhere("calculation.createdAt >= :fromDate", {
                            fromDate: filters.createdAt.from,
                        });
                    }
                    if (filters.createdAt.to) {
                        queryBuilder.andWhere("calculation.createdAt <= :toDate", {
                            toDate: filters.createdAt.to,
                        });
                    }
                }

                if (filters.status) {
                    queryBuilder.andWhere(
                        "calculation.questionnaireData::jsonb->>'status' = :status",
                        {
                            status: filters.status,
                        },
                    );
                }
            }

            if (selectedIds && selectedIds.length > 0) {
                queryBuilder.andWhere({ id: In(selectedIds) });
            }

            const sortField = sort?.field || "createdAt";
            const sortOrder = sort?.order || "DESC";
            queryBuilder.orderBy(`calculation.${sortField}`, sortOrder);

            this.checkAborted(signal);

            const calculations = await queryBuilder.getMany();
            this.customLogger.log(`Exporting ${calculations.length} calculations`);
            return calculations;
        } catch (error) {
            this.customLogger.error(
                'Failed to export calculations',
                error.stack,
                'CalculationService.findAllForExport',
                {
                    error: error.message,
                    filters,
                    sort,
                },
            );
            throw error;
        }
            },
            3,
            1000,
            (error) => !(error?.name === "AbortError")
        );
    }

    private checkAborted(signal?: AbortSignal): void {
        if (signal?.aborted) {
            throw new Error('Request aborted by client');
        }
    }
}