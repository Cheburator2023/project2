import {
	BadRequestException,
	Injectable,
	NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PaginationDto } from "../dto/pagination.dto";
import { CreateCalculationDto } from "../dto/request/create-calculation.dto";
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

			const calculation = this.calculationRepository.create({
				name: createCalculationDto.name || "Новый расчет",
				questionnaireData: {
					name: createCalculationDto.name || "Новый расчет",
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
				},
				finalCoefficient: createCalculationDto.finalCoefficient,
			});

			return await this.calculationRepository.save(calculation);
		} catch (error) {
			throw new BadRequestException(
				`Failed to create calculation: ${error.message}`,
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
