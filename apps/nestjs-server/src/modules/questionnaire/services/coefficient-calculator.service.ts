import { Injectable } from "@nestjs/common";

@Injectable()
export class CoefficientCalculatorService {
	calculateModelCountCoefficient(count: number): number {
		return count === 1 ? 1 : 1 + (count - 1) * 0.75;
	}

	calculateComplexityCoefficient(level: number): number {
		const coefficients = [1, 1.25, 1.5, 1.75, 2];
		return coefficients[level - 1] || 1;
	}
}
