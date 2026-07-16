import {
	V2_IMPLEMENTATION_STREAM_CODES,
	V2_IMPLEMENTATION_STREAM_DICTIONARY_CODE,
	V2_IMPLEMENTATION_STREAM_LABELS,
} from "@smart-anketa/api-contract";
import type { V2DefaultDictionaryDef } from "../utils/v2-schema-dictionary.util";

/** Организационные справочники без enum в JSON Schema (multi-select и т.п.) + явные code/label. */
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
	{
		code: V2_IMPLEMENTATION_STREAM_DICTIONARY_CODE,
		name: "Стрим-исполнитель",
		category: "Организационный",
		description:
			"Заводской справочник для поля /generalInfo/implementationStream (в formData — код)",
		fieldPointer: "/generalInfo/implementationStream",
		items: V2_IMPLEMENTATION_STREAM_CODES.map((code, order) => ({
			code,
			label: V2_IMPLEMENTATION_STREAM_LABELS[code],
			order,
			payload: { storeCode: true, fieldPointer: "/generalInfo/implementationStream" },
		})),
	},
];
