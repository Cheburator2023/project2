import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
	IsOptional,
	IsString,
	IsArray,
	IsObject,
	IsNumber,
	ValidateNested,
} from "class-validator";
import { CalculationResultItemDto } from "../response/calculation-result-item.dto";

export class CreateNewVersionDto {
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
		required: false,
	})
	@IsOptional()
	@IsArray()
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
		description: "Данные опросника",
		required: false,
	})
	@IsOptional()
	@IsObject()
	questionnaireData?: any;

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
