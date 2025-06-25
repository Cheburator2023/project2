import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsNotEmpty, IsNumber, ValidateNested } from "class-validator";
import { QuestionnaireDataDto } from "./questionnaire-data.dto";

export class CreateCalculationDto {
	@ApiProperty({
		type: QuestionnaireDataDto,
		description: "Данные анкеты (структурированный объект)",
	})
	@ValidateNested({ message: "questionnaireData must be a valid object" })
	@Type(() => QuestionnaireDataDto)
	@IsNotEmpty({ message: "questionnaireData should not be empty" })
	questionnaireData: QuestionnaireDataDto;

	@ApiProperty({
		example: 1.8,
		description: "Финальный коэффициент расчета",
	})
	@IsNumber({}, { message: "finalCoefficient must be a number" })
	@IsNotEmpty({ message: "finalCoefficient should not be empty" })
	finalCoefficient: number;
}
