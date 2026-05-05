import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsNotEmpty, IsOptional, IsString } from "class-validator";

import {
	ALGORITHM_TYPE_VALUES,
	DATA_SOURCES_COUNT_VALUES,
	DEPLOYMENT_CHANNEL_VALUES,
	INITIATIVE_COST_VALUES,
	INITIATIVE_TIMELINE_VALUES,
	INFLUENCE_VALUES,
	PROBABILITY_VALUES,
	SETUP_COMPLEXITY_VALUES,
	UNCERTAINTY_TYPE_NAMES,
	UNCERTAINTY_TYPE_VALUES,
	YES_NO_REQUIRED_VALUES,
	YES_NO_VALUES,
} from "@smart-anketa/api-contract";

export {
	ALGORITHM_TYPE_VALUES,
	DATA_SOURCES_COUNT_VALUES,
	DEPLOYMENT_CHANNEL_VALUES,
	INITIATIVE_COST_VALUES,
	INITIATIVE_TIMELINE_VALUES,
	INFLUENCE_VALUES,
	PROBABILITY_VALUES,
	SETUP_COMPLEXITY_VALUES,
	UNCERTAINTY_TYPE_NAMES,
	UNCERTAINTY_TYPE_VALUES,
	YES_NO_REQUIRED_VALUES,
	YES_NO_VALUES,
} from "@smart-anketa/api-contract";

// Base DTO with common fields
export class CalculationBaseDto {
	@ApiProperty({
		example: "Оценка проекта для бизнеса",
		description: "Название анкеты",
	})
	@IsString({ message: "name must be a string" })
	@IsNotEmpty({ message: "name should not be empty" })
	calcName: string;

	@ApiProperty({
		example:
			"1 Сложность: Проведение регулярной валидации Моделей Регулятором не установлено",
		description: "Сложность настройки",
		enum: SETUP_COMPLEXITY_VALUES,
	})
	@IsString({ message: "setupComplexity must be a string" })
	@IsNotEmpty({ message: "setupComplexity should not be empty" })
	@IsIn(SETUP_COMPLEXITY_VALUES, {
		message: "setupComplexity must be one of the allowed values",
	})
	setupComplexity: (typeof SETUP_COMPLEXITY_VALUES)[number];

	@ApiProperty({
		example: "Менее 1 мес.",
		description: "Срок реализации инициативы",
		enum: INITIATIVE_TIMELINE_VALUES,
		required: false,
		nullable: true,
	})
	@IsString({ message: "initiativeTimeline must be a string" })
	@IsOptional()
	initiativeTimeline?: (typeof INITIATIVE_TIMELINE_VALUES)[number];

	@ApiProperty({
		example: "45.3-438 млн.",
		description: "Стоимость инициативы",
		enum: INITIATIVE_COST_VALUES,
		required: false,
		nullable: true,
	})
	@IsString({ message: "initiativeCost must be a string" })
	@IsOptional()
	initiativeCost?: (typeof INITIATIVE_COST_VALUES)[number];
    
    @ApiProperty({
        example: "Нет",
        description: "Модель разработана",
        enum: YES_NO_VALUES,
        required: false,
    })
    @IsString({ message: "modelDeveloped must be a string" })
    @IsOptional()
    @IsIn(YES_NO_VALUES, {
        message: "modelDeveloped must be one of the allowed values",
    })
    modelDeveloped?: (typeof YES_NO_VALUES)[number];
}
