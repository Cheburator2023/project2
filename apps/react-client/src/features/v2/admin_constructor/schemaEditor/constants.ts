import type { RJSFSchema } from "@rjsf/utils";
import {
	V2_ARCH_COMPONENT_LABELS,
	V2_ARCH_COMPONENT_TYPES,
	type V2ArchComponentType,
} from "@smart-anketa/api-contract";
import { ARCH_COMPONENT_PRESET_DEFS } from "./archComponentPresets";
import {
	GENERAL_UNCERTAINTY_UI_BRANCH,
	makeGeneralUncertaintyField,
} from "./fieldTypePresets";

/** Цвета чипов арх. компонентов в конструкторе (как в dev-подсветке анкеты). */
/** Подсветка скрытых секций на холсте конструктора. */
export const CANVAS_HIDDEN_CHIP_COLOR = "#64748B";

/** Подсветка системных/readonly-секций (summary, panel, …). */
export const CANVAS_UTILITY_CHIP_COLOR = "#94A3B8";

export const ARCH_COMPONENT_CHIP_COLORS: Record<V2ArchComponentType, string> = {
	modelService: "#7C3AED",
	model: "#2563EB",
	sourceSystem: "#059669",
	dataMart: "#D97706",
	dataProcess: "#0891B2",
	deployChannel: "#DB2777",
	modelControl: "#DC2626",
	typicalWork: "#65A30D",
	atypicalWork: "#CA8A04",
};

/** Не показывать в палитре конструктора (остаются в типах для существующих схем). */
export const PALETTE_HIDDEN_ARCH_COMPONENTS: V2ArchComponentType[] = [
	"deployChannel",
	"modelControl",
	"typicalWork",
	"atypicalWork",
];

export const MAIN_DOCK_PANEL_ID = "designer";

export const SCHEMA_TREE_PANEL_ID = "schema-tree";
export const RELATIONS_PANEL_ID = "relations";
export const CALCULATION_PANEL_ID = "calculation";

/** Все вкладки дока на одном уровне; первая — главная (конструктор). */
export const DOCK_PANEL_HEADINGS = [
	[MAIN_DOCK_PANEL_ID, "Конструктор"],
	["json", "Редактор JSON"],
	["logic", "Логика"],
	["preview", "Превью"],
	[SCHEMA_TREE_PANEL_ID, "Дерево схемы"],
	[RELATIONS_PANEL_ID, "Граф связей"],
	[CALCULATION_PANEL_ID, "Калькуляция"],
] as const;

/** @deprecated Используйте {@link DOCK_PANEL_HEADINGS}. */
export const TAB_HEADINGS = DOCK_PANEL_HEADINGS;

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

export type PaletteSection =
	| "primitive"
	| "layout"
	| "calculation"
	| "arch"
	| "works";

export type PalettePreset = {
	id: string;
	title: string;
	section: PaletteSection;
	chipLabel: string;
	uiOptions?: Record<string, unknown>;
	/** Дочерние ветки uiSchema (например modelsList у arch:model). */
	uiBranch?: Record<string, unknown>;
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
		id: "string-dictionary",
		title: "Строка / справочник",
		section: "primitive",
		chipLabel: "string·справочник",
		make: () => ({ type: "string", title: "Поле справочника" }),
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
		uiOptions: {
			sectionRole: "main",
			defaultExpanded: true,
		},
	},
];

export const LAYOUT_PRESETS: PalettePreset[] = [
	{
		id: "layout",
		title: "Разметка",
		section: "layout",
		chipLabel: "layout",
		make: () => ({
			type: "object",
			title: "Разметка",
			properties: {},
		}),
		uiOptions: {
			layoutGroup: true,
			gridColumns: 2,
			sectionRole: "flat",
		},
	},
];

export const CALCULATION_FIELD_PRESETS: PalettePreset[] = [
	{
		id: "general-uncertainty",
		title: "Расчёт общей неопределённости",
		section: "calculation",
		chipLabel: "неопределённость",
		make: () => makeGeneralUncertaintyField(),
		uiBranch: GENERAL_UNCERTAINTY_UI_BRANCH,
	},
];

/** Число колонок сетки в блоке «Разметка» (md-брейкпоинт, 12 / columns). */
export const LAYOUT_GRID_COLUMN_OPTIONS = [
	{ value: 1, label: "1 колонка (на всю ширину)" },
	{ value: 2, label: "2 колонки" },
	{ value: 3, label: "3 колонки" },
] as const;

export const ARCH_COMPONENT_PRESETS: PalettePreset[] = V2_ARCH_COMPONENT_TYPES.filter(
	(arch) => !PALETTE_HIDDEN_ARCH_COMPONENTS.includes(arch),
).map((arch) => ({
	id: `arch:${arch}`,
	title: V2_ARCH_COMPONENT_LABELS[arch],
	section: "arch" as const,
	chipLabel: arch,
	make: ARCH_COMPONENT_PRESET_DEFS[arch].make,
	uiOptions: ARCH_COMPONENT_PRESET_DEFS[arch].uiOptions,
	uiBranch: ARCH_COMPONENT_PRESET_DEFS[arch].uiBranch,
}));

export const WORK_COMPONENT_PRESETS: PalettePreset[] = (
	["typicalWork", "atypicalWork"] as const
).map((arch) => ({
	id: `work:${arch}`,
	title: V2_ARCH_COMPONENT_LABELS[arch],
	section: "works" as const,
	chipLabel: arch,
	make: ARCH_COMPONENT_PRESET_DEFS[arch].make,
	uiOptions: ARCH_COMPONENT_PRESET_DEFS[arch].uiOptions,
	uiBranch: ARCH_COMPONENT_PRESET_DEFS[arch].uiBranch,
}));

export const PALETTE_PRESETS: PalettePreset[] = [
	...FIELD_PRESETS,
	...LAYOUT_PRESETS,
	...CALCULATION_FIELD_PRESETS,
	...ARCH_COMPONENT_PRESETS,
	...WORK_COMPONENT_PRESETS,
];

export const WIDGET_PRESETS: Array<{ label: string; value: string }> = [
	{ label: "По умолчанию (стандарт RJSF)", value: "" },
	{ label: "Скрыто в форме — hidden", value: "hidden" },
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
