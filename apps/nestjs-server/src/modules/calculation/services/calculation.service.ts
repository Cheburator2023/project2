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
		const q = createCalculationDto.questionnaireData;
		const calculation = this.calculationRepository.create({
			name: q.name,
			questionnaireData: q,
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
