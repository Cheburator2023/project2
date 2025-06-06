import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { EntityNotFoundError } from "typeorm/error/EntityNotFoundError";
import { CreateCalculationDto } from "../dto/create-calculation.dto";
import { PaginationDto } from "../dto/pagination.dto";
import { Calculation } from "../entities/calculation.entity";
import { PaginatedResult } from "../interfaces/paginated-result.interface";

@Injectable()
export class CalculationService {
	constructor(
		@InjectRepository(Calculation)
		private calculationRepository: Repository<Calculation>,
	) {}

	async create(
		createCalculationDto: CreateCalculationDto,
	): Promise<Calculation> {
		const calculation = this.calculationRepository.create({
			name: createCalculationDto.name,
			questionnaireData: {
				modelsCount: createCalculationDto.modelsCount,
				setupComplexity: createCalculationDto.setupComplexity,
				initiativeTimeline: createCalculationDto.initiativeTimeline,
				initiativeCost: createCalculationDto.initiativeCost,
				generalUncertainty: createCalculationDto.generalUncertainty,
				readyPromReports: createCalculationDto.readyPromReports,
				assessedInitiativesCount: createCalculationDto.assessedInitiativesCount,
				dataSourcesCount: createCalculationDto.dataSourcesCount,
				pilotModelRequired: createCalculationDto.pilotModelRequired,
				algorithmComplexity: createCalculationDto.algorithmComplexity,
				pilotSupportRequired: createCalculationDto.pilotSupportRequired,
				autoMlRequired: createCalculationDto.autoMlRequired,
				productionAdditionalReports:
					createCalculationDto.productionAdditionalReports,
				productionDeploymentChannels:
					createCalculationDto.productionDeploymentChannels,
			},
			finalCoefficient: createCalculationDto.finalCoefficient,
		});
		return await this.calculationRepository.save(calculation);
	}

	async findOne(id: string): Promise<Calculation> {
		const calculation = await this.calculationRepository.findOne({
			where: { id },
		});

		if (!calculation) {
			throw new EntityNotFoundError(Calculation, id);
		}

		return calculation;
	}

	async findAllPaginated(
		paginationDto: PaginationDto,
	): Promise<PaginatedResult<Calculation>> {
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
	}

	async findAll(): Promise<Calculation[]> {
		return this.calculationRepository.find();
	}
}
