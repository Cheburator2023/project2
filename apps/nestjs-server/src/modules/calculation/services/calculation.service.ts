import {
	BadRequestException,
	Injectable,
	NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CreateCalculationDto, PaginationDto } from "../dto";
import { UpdateCalculationDto } from "../dto/request/update-calculation.dto";
import { Calculation } from "../entities/calculation.entity";
import { PaginatedResult } from "../interfaces/paginated-result.interface";

@Injectable()
export class CalculationService {
	constructor(
		@InjectRepository(Calculation)
		private calculationRepository: Repository<Calculation>,
	) {}

	/**
	 * Creates a new calculation
	 */
	async create(
		createCalculationDto: CreateCalculationDto,
		user?: any,
	): Promise<Calculation> {
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
						createCalculationDto.productionDeploymentChannels.map(
							(channel) => ({
								deploymentChannel: channel,
							}),
						),
					calculationResult:
						calculationResult.length > 0 ? calculationResult : undefined,
				},
				finalCoefficient: createCalculationDto.finalCoefficient,
				author: authorName,
			} as Partial<Calculation>);

			return await this.calculationRepository.save(calculation);
		} catch (error) {
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
		try {
			const calculation = await this.calculationRepository.findOne({
				where: { id },
			});

			if (!calculation) {
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

			return await this.calculationRepository.save(calculation);
		} catch (error) {
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
		const calculation = await this.calculationRepository.findOne({
			where: { id },
		});

		if (!calculation) {
			throw new NotFoundException(`Calculation with ID ${id} not found`);
		}

		return calculation;
	}

	/**
	 * Finds all calculations with pagination
	 */
	async findAllPaginated(
		paginationDto: PaginationDto,
	): Promise<PaginatedResult<Calculation>> {
		try {
			const skip = (paginationDto.page - 1) * paginationDto.limit;

			const [results, total] = await this.calculationRepository.findAndCount({
				skip,
				take: paginationDto.limit,
				order: { createdAt: "DESC" },
			});

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
			throw new BadRequestException(
				`Failed to fetch paginated calculations: ${error.message}`,
			);
		}
	}

	/**
	 * Finds all calculations without pagination
	 */
	async findAll(): Promise<Calculation[]> {
		try {
			return await this.calculationRepository.find({
				order: { createdAt: "DESC" },
			});
		} catch (error) {
			throw new BadRequestException(
				`Failed to fetch calculations: ${error.message}`,
			);
		}
	}
}
