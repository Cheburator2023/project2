import type { RJSFSchema } from "@rjsf/utils";
import {
	V2_ARCH_COMPONENT_LABELS,
	V2_ARCH_COMPONENT_TYPES,
	type V2ArchComponentType,
} from "@smart-anketa/api-contract";

export const TAB_HEADINGS = [
	["designer", "Конструктор"],
	["json", "Редактор JSON"],
	["logic", "Логика"],
	["preview", "Превью"],
] as const;

export const SCHEMA_TYPE_RU: Record<string, string> = {
	string: "строка",
	number: "число",
	integer: "целое",
	boolean: "да/нет",
	object: "объект",
	array: "массив",
	null: "null",
};

export function ruSchemaTypeLabel(typeLabel: string): string {
	return typeLabel
		.split(" | ")
		.map((t) => SCHEMA_TYPE_RU[t.trim()] ?? t.trim())
		.join(" | ");
}

export type FieldTypePreset = RJSFSchema["type"];

export type PalettePreset = {
	id: string;
	title: string;
	section: "primitive" | "arch";
	chipLabel: string;
	uiOptions?: Record<string, unknown>;
	make: () => RJSFSchema;
};

export const FIELD_PRESETS: PalettePreset[] = [
	{
		id: "string",
		title: "Строка",
		section: "primitive",
		chipLabel: "string",
		make: () => ({ type: "string", title: "Строковое поле" }),
	},
	{
		id: "integer",
		title: "Целое",
		section: "primitive",
		chipLabel: "integer",
		make: () => ({ type: "integer", title: "Число (целое)" }),
	},
	{
		id: "number",
		title: "Число",
		section: "primitive",
		chipLabel: "number",
		make: () => ({ type: "number", title: "Число" }),
	},
	{
		id: "boolean",
		title: "Да / нет",
		section: "primitive",
		chipLabel: "boolean",
		make: () => ({ type: "boolean", title: "Логический" }),
	},
	{
		id: "object",
		title: "Объект (группа)",
		section: "primitive",
		chipLabel: "object",
		make: () => ({
			type: "object",
			title: "Группа полей",
			properties: {},
		}),
	},
	{
		id: "array",
		title: "Массив (список)",
		section: "primitive",
		chipLabel: "array",
		make: () => ({
			type: "array",
			title: "Список",
			items: { type: "object", title: "Элемент", properties: {} },
		}),
	},
];

function archObjectPreset(
	_arch: V2ArchComponentType,
	title: string,
): () => RJSFSchema {
	return () => ({
		type: "object",
		title,
		properties: {
			workType: {
				type: "string",
				title: "Тип работ",
				enum: ["Разработка", "Доработка", "Настройка"],
			},
		},
	});
}

function archArrayPreset(
	_arch: V2ArchComponentType,
	title: string,
	itemTitle: string,
): () => RJSFSchema {
	return () => ({
		type: "array",
		title,
		items: {
			type: "object",
			title: itemTitle,
			properties: {
				name: { type: "string", title: "Наименование" },
			},
		},
	});
}

const ARCH_PRESET_MAKERS: Record<
	V2ArchComponentType,
	{ make: () => RJSFSchema; uiOptions?: Record<string, unknown> }
> = {
	modelService: {
		make: archObjectPreset("modelService", "Модельный сервис"),
		uiOptions: {
			archComponent: "modelService",
			sectionRole: "subsection",
		},
	},
	sourceSystem: {
		make: archArrayPreset(
			"sourceSystem",
			"Системы-источники",
			"Система-источник",
		),
		uiOptions: {
			archComponent: "sourceSystem",
			addable: true,
			removable: true,
			orderable: false,
		},
	},
	dataProcess: {
		make: archObjectPreset("dataProcess", "Процессы обработки данных"),
		uiOptions: {
			archComponent: "dataProcess",
			sectionRole: "subsection",
			showFilledCount: true,
		},
	},
	dataMart: {
		make: archObjectPreset("dataMart", "Объект / Витрина данных"),
		uiOptions: {
			archComponent: "dataMart",
			sectionRole: "subsection",
			showFilledCount: true,
		},
	},
	model: {
		make: archObjectPreset("model", "Модель"),
		uiOptions: {
			archComponent: "model",
			sectionRole: "subsection",
			showFilledCount: true,
		},
	},
	deployChannel: {
		make: () => ({
			type: "array",
			title: "Каналы внедрения",
			items: {
				type: "string",
				enum: [
					"Батч",
					"Батч+загрузка",
					"Батч+Онлайн",
					"Онлайн",
					"Онлайн GPU",
					"Стриминг",
					"Мобильные",
					"LLM",
					"Гео",
					"Облако",
					"Графовая платформа",
				],
			},
			uniqueItems: true,
		}),
		uiOptions: { archComponent: "deployChannel" },
	},
	modelControl: {
		make: () => ({
			type: "object",
			title: "Контроль модели",
			properties: {
				modelClass: {
					type: "string",
					title: "Класс моделей",
					enum: [
						"1",
						"2",
						"3",
						"4",
						"5",
						"6",
						"7",
						"8",
						"9",
					],
				},
				controlTypes: {
					type: "array",
					title: "Виды контроля",
					items: {
						type: "string",
						enum: ["КД", "ТМ", "ОК", "АК", "КМЗ", "ОВ"],
					},
					uniqueItems: true,
				},
			},
		}),
		uiOptions: {
			archComponent: "modelControl",
			sectionRole: "subsection",
		},
	},
};

export const ARCH_COMPONENT_PRESETS: PalettePreset[] = V2_ARCH_COMPONENT_TYPES.map(
	(arch) => ({
		id: `arch:${arch}`,
		title: V2_ARCH_COMPONENT_LABELS[arch],
		section: "arch" as const,
		chipLabel: arch,
		make: ARCH_PRESET_MAKERS[arch].make,
		uiOptions: ARCH_PRESET_MAKERS[arch].uiOptions,
	}),
);

export const PALETTE_PRESETS: PalettePreset[] = [
	...FIELD_PRESETS,
	...ARCH_COMPONENT_PRESETS,
];

/** Шаблоны отображения групп (object) в RJSF — `ui:ObjectFieldTemplate`. */
export const GROUP_OBJECT_FIELD_TEMPLATE_PRESETS: Array<{
	label: string;
	value: string;
}> = [
	{ label: "По умолчанию (стандарт RJSF)", value: "" },
	{
		label: "Карточки секций (V2 превью) — V2PreviewObjectFieldTemplate",
		value: "V2PreviewObjectFieldTemplate",
	},
	{
		label: "Стандартная сетка — RJSFObjectFieldTemplate",
		value: "RJSFObjectFieldTemplate",
	},
];

export const WIDGET_PRESETS: Array<{ label: string; value: string }> = [
	{ label: "По умолчанию (стандарт RJSF)", value: "" },
	{
		label: "Текстовое поле — TextFieldCustomWidget",
		value: "TextFieldCustomWidget",
	},
	{ label: "Число — NumberInputWidget", value: "NumberInputWidget" },
	{ label: "Список — ListWidget", value: "ListWidget" },
	{
		label: "Универсальная зависимость — UniversalDependencyWidget",
		value: "UniversalDependencyWidget",
	},
	{
		label: "Массив карточек — ArrayCustomCardListsWidget",
		value: "ArrayCustomCardListsWidget",
	},
	{
		label: "Неопределённость — GeneralUncertaintyWidget",
		value: "GeneralUncertaintyWidget",
	},
	{
		label: "Сложность алгоритма — AlgorithmComplexityWidget",
		value: "AlgorithmComplexityWidget",
	},
];

export const RULE_KIND_OPTIONS: Array<{ key: string; label: string }> = [
	{ key: "visibility", label: "Видимость" },
	{ key: "required", label: "Обязательность" },
	{ key: "computed", label: "Вычисление" },
	{ key: "row_computed", label: "Вычисление в строке массива" },
	{ key: "validation", label: "Валидация" },
	{ key: "hint", label: "Подсказка" },
	{ key: "task_trigger", label: "Триггер типовых задач" },
];

export const RULE_KIND_LABEL_MAP: Record<string, string> = Object.fromEntries(
	RULE_KIND_OPTIONS.map((o) => [o.key, o.label]),
);

export function ruleKindLabel(kind: string): string {
	return RULE_KIND_LABEL_MAP[kind] ?? kind;
}
