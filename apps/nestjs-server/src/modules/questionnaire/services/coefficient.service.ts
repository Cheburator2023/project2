import { Injectable } from "@nestjs/common";
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
        return this.repository.findOne({
            where: { code, isActive: true } as FindOptionsWhere<CoefficientEntity>,
        });
    }

    async findById(id: string): Promise<CoefficientEntity | null> {
        return this.repository.findOne({
            where: { id, isActive: true } as FindOptionsWhere<CoefficientEntity>,
        });
    }

    async getCoefficientValue(code: string, inputValue?: any): Promise<number> {
        const coefficient = await this.findByCode(code);
        if (!coefficient) {
            throw new Error(`Coefficient with code ${code} not found`);
        }

        // Apply conditions if they exist
        if (coefficient.conditions) {
            if (coefficient.conditions.default && !inputValue) {
                return coefficient.conditions.default;
            }

            if (coefficient.conditions[inputValue]) {
                return coefficient.conditions[inputValue];
            }

            if (coefficient.conditions.formula) {
                // Implement formula evaluation (simplified example)
                const formula = coefficient.conditions.formula
                    .replace('value', inputValue);
                return eval(formula); // Note: In production, use a safer formula evaluator
            }
        }

        return coefficient.baseValue;
    }
}