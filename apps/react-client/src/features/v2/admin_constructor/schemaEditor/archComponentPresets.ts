import type { RJSFSchema } from "@rjsf/utils";
import type { V2ArchComponentType } from "@smart-anketa/api-contract";
import {
	V2_ARCH_COMPONENT_PRESET_DEFS_FROM_SNAPSHOT,
	type V2ArchComponentPresetDef,
} from "@smart-anketa/api-contract";

const YES_NO = ["Да", "Нет"] as const;

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
				properties: {
					name: {
						type: "string",
						title: "Наименование",
						readOnly: true,
					},
					workType: {
						type: "string",
						title: "Тип работ",
						readOnly: true,
					},
					reason: {
						type: "string",
						title: "Причина",
						readOnly: true,
					},
					estimateHoursPerDay: {
						type: "number",
						title: "Базовая оценка (ч/д)",
						readOnly: true,
					},
					coefficient: {
						type: "number",
						title: "Коэф.",
						readOnly: true,
					},
					total: {
						type: "number",
						title: "Итог",
						readOnly: true,
					},
				},
			},
		}),
		uiOptions: {
			archComponent: "typicalWork",
			addable: false,
			removable: false,
			orderable: false,
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
				properties: {
					name: { type: "string", title: "Задача" },
					estimateHoursPerDay: {
						type: "number",
						title: "Оценка ч/д",
					},
					coefficient: {
						type: "number",
						title: "Коэф.",
						default: 1.5,
					},
					total: {
						type: "number",
						title: "Итог",
						readOnly: true,
					},
					includeInCalculation: {
						type: "boolean",
						title: "Включить в расчёт",
						default: true,
					},
				},
			},
		}),
		uiOptions: {
			archComponent: "atypicalWork",
			addable: true,
			removable: true,
			orderable: false,
		},
	},
};

export const ARCH_COMPONENT_PRESET_DEFS: Record<
	V2ArchComponentType,
	ArchComponentPresetDef
> = {
	...V2_ARCH_COMPONENT_PRESET_DEFS_FROM_SNAPSHOT,
	...MANUAL_ARCH_COMPONENT_PRESET_DEFS,
};
