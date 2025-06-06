import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
	IsArray,
	IsNotEmpty,
	IsNumber,
	IsOptional,
	IsString,
	Max,
	Min,
	ValidateNested,
} from "class-validator";

class ProbabilityInfluencePairDto {
	@ApiProperty({
		example: "Реализация 1 раз в 1-3 года",
		enum: [
			"Не применимо",
			"Реализация не чаще 1 раза в 10 лет",
			"Реализация 1 раз в 3-10 лет",
			"Реализация 1 раз в 1-3 года",
			"Реализация 1 раз в год",
			"Реализация 1 раз в 6 мес. или чаще",
		],
	})
	@IsString()
	@IsNotEmpty()
	probability: string;

	@ApiProperty({
		example:
			"Реализация проекта с контролируемыми отклонениями от изначальных целей",
		enum: [
			"Незначительное влияние на вторичные функции в рамках проектной деятельности",
			"Незначительное влияние на задачи и сроки достижения целей проекта",
			"Реализация проекта с контролируемыми отклонениями от изначальных целей",
			"Значительный негативный эффект на возможность достижения целей проекта",
			"Критичное отклонение качества реализации проекта",
		],
	})
	@IsString()
	@IsNotEmpty()
	influence: string;
}

class AlgorithmTypeItemDto {
	@ApiProperty({
		example: "Текстовая аналитика_LLM",
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
	@IsString()
	@IsNotEmpty()
	algorithmType: string;
}

class DeploymentChannelDto {
	@ApiProperty({
		example: "Батч + Онлайн",
		enum: [
			"Батч",
			"Батч+загрузка данных потребителю",
			"Батч + Онлайн",
			"Онлайн",
			"Онлайн gpu",
			"Стриминг",
			"Мобильные устройства",
			"LLM",
			"Гео-сервисы",
			"Внедрение в облаке",
			"Графовая платформа",
		],
	})
	@IsString()
	@IsNotEmpty()
	deploymentChannel: string;
}

class GeneralUncertaintyDto {
	@ApiProperty({ type: ProbabilityInfluencePairDto })
	@ValidateNested()
	@Type(() => ProbabilityInfluencePairDto)
	businessProcessComplexity: ProbabilityInfluencePairDto;

	@ApiProperty({ type: ProbabilityInfluencePairDto })
	@ValidateNested()
	@Type(() => ProbabilityInfluencePairDto)
	projectSolutionDefects: ProbabilityInfluencePairDto;

	@ApiProperty({ type: ProbabilityInfluencePairDto })
	@ValidateNested()
	@Type(() => ProbabilityInfluencePairDto)
	adjacentProjectsImpact: ProbabilityInfluencePairDto;

	@ApiProperty({ type: ProbabilityInfluencePairDto })
	@ValidateNested()
	@Type(() => ProbabilityInfluencePairDto)
	planningRequirementGaps: ProbabilityInfluencePairDto;

	@ApiProperty({ type: ProbabilityInfluencePairDto })
	@ValidateNested()
	@Type(() => ProbabilityInfluencePairDto)
	contractorPerformanceIssues: ProbabilityInfluencePairDto;

	@ApiProperty({ type: ProbabilityInfluencePairDto })
	@ValidateNested()
	@Type(() => ProbabilityInfluencePairDto)
	qualifiedStaffShortage: ProbabilityInfluencePairDto;

	@ApiProperty({ type: ProbabilityInfluencePairDto })
	@ValidateNested()
	@Type(() => ProbabilityInfluencePairDto)
	sanctionsRisk: ProbabilityInfluencePairDto;

	@ApiProperty({ type: ProbabilityInfluencePairDto })
	@ValidateNested()
	@Type(() => ProbabilityInfluencePairDto)
	controlProceduresGaps: ProbabilityInfluencePairDto;

	@ApiProperty({ type: ProbabilityInfluencePairDto })
	@ValidateNested()
	@Type(() => ProbabilityInfluencePairDto)
	regulatoryChanges: ProbabilityInfluencePairDto;

	@ApiProperty({ type: ProbabilityInfluencePairDto })
	@ValidateNested()
	@Type(() => ProbabilityInfluencePairDto)
	systemUnderutilization: ProbabilityInfluencePairDto;

	@ApiProperty({ type: ProbabilityInfluencePairDto })
	@ValidateNested()
	@Type(() => ProbabilityInfluencePairDto)
	itArchitectureChanges: ProbabilityInfluencePairDto;
}

export class CreateCalculationDto {
	@ApiProperty({
		example: "Оценка проекта для бизнеса",
		description: "Название расчета",
	})
	@IsString()
	@IsNotEmpty()
	name: string;

	@ApiProperty({
		example: 5,
		minimum: 1,
		maximum: 99,
		description: "> 1 для каскадов и ансамблей моделей",
	})
	@IsNumber()
	@Min(1)
	@Max(99)
	@IsNotEmpty()
	modelsCount: number;

	@ApiProperty({
		example: 3,
		enum: [1, 2, 3, 4, 5],
		description:
			"Проведение регулярной валидации Моделей Регулятором нормативно не установлено.",
	})
	@IsNumber()
	@IsNotEmpty()
	setupComplexity: number;

	@ApiProperty({
		example: "4-10 мес.",
		enum: [
			"Менее 1 мес.",
			"1-4 мес.",
			"4-10 мес.",
			"10-18 мес.",
			"Более 18 мес.",
		],
	})
	@IsString()
	@IsNotEmpty()
	initiativeTimeline: string;

	@ApiProperty({
		example: "45.3-438 млн.",
		enum: [
			"До 45.3 млн.",
			"45.3-438 млн.",
			"438-870 млн.",
			"870 млн. - 2 млрд.",
			"От 2 млрд.",
		],
	})
	@IsString()
	@IsNotEmpty()
	initiativeCost: string;

	@ApiProperty({ type: GeneralUncertaintyDto })
	@ValidateNested()
	@Type(() => GeneralUncertaintyDto)
	generalUncertainty: GeneralUncertaintyDto;

	@ApiProperty({
		example: "Да",
		enum: ["Да", "Нет"],
	})
	@IsString()
	@IsNotEmpty()
	readyPromReports: string;

	@ApiProperty({
		example: "3",
		enum: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
		required: false,
	})
	@IsString()
	@IsOptional()
	assessedInitiativesCount?: string;

	@ApiProperty({
		example: "5",
		enum: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
	})
	@IsString()
	@IsNotEmpty()
	dataSourcesCount: string;

	@ApiProperty({
		example: "Да",
		enum: ["Да", "Не требуется"],
	})
	@IsString()
	@IsNotEmpty()
	pilotModelRequired: string;

	@ApiProperty({
		type: [AlgorithmTypeItemDto],
		example: [{ algorithmType: "Текстовая аналитика_LLM" }],
	})
	@IsArray()
	@ValidateNested({ each: true })
	@Type(() => AlgorithmTypeItemDto)
	algorithmComplexity: AlgorithmTypeItemDto[];

	@ApiProperty({
		example: "Да",
		enum: ["Да", "Не требуется"],
	})
	@IsString()
	@IsNotEmpty()
	pilotSupportRequired: string;

	@ApiProperty({
		example: "Не требуется",
		enum: ["Да", "Не требуется"],
	})
	@IsString()
	@IsNotEmpty()
	autoMlRequired: string;

	@ApiProperty({
		example: "2",
		enum: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
	})
	@IsString()
	@IsNotEmpty()
	productionAdditionalReports: string;

	@ApiProperty({
		type: [DeploymentChannelDto],
		example: [{ deploymentChannel: "Батч + Онлайн" }],
	})
	@IsArray()
	@ValidateNested({ each: true })
	@Type(() => DeploymentChannelDto)
	productionDeploymentChannels: DeploymentChannelDto[];

	@ApiProperty({
		example: 1.8,
		description: "Финальный коэффициент расчета",
	})
	@IsNumber()
	@IsNotEmpty()
	finalCoefficient: number;
}
