import { ApiProperty } from "@nestjs/swagger";
import { ReferenceDataDto } from "./reference-data.dto";

export class DictionaryItemDto {
	@ApiProperty({ example: 1, description: "Значение опции" })
	value: any;

	@ApiProperty({
		example: "Уровень 1",
		description: "Отображаемое название",
		required: false,
	})
	label?: string;

	@ApiProperty({
		example: 1.0,
		description: "Коэффициент для значения",
		required: false,
	})
	coefficient?: number;

	@ApiProperty({
		example:
			"Проведение регулярной валидации Моделей Регулятором не установлено",
		description: "Подсказка для значения",
		required: false,
	})
	hint?: string;

	@ApiProperty({
		example: "1 + (value - 1) * 0.75",
		description: "Формула расчета",
		required: false,
	})
	formula?: string;

	@ApiProperty({
		type: "array",
		items: { type: "object" },
		description: "Условия применения коэффициента",
		required: false,
	})
	conditions?: any[];
}

export class StreamAverageDto {
	@ApiProperty({
		example: 15.5,
		description: 'Среднее значение для этапа "01. Постановка задачи"'
	})
	'01. Постановка задачи': number;

	@ApiProperty({
		example: 20.0,
		description: 'Среднее значение для этапа "02. Поиск данных"'
	})
	'02. Поиск данных': number;

	@ApiProperty({
		example: 25.0,
		description:
			'Среднее значение для этапа "03. Построение витрины для разработки"'
	})
	'03. Построение витрины для разработки': number;

	@ApiProperty({
		example: 40.0,
		description:
			'Среднее значение для этапа "05А. Разработка пилотной модели (MVP)"'
	})
	'05А. Разработка пилотной модели (MVP)': number;

	@ApiProperty({
		example: 37.0,
		description: 'Среднее значение для этапа "05. Разработка модели"'
	})
	'05. Разработка модели': number;

	@ApiProperty({
		example: 68.0,
		description: 'Среднее значение для этапа "AML Разработка"'
	})
	'AML Разработка': number;

	@ApiProperty({
		example: 34.0,
		description: 'Среднее значение для этапа "05В. Пилотирование модели"'
	})
	'05В. Пилотирование модели': number;

	@ApiProperty({
		example: 56.0,
		description:
			'Среднее значение для этапа "07. Разработка витрины для применения модели"'
	})
	'07. Разработка витрины для применения модели': number;

	@ApiProperty({
		example: 50.0,
		description:
			'Среднее значение для этапа "09. Адаптация и внедрение модели"'
	})
	'09. Адаптация и внедрение модели': number;

	@ApiProperty({
		example: 68.0,
		description: 'Среднее значение для этапа "AML Внедрение"'
	})
	'AML Внедрение': number;
}

export class QuestionnaireResponseDto {
	@ApiProperty({ example: "1.0.0", description: "Версия анкеты" })
	version: string;

	@ApiProperty({
		example: "2025-07-01T14:30:00Z",
		description: "Дата последнего обновления",
	})
	lastUpdated: string;

	@ApiProperty({
		example: "system",
		description: "Автор последних изменений",
		required: false,
	})
	author?: string;

	@ApiProperty({
		type: "object",
		additionalProperties: {
			type: "array",
			items: { $ref: "#/components/schemas/DictionaryItemDto" },
		},
		description: "Справочники значений",
	})
	dictionaries: Record<string, DictionaryItemDto[]>;

	@ApiProperty({
		type: StreamAverageDto,
		description: "Средние значения по этапам",
	})
	streamAverages: StreamAverageDto;

	@ApiProperty({
		type: ReferenceDataDto,
		description:
			"Справочные данные (Стрим-исполнитель и Департамент заказчика)",
	})
	referenceData: ReferenceDataDto;
}
