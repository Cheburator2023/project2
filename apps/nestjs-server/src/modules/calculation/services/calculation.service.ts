import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Calculation } from "../entities/calculation.entity";

@Injectable()
export class CalculationService {
	constructor(
		@InjectRepository(Calculation)
		private calculationRepository: Repository<Calculation>,
	) {}

	async create(calculationData: Partial<Calculation>): Promise<Calculation> {
		const calculation = this.calculationRepository.create(calculationData);
		return this.calculationRepository.save(calculation);
	}

	async findAll(): Promise<Calculation[]> {
		return this.calculationRepository.find();
	}
}
