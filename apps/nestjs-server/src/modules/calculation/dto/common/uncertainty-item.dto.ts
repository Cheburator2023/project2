import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsNotEmpty, IsString } from "class-validator";
import {
    INFLUENCE_VALUES,
    PROBABILITY_VALUES,
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
        example: "Незначительное влияние на вторичные функции в рамках проектной деятельности",
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