import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CreateCalculationDto } from "../dto/create-calculation.dto";
import { Calculation } from "../entities/calculation.entity";

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
			name: "New Calculation",
			questionnaireData: createCalculationDto,
		});
		return await this.calculationRepository.save(calculation);
	}

	async findOne(id: string): Promise<Calculation | null> {
		return this.calculationRepository.findOne({ where: { id } });
	}

	async findAll(): Promise<Calculation[]> {
		return this.calculationRepository.find();
	}
}
