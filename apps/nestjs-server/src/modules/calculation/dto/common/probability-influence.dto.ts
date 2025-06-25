import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsNotEmpty, IsString } from "class-validator";
import {
	INFLUENCE_VALUES,
	PROBABILITY_VALUES,
	SIMPLE_INFLUENCE_VALUES,
} from "../base/calculation-base.dto";

export class ProbabilityInfluencePairDto {
	@ApiProperty({
		example: "Реализация 1 раз в 1-3 года",
		description: "Вероятность возникновения риска",
		enum: PROBABILITY_VALUES,
	})
	@IsString({ message: "probability must be a string" })
	@IsNotEmpty({ message: "probability should not be empty" })
	@IsIn(PROBABILITY_VALUES, {
		message: "probability must be one of the allowed values",
	})
	probability: (typeof PROBABILITY_VALUES)[number];

	@ApiProperty({
		example:
			"Реализация проекта с контролируемыми отклонениями от изначальных целей",
		description: "Влияние риска на проект",
		enum: INFLUENCE_VALUES,
	})
	@IsString({ message: "influence must be a string" })
	@IsNotEmpty({ message: "influence should not be empty" })
	@IsIn(INFLUENCE_VALUES, {
		message: "influence must be one of the allowed values",
	})
	influence: (typeof INFLUENCE_VALUES)[number];
}

export class SimpleProbabilityInfluencePairDto {
	@ApiProperty({
		example: "Реализация 1 раз в 1-3 года",
		description: "Вероятность возникновения риска",
		enum: PROBABILITY_VALUES,
	})
	@IsString({ message: "probability must be a string" })
	@IsNotEmpty({ message: "probability should not be empty" })
	@IsIn(PROBABILITY_VALUES, {
		message: "probability must be one of the allowed values",
	})
	probability: (typeof PROBABILITY_VALUES)[number];

	@ApiProperty({
		example: "Незначительное",
		description: "Влияние риска на проект",
		enum: SIMPLE_INFLUENCE_VALUES,
	})
	@IsString({ message: "influence must be a string" })
	@IsNotEmpty({ message: "influence should not be empty" })
	@IsIn(SIMPLE_INFLUENCE_VALUES, {
		message: "influence must be one of the allowed values",
	})
	influence: (typeof SIMPLE_INFLUENCE_VALUES)[number];
}
