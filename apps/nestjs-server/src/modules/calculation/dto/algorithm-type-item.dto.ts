import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class AlgorithmTypeItemDto {
	@ApiProperty({
		example: "Текстовая аналитика_LLM",
		description:
			"Тип используемого алгоритма (выбирается из фиксированного списка)",
		enum: [
			"Табличные данные",
			"Текстовая аналитика_Классические модели",
			"Текстовая аналитика_LLM",
			"Аудио Аналитика",
			"Компьютерное зрение_CV",
			"Оптимизационная задача",
			"Гео-аналитика",
			"Графовая аналитика",
		],
	})
	@IsString({ message: "algorithmType must be a string" })
	@IsNotEmpty({ message: "algorithmType should not be empty" })
	algorithmType: string;
}
