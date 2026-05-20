import type { V2LogicRuleDto } from "@smart-anketa/api-contract";

export const QUICK_ADD_RULE_PRESETS: Array<{
	kind: V2LogicRuleDto["kind"];
	label: string;
	description: string;
}> = [
	{
		kind: "visibility",
		label: "Видимость",
		description: "Показать или скрыть поле по условию",
	},
	{
		kind: "required",
		label: "Обязательность",
		description: "Сделать поле обязательным по условию",
	},
	{
		kind: "computed",
		label: "Расчёт",
		description: "Записать вычисленное значение в поле",
	},
	{
		kind: "task_trigger",
		label: "Триггер работы",
		description: "Отметить типовую задачу в калькуляции",
	},
];
