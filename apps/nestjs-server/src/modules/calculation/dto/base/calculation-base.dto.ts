import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

// Enum values for reusability
export const INITIATIVE_TIMELINE_VALUES = [
	"Менее 1 мес.",
	"1-4 мес.",
	"4-10 мес.",
	"10-18 мес.",
	"Более 18 мес.",
] as const;

export const INITIATIVE_COST_VALUES = [
	"До 45.3 млн.",
	"45.3-438 млн.",
	"438-870 млн.",
	"870 млн. - 2 млрд.",
	"От 2 млрд.",
] as const;

export const PROBABILITY_VALUES = [
	"Не применимо",
	"Реализация не чаще 1 раза в 10 лет",
	"Реализация 1 раз в 3-10 лет",
	"Реализация 1 раз в 1-3 года",
	"Реализация 1 раз в год",
	"Реализация 1 раз в 6 мес. или чаще",
] as const;

export const INFLUENCE_VALUES = [
	"Незначительное влияние на вторичные функции в рамках проектной деятельности",
	"Незначительное влияние на задачи и сроки достижения целей проекта",
	"Реализация проекта с контролируемыми отклонениями от изначальных целей",
	"Значительный негативный эффект на возможность достижения целей проекта",
	"Критичное отклонение качества реализации проекта",
] as const;

export const SIMPLE_INFLUENCE_VALUES = [
	"Незначительное",
	"Существенное",
	"Критичное",
] as const;

export const YES_NO_VALUES = ["Да", "Нет"] as const;
export const YES_NO_REQUIRED_VALUES = ["Да", "Не требуется"] as const;

export const ALGORITHM_TYPE_VALUES = [
	"Табличные данные",
	"Текстовая аналитика_Классические модели",
	"Текстовая аналитика_LLM",
	"Аудио Аналитика",
	"Компьютерное зрение_CV",
	"Оптимизационная задача",
	"Гео-аналитика",
	"Графовая аналитика",
] as const;

export const DEPLOYMENT_CHANNEL_VALUES = [
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
] as const;

export const DATA_SOURCES_COUNT_VALUES = [
	"1",
	"2",
	"3",
	"4",
	"5",
	"6",
	"7",
	"8",
	"9",
	"10",
] as const;

export const UNCERTAINTY_TYPE_VALUES = [
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
] as const;

// Base DTO with common fields
export class CalculationBaseDto {
	@ApiProperty({
		example: "Оценка проекта для бизнеса",
		description: "Название расчета",
	})
	@IsString({ message: "name must be a string" })
	@IsNotEmpty({ message: "name should not be empty" })
	name: string;

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
		enum: INITIATIVE_TIMELINE_VALUES,
	})
	@IsString({ message: "initiativeTimeline must be a string" })
	@IsNotEmpty({ message: "initiativeTimeline should not be empty" })
	initiativeTimeline: (typeof INITIATIVE_TIMELINE_VALUES)[number];

	@ApiProperty({
		example: "45.3-438 млн.",
		description: "Стоимость инициативы",
		enum: INITIATIVE_COST_VALUES,
	})
	@IsString({ message: "initiativeCost must be a string" })
	@IsNotEmpty({ message: "initiativeCost should not be empty" })
	initiativeCost: (typeof INITIATIVE_COST_VALUES)[number];
}
