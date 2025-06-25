import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsNotEmpty, IsString } from "class-validator";
import {
	PROBABILITY_VALUES,
	SIMPLE_INFLUENCE_VALUES,
	UNCERTAINTY_TYPE_VALUES,
} from "../base/calculation-base.dto";

export class UncertaintyItemDto {
	@ApiProperty({
		example: "planningRequirementGaps",
		description: "Тип фактора неопределенности",
		enum: UNCERTAINTY_TYPE_VALUES,
	})
	@IsString({ message: "type must be a string" })
	@IsNotEmpty({ message: "type should not be empty" })
	@IsIn(UNCERTAINTY_TYPE_VALUES, {
		message: "type must be one of the allowed values",
	})
	type: (typeof UNCERTAINTY_TYPE_VALUES)[number];

	@ApiProperty({
		example: "Реализация не чаще 1 раза в 10 лет",
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
