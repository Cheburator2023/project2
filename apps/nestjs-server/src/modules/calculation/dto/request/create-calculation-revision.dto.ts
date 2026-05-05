import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
	IsArray,
	IsNumber,
	IsObject,
	IsOptional,
	IsString,
	ValidateNested,
} from "class-validator";
import { CalculationQuestionnaireDataDto } from "../response/calculation-response.dto";
import { CalculationResultItemDto } from "../response/calculation-result-item.dto";

export class CreateCalculationRevisionDto {
	@ApiProperty({
		example: "Название анкеты",
		description: "Название анкеты",
		required: false,
	})
	@IsOptional()
	@IsString()
	calcName?: string;

	@ApiProperty({
		example: "RFD-001",
		description: "RFD",
		required: false,
	})
	@IsOptional()
	@IsString()
	rfd?: string;

	@ApiProperty({
		example: "Исполнитель",
		description: "Стрим-исполнитель",
		required: false,
	})
	@IsOptional()
	@IsString()
	streamExecutor?: string;

	@ApiProperty({
		example: ["Департамент 1", "Департамент 2"],
		description: "Департамент заказчика",
		type: [String],
		required: false,
	})
	@IsOptional()
	@IsArray()
	@IsString({ each: true })
	department?: string[];

	@ApiProperty({
		example: "Иванов Иван Иванович",
		description: "ФИО заказчика",
		required: false,
	})
	@IsOptional()
	@IsString()
	customerName?: string;

	@ApiProperty({
		example: "Комментарий к анкете",
		description: "Комментарий",
		required: false,
	})
	@IsOptional()
	@IsString()
	comment?: string;

	@ApiProperty({
		type: () => CalculationQuestionnaireDataDto,
		description: "Данные опросника",
		required: false,
	})
	@IsOptional()
	@IsObject()
	@ValidateNested()
	@Type(() => CalculationQuestionnaireDataDto)
	// BUGFIX: revision endpoints must reuse the documented questionnaire contract instead of leaking any into OpenAPI/Orval.
	questionnaireData?: CalculationQuestionnaireDataDto;

	@ApiProperty({
		example: 1.8,
		description: "Финальный коэффициент расчета",
		required: false,
	})
	@IsOptional()
	@IsNumber({}, { message: "finalCoefficient must be a number" })
	finalCoefficient?: number;

	@ApiProperty({
		type: [CalculationResultItemDto],
		description: "Результаты расчета по этапам",
		required: false,
	})
	@IsOptional()
	@IsArray()
	@ValidateNested({ each: true })
	@Type(() => CalculationResultItemDto)
	calculationResult?: CalculationResultItemDto[];

	@ApiProperty({
		example: "Нет",
		description: "Модель разработана",
		required: false,
	})
	@IsOptional()
	@IsString()
	modelDeveloped?: string;
}
