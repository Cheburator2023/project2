import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsNotEmpty, IsOptional, IsString } from "class-validator";

// Enum values for reusability
export const SETUP_COMPLEXITY_VALUES = [
	"1 Сложность: Проведение регулярной валидации Моделей Регулятором не установлено",
	"2 Сложность: Проведение регулярной валидации Моделей Регулятором не установлено. Модель оценки риска",
	"3 Сложность: Проведение регулярной валидации Моделей Регулятором нормативно не установлено. Заказчик запрашивает проведение первичной валидации модели",
	"4 Сложность: Банком не планируется предоставление Модели регулятору для одобрения к использованию,но проведение регулярной валидации Моделей установлена Регулятором",
	"5 Сложность: Банком планируется предоставление Модели Регулятору для одобрения к использованию",
] as const;

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
	"0",
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

export const UNCERTAINTY_TYPE_NAMES = {
	businessProcessComplexity:
		"Изменение, недостаточная проработка или сложности бизнес-процессов Банка",
	projectSolutionDefects:
		"Наличие дефектов во внедряемом решении/ПО в рамках проекта",
	adjacentProjectsImpact:
		"Негативное влияние смежных проектов на показатели проекта",
	planningRequirementGaps:
		"Увеличение трудозатрат проекта по причине недостаточной проработки требований на этапе планирования проекта",
	contractorPerformanceIssues:
		"Недобросовестное исполнение услуг со стороны привлеченных контрагентов/подрядчиков",
	qualifiedStaffShortage:
		"Отсутствие квалифицированного персонала или ошибок персонала",
	sanctionsRisk: "Введение санкционных мер и других ограничений",
	controlProceduresGaps: "Недостаток или отсутствие контрольных процедур",
	regulatoryChanges: "Изменение регуляторных требований",
	systemUnderutilization: "Неиспользование ИС после завершения проекта",
	itArchitectureChanges: "Изменение целевой ИТ архитектуры Банка",
};

// Base DTO with common fields
export class CalculationBaseDto {
	@ApiProperty({
		example: "Оценка проекта для бизнеса",
		description: "Название анкеты",
	})
	@IsString({ message: "name must be a string" })
	@IsNotEmpty({ message: "name should not be empty" })
	name: string;

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
	@IsIn(INITIATIVE_TIMELINE_VALUES)
	@IsOptional()
	initiativeTimeline: (typeof INITIATIVE_TIMELINE_VALUES)[number];

	@ApiProperty({
		example: "45.3-438 млн.",
		description: "Стоимость инициативы",
		enum: INITIATIVE_COST_VALUES,
		required: false,
		nullable: true,
	})
	@IsString({ message: "initiativeCost must be a string" })
	@IsIn(INITIATIVE_COST_VALUES)
	@IsOptional()
	initiativeCost: (typeof INITIATIVE_COST_VALUES)[number];
}
