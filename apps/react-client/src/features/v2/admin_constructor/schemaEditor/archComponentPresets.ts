import type { RJSFSchema } from "@rjsf/utils";
import type { V2ArchComponentType } from "@smart-anketa/api-contract";
import {
	V2_ARCH_COMPONENT_PRESET_DEFS_FROM_SNAPSHOT,
	type V2ArchComponentPresetDef,
} from "@smart-anketa/api-contract";

const DEPLOY_CHANNEL_ITEMS = [
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
] as const;

export type ArchComponentPresetDef = V2ArchComponentPresetDef;

/** Справочник ProПро: тип работ для нетиповой задачи. */
export const ATYPICAL_WORK_TYPE_DICTIONARY_CODE =
	"v2.method.14.тип_работ_для_нетиповой_работы_пропро";

export const ATYPICAL_WORK_TYPE_LABELS = [
	"Архитектурная задача",
	"Линейная деятельность",
	"Новая функциональность",
	"Сопровождение",
	"Технический долг",
] as const;

const ATYPICAL_WORK_ITEM_PROPERTIES: RJSFSchema["properties"] = {
	name: { type: "string", title: "Задача" },
	workType: { type: "string", title: "Тип работ" },
	estimateHoursPerDay: { type: "number", title: "Оценка ч/д" },
	coefficient: { type: "number", title: "Коэф." },
	total: { type: "number", title: "Итог", readOnly: true },
	includeInCalculation: {
		type: "boolean",
		title: "Включить в расчёт",
	},
};

/**
 * Значения по умолчанию для НОВОЙ строки нетиповой работы. Применяются явно при
 * создании строки (см. AnketaFormModals), а НЕ через schema `default` — иначе
 * RJSF подставляет их в недостающие ключи существующего снепшота и «портит»
 * сохранённые значения (нарушение snapshot-as-source-of-truth).
 */
export const ATYPICAL_WORK_NEW_ROW_DEFAULTS: Record<string, unknown> = {
	coefficient: 1.5,
	includeInCalculation: true,
};

export const TYPICAL_WORK_ITEM_PROPERTIES: RJSFSchema["properties"] = {
	name: {
		type: "string",
		title: "Название типовой работы",
		readOnly: true,
	},
	estimateHoursPerDay: {
		type: "number",
		title: "Базовая оценка",
		readOnly: true,
	},
	coefficient: {
		type: "number",
		title: "Коэффициент",
		readOnly: true,
	},
	total: {
		type: "number",
		title: "Итог",
		readOnly: true,
	},
};

const TYPICAL_WORK_ITEMS_UI_BRANCH: Record<string, unknown> = {
	items: {
		"ui:order": ["name", "estimateHoursPerDay", "coefficient", "total"],
		name: { "ui:widget": "text", "ui:readonly": true },
		estimateHoursPerDay: { "ui:widget": "text", "ui:readonly": true },
		coefficient: { "ui:widget": "text", "ui:readonly": true },
		total: { "ui:widget": "text", "ui:readonly": true },
	},
};

const ATYPICAL_WORK_ITEMS_UI_BRANCH: Record<string, unknown> = {
	items: {
		"ui:order": [
			"name",
			"workType",
			"estimateHoursPerDay",
			"coefficient",
			"total",
			"includeInCalculation",
		],
		name: { "ui:widget": "text" },
		workType: {
			"ui:widget": "select",
			"ui:options": { dictionaryCode: ATYPICAL_WORK_TYPE_DICTIONARY_CODE },
		},
		estimateHoursPerDay: { "ui:widget": "text" },
		coefficient: { "ui:widget": "text" },
		total: { "ui:widget": "text", "ui:readonly": true },
		includeInCalculation: { "ui:widget": "checkbox" },
	},
};

/** Пресеты арх. компонентов, которых нет в дефолтном снепшоте анкеты. */
const MANUAL_ARCH_COMPONENT_PRESET_DEFS: Pick<
	Record<V2ArchComponentType, ArchComponentPresetDef>,
	"deployChannel" | "modelControl" | "typicalWork" | "atypicalWork"
> = {
	deployChannel: {
		make: () => ({
			type: "array",
			title: "Каналы внедрения",
			items: {
				type: "string",
				enum: [...DEPLOY_CHANNEL_ITEMS],
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
					enum: ["1", "2", "3", "4", "5", "6", "7", "8", "9"],
				},
				controlTypes: {
					type: "array",
					title: "Вид контроля",
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
	typicalWork: {
		make: () => ({
			type: "array",
			title: "Типовые работы",
			readOnly: true,
			items: {
				type: "object",
				title: "Типовая работа",
				properties: TYPICAL_WORK_ITEM_PROPERTIES,
			},
		}),
		uiOptions: {
			archComponent: "typicalWork",
			addable: false,
			removable: false,
			orderable: false,
			boundWorkIds: [],
		},
		uiBranch: {
			...TYPICAL_WORK_ITEMS_UI_BRANCH,
			"ui:description":
				"Список заполняется автоматически при срабатывании триггеров типовых работ.\n\nПоля: Название типовой работы · Базовая оценка · Коэффициент · Итог\nСуммарный итог — при нескольких работах",
		},
	},
	atypicalWork: {
		make: () => ({
			type: "array",
			title: "Нетиповые работы",
			items: {
				type: "object",
				title: "Нетиповая задача",
				required: ["name"],
				properties: ATYPICAL_WORK_ITEM_PROPERTIES,
			},
		}),
		uiOptions: {
			archComponent: "atypicalWork",
			addable: true,
			removable: true,
			orderable: false,
		},
		uiBranch: ATYPICAL_WORK_ITEMS_UI_BRANCH,
	},
};

export const ARCH_COMPONENT_PRESET_DEFS: Record<
	V2ArchComponentType,
	ArchComponentPresetDef
> = {
	...V2_ARCH_COMPONENT_PRESET_DEFS_FROM_SNAPSHOT,
	...MANUAL_ARCH_COMPONENT_PRESET_DEFS,
};
