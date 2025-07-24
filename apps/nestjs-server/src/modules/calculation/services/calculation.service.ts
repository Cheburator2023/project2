import {
	BadRequestException,
	Injectable,
    Logger,
	NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { CreateCalculationDto, PaginationDto } from "../dto";
import { UpdateCalculationDto } from "../dto/request/update-calculation.dto";
import { Calculation } from "../entities/calculation.entity";
import { PaginatedResult } from "../interfaces/paginated-result.interface";

@Injectable()
export class CalculationService {
    private readonly logger = new Logger(CalculationService.name);

    constructor(
        @InjectRepository(Calculation)
        private calculationRepository: Repository<Calculation>,
    ) {}

    /**
     * Creates a new calculation
     */
    async create(
        createCalculationDto: CreateCalculationDto,
        user: any,
    ): Promise<Calculation> {
        this.logger.log(
            `Creating new calculation with name: ${createCalculationDto.calcName}`,
        );
        try {
            const generalUncertaintyObject = {};
            if (createCalculationDto.generalUncertainty) {
                createCalculationDto.generalUncertainty.forEach((item) => {
                    generalUncertaintyObject[item.type] = {
                        probability: item.probability,
                        influence: item.influence,
                    };
                });
            }

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

            const savedCalculation = await this.calculationRepository.save(calculation);
            this.logger.log(
                `Successfully created calculation with ID: ${savedCalculation.id}`,
            );
            return savedCalculation;
        } catch (error) {
            this.logger.error(
                `Failed to create calculation: ${error.message}`,
                error.stack,
            );
            throw new BadRequestException(
                `Failed to create calculation: ${error.message}`,
            );
        }
    }

    /**
     * Updates calculation basic information
     */
    async updateCalculation(
        id: string,
        updateDto: UpdateCalculationDto,
    ): Promise<Calculation> {
        this.logger.log(`Updating calculation with ID: ${id}`);
        try {
            const calculation = await this.calculationRepository.findOne({
                where: { id },
            });

            if (!calculation) {
                this.logger.warn(`Calculation with ID ${id} not found`);
                throw new NotFoundException(`Calculation with ID ${id} not found`);
            }

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

            const updatedCalculation = await this.calculationRepository.save(calculation);
            this.logger.log(`Successfully updated calculation with ID: ${id}`);
            return updatedCalculation;
        } catch (error) {
            this.logger.error(
                `Failed to update calculation with ID: ${id}: ${error.message}`,
                error.stack,
            );
            if (error instanceof NotFoundException) {
                throw error;
            }
            throw new BadRequestException(
                `Failed to update calculation: ${error.message}`,
            );
        }
    }

    /**
     * Finds a calculation by ID
     */
    async findOne(id: string): Promise<Calculation> {
        this.logger.log(`Fetching calculation with ID: ${id}`);
        try {
            const calculation = await this.calculationRepository.findOne({
                where: { id },
            });

            if (!calculation) {
                this.logger.warn(`Calculation with ID ${id} not found`);
                throw new NotFoundException(`Calculation with ID ${id} not found`);
            }

            this.logger.log(`Successfully fetched calculation with ID: ${id}`);
            return calculation;
        } catch (error) {
            this.logger.error(
                `Failed to fetch calculation with ID: ${id}: ${error.message}`,
                error.stack,
            );
            throw error;
        }
    }

    /**
     * Finds all calculations with pagination
     */
    async findAllPaginated(
        paginationDto: PaginationDto,
    ): Promise<PaginatedResult<Calculation>> {
        this.logger.log(
            `Fetching paginated calculations, page: ${paginationDto.page}, limit: ${paginationDto.limit}`,
        );
        try {
            const skip = (paginationDto.page - 1) * paginationDto.limit;

            const [results, total] = await this.calculationRepository.findAndCount({
                skip,
                take: paginationDto.limit,
                order: { createdAt: "DESC" },
            });

            this.logger.log(
                `Successfully fetched ${results.length} calculations out of ${total}`,
            );
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
            this.logger.error(
                `Failed to fetch paginated calculations: ${error.message}`,
                error.stack,
            );
            throw new BadRequestException(
                `Failed to fetch paginated calculations: ${error.message}`,
            );
        }
    }

    /**
     * Finds all calculations without pagination
     */
    async findAll(): Promise<Calculation[]> {
        this.logger.log("Fetching all calculations");
        try {
            const calculations = await this.calculationRepository.find({
                order: { createdAt: "DESC" },
            });
            this.logger.log(`Successfully fetched ${calculations.length} calculations`);
            return calculations;
        } catch (error) {
            this.logger.error(
                `Failed to fetch calculations: ${error.message}`,
                error.stack,
            );
            throw new BadRequestException(
                `Failed to fetch calculations: ${error.message}`,
            );
        }
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
    ): Promise<Calculation[]> {
        this.logger.log(
            `Exporting calculations with filters: ${JSON.stringify(filters)}, sort: ${JSON.stringify(sort)}`,
        );
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

            const calculations = await queryBuilder.getMany();
            this.logger.log(`Exporting ${calculations.length} calculations`);
            return calculations;
        } catch (error) {
            this.logger.error(
                `Failed to export calculations: ${error.message}`,
                error.stack,
            );
            throw error;
        }
    }
}