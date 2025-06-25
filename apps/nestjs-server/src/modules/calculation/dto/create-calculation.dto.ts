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
		description: "Вероятность возникновения риска",
		enum: [
			"Не применимо",
			"Реализация не чаще 1 раза в 10 лет",
			"Реализация 1 раз в 3-10 лет",
			"Реализация 1 раз в 1-3 года",
			"Реализация 1 раз в год",
			"Реализация 1 раз в 6 мес. или чаще",
		],
	})
	@IsString({ message: "probability must be a string" })
	@IsNotEmpty({ message: "probability should not be empty" })
	probability: string;

	@ApiProperty({
		example:
			"Реализация проекта с контролируемыми отклонениями от изначальных целей",
		description: "Влияние риска на проект",
		enum: [
			"Незначительное влияние на вторичные функции в рамках проектной деятельности",
			"Незначительное влияние на задачи и сроки достижения целей проекта",
			"Реализация проекта с контролируемыми отклонениями от изначальных целей",
			"Значительный негативный эффект на возможность достижения целей проекта",
			"Критичное отклонение качества реализации проекта",
		],
	})
	@IsString({ message: "influence must be a string" })
	@IsNotEmpty({ message: "influence should not be empty" })
	influence: string;
}

class GeneralUncertaintyDto {
	@ApiProperty({
		type: ProbabilityInfluencePairDto,
		description: "Сложность бизнес-процессов",
	})
	@ValidateNested()
	@Type(() => ProbabilityInfluencePairDto)
	businessProcessComplexity: ProbabilityInfluencePairDto;

	@ApiProperty({
		type: ProbabilityInfluencePairDto,
		description: "Дефекты проектного решения",
	})
	@ValidateNested()
	@Type(() => ProbabilityInfluencePairDto)
	projectSolutionDefects: ProbabilityInfluencePairDto;

	@ApiProperty({
		type: ProbabilityInfluencePairDto,
		description: "Влияние смежных проектов",
	})
	@ValidateNested()
	@Type(() => ProbabilityInfluencePairDto)
	adjacentProjectsImpact: ProbabilityInfluencePairDto;

	@ApiProperty({
		type: ProbabilityInfluencePairDto,
		description: "Пробелы в планировании требований",
	})
	@ValidateNested()
	@Type(() => ProbabilityInfluencePairDto)
	planningRequirementGaps: ProbabilityInfluencePairDto;

	@ApiProperty({
		type: ProbabilityInfluencePairDto,
		description: "Проблемы с исполнением подрядчиками",
	})
	@ValidateNested()
	@Type(() => ProbabilityInfluencePairDto)
	contractorPerformanceIssues: ProbabilityInfluencePairDto;

	@ApiProperty({
		type: ProbabilityInfluencePairDto,
		description: "Нехватка квалифицированного персонала",
	})
	@ValidateNested()
	@Type(() => ProbabilityInfluencePairDto)
	qualifiedStaffShortage: ProbabilityInfluencePairDto;

	@ApiProperty({
		type: ProbabilityInfluencePairDto,
		description: "Риск санкций",
	})
	@ValidateNested()
	@Type(() => ProbabilityInfluencePairDto)
	sanctionsRisk: ProbabilityInfluencePairDto;

	@ApiProperty({
		type: ProbabilityInfluencePairDto,
		description: "Пробелы в контрольных процедурах",
	})
	@ValidateNested()
	@Type(() => ProbabilityInfluencePairDto)
	controlProceduresGaps: ProbabilityInfluencePairDto;

	@ApiProperty({
		type: ProbabilityInfluencePairDto,
		description: "Изменения в регулировании",
	})
	@ValidateNested()
	@Type(() => ProbabilityInfluencePairDto)
	regulatoryChanges: ProbabilityInfluencePairDto;

	@ApiProperty({
		type: ProbabilityInfluencePairDto,
		description: "Недоиспользование системы",
	})
	@ValidateNested()
	@Type(() => ProbabilityInfluencePairDto)
	systemUnderutilization: ProbabilityInfluencePairDto;

	@ApiProperty({
		type: ProbabilityInfluencePairDto,
		description: "Изменения IT-архитектуры",
	})
	@ValidateNested()
	@Type(() => ProbabilityInfluencePairDto)
	itArchitectureChanges: ProbabilityInfluencePairDto;
}

class AlgorithmTypeItemDto {
	@ApiProperty({
		example: "Текстовая аналитика_LLM",
		description: "Тип используемого алгоритма",
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

class DeploymentChannelDto {
	@ApiProperty({
		example: "Батч + Онлайн",
		description: "Канал развертывания модели",
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
	@IsString({ message: "deploymentChannel must be a string" })
	@IsNotEmpty({ message: "deploymentChannel should not be empty" })
	deploymentChannel: string;
}

class UncertaintyItemDto {
	@ApiProperty({
		example: "planningRequirementGaps",
		description: "Тип фактора неопределенности",
		enum: [
			"businessProcessComplexity",
			"projectSolutionDefects",
			"adjacentProjectsImpact",
			"planningRequirementGaps",
			"contractorPerformanceIssues",
			"qualifiedStaffShortage",
			"sanctionsRisk",
			"controlProceduresGaps",
			"regulatoryChanges",
			"systemUnderutilization",
			"itArchitectureChanges",
		],
	})
	@IsString({ message: "type must be a string" })
	@IsNotEmpty({ message: "type should not be empty" })
	type: string;

	@ApiProperty({
		example: "Реализация не чаще 1 раза в 10 лет",
		description: "Вероятность возникновения риска",
		enum: [
			"Не применимо",
			"Реализация не чаще 1 раза в 10 лет",
			"Реализация 1 раз в 3-10 лет",
			"Реализация 1 раз в 1-3 года",
			"Реализация 1 раз в год",
			"Реализация 1 раз в 6 мес. или чаще",
		],
	})
	@IsString({ message: "probability must be a string" })
	@IsNotEmpty({ message: "probability should not be empty" })
	probability: string;

	@ApiProperty({
		example: "Незначительное",
		description: "Влияние риска на проект",
		enum: ["Незначительное", "Существенное", "Критичное"],
	})
	@IsString({ message: "influence must be a string" })
	@IsNotEmpty({ message: "influence should not be empty" })
	influence: string;
}

export class CreateCalculationDto {
	@ApiProperty({
		example: "Оценка проекта для бизнеса",
		description: "Название расчета",
	})
	@IsString({ message: "name must be a string" })
	@IsNotEmpty({ message: "name should not be empty" })
	name: string;

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
		example:
			"1 Сложность: Проведение регулярной валидации Моделей Регулятором не установлено",
		description: "Сложность настройки",
	})
	@IsString({ message: "setupComplexity must be a string" })
	@IsNotEmpty({ message: "setupComplexity should not be empty" })
	setupComplexity: string;

	@ApiProperty({
		example: "Менее 1 мес.",
		description: "Срок реализации инициативы",
		enum: [
			"Менее 1 мес.",
			"1-4 мес.",
			"4-10 мес.",
			"10-18 мес.",
			"Более 18 мес.",
		],
	})
	@IsString({ message: "initiativeTimeline must be a string" })
	@IsNotEmpty({ message: "initiativeTimeline should not be empty" })
	initiativeTimeline: string;

	@ApiProperty({
		example: "45.3-438 млн.",
		description: "Стоимость инициативы",
		enum: [
			"До 45.3 млн.",
			"45.3-438 млн.",
			"438-870 млн.",
			"870 млн. - 2 млрд.",
			"От 2 млрд.",
		],
	})
	@IsString({ message: "initiativeCost must be a string" })
	@IsNotEmpty({ message: "initiativeCost should not be empty" })
	initiativeCost: string;

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
		enum: ["Да", "Нет"],
	})
	@IsString({ message: "readyPromReports must be a string" })
	@IsNotEmpty({ message: "readyPromReports should not be empty" })
	readyPromReports: string;

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
		enum: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
	})
	@IsString({ message: "dataSourcesCount must be a string" })
	@IsNotEmpty({ message: "dataSourcesCount should not be empty" })
	dataSourcesCount: string;

	@ApiProperty({
		example: "Да",
		description: "Требуется ли пилотная модель",
		enum: ["Да", "Не требуется"],
	})
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

	@ApiProperty({
		example: "Да",
		description: "Требуется ли поддержка пилота",
		enum: ["Да", "Не требуется"],
	})
	@IsString({ message: "pilotSupportRequired must be a string" })
	@IsNotEmpty({ message: "pilotSupportRequired should not be empty" })
	pilotSupportRequired: string;

	@ApiProperty({
		example: "Да",
		description: "Требуется ли AutoML",
		enum: ["Да", "Не требуется"],
	})
	@IsString({ message: "autoMlRequired must be a string" })
	@IsNotEmpty({ message: "autoMlRequired should not be empty" })
	autoMlRequired: string;

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
	})
	@IsArray({ message: "productionDeploymentChannels must be an array" })
	@IsString({ each: true, message: "Each deployment channel must be a string" })
	productionDeploymentChannels: string[];

	@ApiProperty({
		example: 1.8,
		description: "Финальный коэффициент расчета",
	})
	@IsNumber({}, { message: "finalCoefficient must be a number" })
	@IsNotEmpty({ message: "finalCoefficient should not be empty" })
	finalCoefficient: number;
}
