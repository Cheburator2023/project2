import type { RJSFSchema } from "@rjsf/utils";

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

export const FIELD_PRESETS: Array<{
	id: FieldTypePreset;
	title: string;
	make: () => RJSFSchema;
}> = [
	{
		id: "string",
		title: "Строка",
		make: () => ({ type: "string", title: "Строковое поле" }),
	},
	{
		id: "integer",
		title: "Целое",
		make: () => ({ type: "integer", title: "Число (целое)" }),
	},
	{
		id: "number",
		title: "Число",
		make: () => ({ type: "number", title: "Число" }),
	},
	{
		id: "boolean",
		title: "Да / нет",
		make: () => ({ type: "boolean", title: "Логический" }),
	},
	{
		id: "object",
		title: "Объект (группа)",
		make: () => ({
			type: "object",
			title: "Группа полей",
			properties: {},
		}),
	},
];

/** Шаблоны отображения групп (object) в RJSF — `ui:ObjectFieldTemplate`. */
export const GROUP_OBJECT_FIELD_TEMPLATE_PRESETS: Array<{ label: string; value: string }> = [
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
	{ label: "Текстовое поле — TextFieldCustomWidget", value: "TextFieldCustomWidget" },
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
	{ label: "Неопределённость — GeneralUncertaintyWidget", value: "GeneralUncertaintyWidget" },
	{
		label: "Сложность алгоритма — AlgorithmComplexityWidget",
		value: "AlgorithmComplexityWidget",
	},
];

export const RULE_KIND_OPTIONS: Array<{ key: string; label: string }> = [
	{ key: "visibility", label: "Видимость" },
	{ key: "required", label: "Обязательность" },
	{ key: "computed", label: "Вычисление" },
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
