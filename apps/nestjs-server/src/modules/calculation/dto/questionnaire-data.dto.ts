import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
	IsArray,
	IsNotEmpty,
	IsNumber,
	IsOptional,
	IsString,
	ValidateNested,
} from "class-validator";
import { AlgorithmTypeItemDto } from "./algorithm-type-item.dto";
import { DeploymentChannelDto } from "./deployment-channel.dto";
import { GeneralUncertaintyDto } from "./general-uncertainty.dto";

export class QuestionnaireDataDto {
	@ApiProperty({ example: "Test Calculation", description: "Название расчета" })
	@IsString({ message: "name must be a string" })
	@IsNotEmpty({ message: "name should not be empty" })
	name: string;

	@ApiProperty({
		example: 5,
		description: "Количество моделей (>1 для каскадов и ансамблей моделей)",
	})
	@IsNumber({}, { message: "modelsCount must be a number" })
	@IsNotEmpty({ message: "modelsCount should not be empty" })
	modelsCount: number;

	@ApiProperty({
		example: "1 Сложность: ...",
		description: "Сложность настройки",
	})
	@IsString({ message: "setupComplexity must be a string" })
	@IsNotEmpty({ message: "setupComplexity should not be empty" })
	setupComplexity: string;

	@ApiProperty({
		example: "4-10 мес.",
		description: "Срок реализации инициативы",
	})
	@IsString({ message: "initiativeTimeline must be a string" })
	@IsNotEmpty({ message: "initiativeTimeline should not be empty" })
	initiativeTimeline: string;

	@ApiProperty({
		example: "45.3-438 млн.",
		description: "Стоимость инициативы",
	})
	@IsString({ message: "initiativeCost must be a string" })
	@IsNotEmpty({ message: "initiativeCost should not be empty" })
	initiativeCost: string;

	@ApiProperty({
		type: GeneralUncertaintyDto,
		description: "Факторы общей неопределенности",
	})
	@ValidateNested({ message: "generalUncertainty must be a valid object" })
	@Type(() => GeneralUncertaintyDto)
	generalUncertainty: GeneralUncertaintyDto;

	@ApiProperty({
		example: "Да",
		description: "Наличие готовых промоделированных отчетов",
	})
	@IsString({ message: "readyPromReports must be a string" })
	@IsNotEmpty({ message: "readyPromReports should not be empty" })
	readyPromReports: string;

	@ApiProperty({
		example: "3",
		required: false,
		description: "Количество оцененных инициатив",
	})
	@IsOptional()
	@IsString({ message: "assessedInitiativesCount must be a string" })
	assessedInitiativesCount?: string;

	@ApiProperty({ example: "5", description: "Количество источников данных" })
	@IsString({ message: "dataSourcesCount must be a string" })
	@IsNotEmpty({ message: "dataSourcesCount should not be empty" })
	dataSourcesCount: string;

	@ApiProperty({ example: "Да", description: "Требуется ли пилотная модель" })
	@IsString({ message: "pilotModelRequired must be a string" })
	@IsNotEmpty({ message: "pilotModelRequired should not be empty" })
	pilotModelRequired: string;

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

	@ApiProperty({ example: "Да", description: "Требуется ли поддержка пилота" })
	@IsString({ message: "pilotSupportRequired must be a string" })
	@IsNotEmpty({ message: "pilotSupportRequired should not be empty" })
	pilotSupportRequired: string;

	@ApiProperty({ example: "Не требуется", description: "Требуется ли AutoML" })
	@IsString({ message: "autoMlRequired must be a string" })
	@IsNotEmpty({ message: "autoMlRequired should not be empty" })
	autoMlRequired: string;

	@ApiProperty({
		example: "2",
		description: "Дополнительные отчеты для продакшена",
	})
	@IsString({ message: "productionAdditionalReports must be a string" })
	@IsNotEmpty({ message: "productionAdditionalReports should not be empty" })
	productionAdditionalReports: string;

	@ApiProperty({
		type: [DeploymentChannelDto],
		description: "Каналы развертывания в продакшен",
	})
	@IsArray({ message: "productionDeploymentChannels must be an array" })
	@ValidateNested({
		each: true,
		message: "Each productionDeploymentChannel item must be a valid object",
	})
	@Type(() => DeploymentChannelDto)
	productionDeploymentChannels: DeploymentChannelDto[];
}
