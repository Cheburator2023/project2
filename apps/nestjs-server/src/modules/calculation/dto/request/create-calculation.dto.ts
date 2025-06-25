import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
	IsArray,
	IsIn,
	IsNotEmpty,
	IsNumber,
	IsOptional,
	IsString,
	Max,
	Min,
	ValidateNested,
} from "class-validator";
import { CalculationBaseDto } from "../base/calculation-base.dto";
import {
	DATA_SOURCES_COUNT_VALUES,
	DEPLOYMENT_CHANNEL_VALUES,
	YES_NO_REQUIRED_VALUES,
	YES_NO_VALUES,
} from "../base/calculation-base.dto";
import { AlgorithmTypeItemDto } from "../common/algorithm-type.dto";
import { UncertaintyItemDto } from "../common/uncertainty-item.dto";

export class CreateCalculationDto extends CalculationBaseDto {
	@ApiProperty({
		example: 2,
		description: "Количество моделей (>1 для каскадов и ансамблей моделей)",
		minimum: 1,
		maximum: 99,
	})
	@IsNumber({}, { message: "modelsCount must be a number" })
	@Min(1, { message: "modelsCount must not be less than 1" })
	@Max(99, { message: "modelsCount must not be greater than 99" })
	@IsNotEmpty({ message: "modelsCount should not be empty" })
	modelsCount: number;

	@ApiProperty({
		example: 3,
		description: "Корректировка неопределенности",
	})
	@IsNumber({}, { message: "uncertaintyAdjustment must be a number" })
	@IsOptional()
	uncertaintyAdjustment?: number;

	@ApiProperty({
		type: [UncertaintyItemDto],
		description: "Факторы общей неопределенности",
	})
	@IsArray({ message: "generalUncertainty must be an array" })
	@ValidateNested({ each: true })
	@Type(() => UncertaintyItemDto)
	generalUncertainty: UncertaintyItemDto[];

	@ApiProperty({
		example: "Нет",
		description: "Наличие готовых промоделированных отчетов",
		enum: YES_NO_VALUES,
	})
	@IsString({ message: "readyPromReports must be a string" })
	@IsNotEmpty({ message: "readyPromReports should not be empty" })
	@IsIn(YES_NO_VALUES, {
		message: "readyPromReports must be one of the allowed values",
	})
	readyPromReports: (typeof YES_NO_VALUES)[number];

	@ApiProperty({
		example: 3,
		description: "Количество оцененных инициатив",
	})
	@IsNumber({}, { message: "assessedInitiativesCount must be a number" })
	@IsOptional()
	assessedInitiativesCount?: number;

	@ApiProperty({
		example: "4",
		description: "Количество источников данных",
		enum: DATA_SOURCES_COUNT_VALUES,
	})
	@IsString({ message: "dataSourcesCount must be a string" })
	@IsNotEmpty({ message: "dataSourcesCount should not be empty" })
	@IsIn(DATA_SOURCES_COUNT_VALUES, {
		message: "dataSourcesCount must be one of the allowed values",
	})
	dataSourcesCount: (typeof DATA_SOURCES_COUNT_VALUES)[number];

	@ApiProperty({
		example: "Да",
		description: "Требуется ли пилотная модель",
		enum: YES_NO_REQUIRED_VALUES,
	})
	@IsString({ message: "pilotModelRequired must be a string" })
	@IsNotEmpty({ message: "pilotModelRequired should not be empty" })
	@IsIn(YES_NO_REQUIRED_VALUES, {
		message: "pilotModelRequired must be one of the allowed values",
	})
	pilotModelRequired: (typeof YES_NO_REQUIRED_VALUES)[number];

	@ApiProperty({
		type: [AlgorithmTypeItemDto],
		description: "Сложность алгоритмов",
	})
	@IsArray({ message: "algorithmComplexity must be an array" })
	@ValidateNested({
		each: true,
		message: "Each algorithmComplexity item must be a valid object",
	})
	@Type(() => AlgorithmTypeItemDto)
	algorithmComplexity: AlgorithmTypeItemDto[];

	@ApiProperty({
		example: "Да",
		description: "Требуется ли поддержка пилота",
		enum: YES_NO_REQUIRED_VALUES,
	})
	@IsString({ message: "pilotSupportRequired must be a string" })
	@IsNotEmpty({ message: "pilotSupportRequired should not be empty" })
	@IsIn(YES_NO_REQUIRED_VALUES, {
		message: "pilotSupportRequired must be one of the allowed values",
	})
	pilotSupportRequired: (typeof YES_NO_REQUIRED_VALUES)[number];

	@ApiProperty({
		example: "Да",
		description: "Требуется ли AutoML",
		enum: YES_NO_REQUIRED_VALUES,
	})
	@IsString({ message: "autoMlRequired must be a string" })
	@IsNotEmpty({ message: "autoMlRequired should not be empty" })
	@IsIn(YES_NO_REQUIRED_VALUES, {
		message: "autoMlRequired must be one of the allowed values",
	})
	autoMlRequired: (typeof YES_NO_REQUIRED_VALUES)[number];

	@ApiProperty({
		example: 4,
		description: "Дополнительные отчеты для продакшена",
	})
	@IsNumber({}, { message: "productionAdditionalReports must be a number" })
	@IsNotEmpty({ message: "productionAdditionalReports should not be empty" })
	productionAdditionalReports: number;

	@ApiProperty({
		type: [String],
		description: "Каналы развертывания в продакшен",
		example: ["Батч", "Батч+загрузка данных потребителю", "Батч + Онлайн"],
		enum: DEPLOYMENT_CHANNEL_VALUES,
	})
	@IsArray({ message: "productionDeploymentChannels must be an array" })
	@IsString({ each: true, message: "Each deployment channel must be a string" })
	@IsIn(DEPLOYMENT_CHANNEL_VALUES, {
		each: true,
		message: "Each deployment channel must be one of the allowed values",
	})
	productionDeploymentChannels: (typeof DEPLOYMENT_CHANNEL_VALUES)[number][];

	@ApiProperty({
		example: 1.8,
		description: "Финальный коэффициент расчета",
	})
	@IsNumber({}, { message: "finalCoefficient must be a number" })
	@IsNotEmpty({ message: "finalCoefficient should not be empty" })
	finalCoefficient: number;
}
