import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { ALGORITHM_TYPE_VALUES } from "../base/calculation-base.dto";

export class AlgorithmTypeItemDto {
	@ApiProperty({
		example: "Текстовая аналитика_LLM",
		description: "Тип используемого алгоритма",
		enum: ALGORITHM_TYPE_VALUES,
	})
	@IsOptional()
	@IsString({ message: "algorithmType must be a string" })
	// @IsNotEmpty({ message: "algorithmType should not be empty" })
	// @IsIn(ALGORITHM_TYPE_VALUES, {
	// 	message: "algorithmType must be one of the allowed values",
	// })
	algorithmType: (typeof ALGORITHM_TYPE_VALUES)[number];
}
