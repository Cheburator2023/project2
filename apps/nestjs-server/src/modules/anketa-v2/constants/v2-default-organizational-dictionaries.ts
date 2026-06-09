import type { V2DefaultDictionaryDef } from "../utils/v2-schema-dictionary.util";

/** Организационные справочники без enum в JSON Schema (multi-select и т.п.). */
export const V2_ORGANIZATIONAL_DICTIONARIES: V2DefaultDictionaryDef[] = [
	{
		code: "v2.generalInfo.businessCustomer",
		name: "Департамент заказчика",
		category: "Организационный",
		description: "Заводской справочник для поля /generalInfo/businessCustomer",
		fieldPointer: "/generalInfo/businessCustomer",
		items: [
			{ code: "Депозитарий", label: "Депозитарий", order: 0 },
			{ code: "Опер. поддержка", label: "Опер. поддержка", order: 1 },
			{ code: "Персонал", label: "Персонал", order: 2 },
			{ code: "Кредитный", label: "Кредитный", order: 3 },
		],
	},
];
