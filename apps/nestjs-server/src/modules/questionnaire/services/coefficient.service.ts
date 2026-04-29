import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { FindOptionsWhere, Repository } from "typeorm";
import { CoefficientEntity } from "../entities/coefficient.entity";

@Injectable()
export class CoefficientService {
	constructor(
		@InjectRepository(CoefficientEntity)
		private readonly repository: Repository<CoefficientEntity>,
	) {}

	async findAll(): Promise<CoefficientEntity[]> {
		return this.repository.find({
			where: { isActive: true } as FindOptionsWhere<CoefficientEntity>,
		});
	}

	async findByCode(code: string): Promise<CoefficientEntity | null> {
		const cleanCode = code.replace(/^"+|"+$/g, "");
		return this.repository.findOne({
			where: {
				code: cleanCode,
				isActive: true,
			} as FindOptionsWhere<CoefficientEntity>,
		});
	}

	async getCoefficientValue(code: string, inputValue?: any): Promise<number> {
		const cleanCode = code.replace(/^"+|"+$/g, "");
		const coefficient = await this.findByCode(cleanCode);

		if (!coefficient) {
			throw new NotFoundException(
				`Coefficient with code ${cleanCode} not found`,
			);
		}

		if (coefficient.conditions) {
			if (coefficient.conditions.default && !inputValue) {
				return coefficient.conditions.default;
			}

			if (inputValue && coefficient.conditions[inputValue] !== undefined) {
				return coefficient.conditions[inputValue];
			}

			if (coefficient.conditions.formula) {
				try {
					const value = Number.parseFloat(inputValue) || 0;
					const formula = coefficient.conditions.formula.replace(
						"value",
						value.toString(),
					);

					// biome-ignore lint/security/noGlobalEval: формула коэффициента хранится в БД, eval необходим для её вычисления
					return eval(formula);
				} catch {
					return coefficient.baseValue;
				}
			}
		}

		return coefficient.baseValue;
	}
}
