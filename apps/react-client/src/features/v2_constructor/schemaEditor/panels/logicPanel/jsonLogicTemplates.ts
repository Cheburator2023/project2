import type { RJSFSchema } from "@rjsf/utils";
import type { JsonLogicValue } from "@react-client/features/jsonLoginBuilder";
import {
	jsonPointerToFormDataVarPath,
	pointerSegments,
} from "../../../utils/schemaPaths";
import { listSchemaFields, resolveSchemaNode } from "../../../utils/schemaMutators";

export type ArrayPathOption = {
	pointer: string;
	varPath: string;
	label: string;
};

/** Массивы верхнего уровня и вложенные object→array из JSON Schema. */
export function listArrayPathOptions(schema: RJSFSchema): ArrayPathOption[] {
	return listSchemaFields(schema)
		.filter((row) => row.typeLabel === "array")
		.map((row) => {
			const segs = pointerSegments(row.pointer);
			const node = resolveSchemaNode(schema, segs);
			const title =
				typeof node?.title === "string" && node.title.trim()
					? node.title.trim()
					: row.key;
			const varPath = jsonPointerToFormDataVarPath(row.pointer);
			return {
				pointer: row.pointer,
				varPath,
				label: `${title} (${varPath})`,
			};
		});
}

/** Числовые поля элемента массива (items.properties). */
export function listArrayItemNumericFields(
	schema: RJSFSchema,
	arrayPointer: string,
): string[] {
	const segs = pointerSegments(arrayPointer);
	const node = resolveSchemaNode(schema, segs);
	const items = node?.items;
	if (!items || typeof items !== "object" || Array.isArray(items)) return [];
	const props = (items as RJSFSchema).properties;
	if (!props || typeof props !== "object") return [];
	return Object.keys(props as Record<string, RJSFSchema>).filter((key) => {
		const sub = (props as Record<string, RJSFSchema>)[key];
		const t = sub?.type;
		if (t === "number" || t === "integer") return true;
		if (Array.isArray(t) && t.includes("number")) return true;
		return false;
	});
}

/**
 * Σ по полю строки массива — как в заводской логике v2 (`SUM_TASK_TOTAL`).
 * `rowField` — имя без префикса `current.` (например `total`).
 */
export function buildSumArrayReduce(
	arrayVarPath: string,
	rowField: string,
	options?: { clampNegative?: boolean },
): JsonLogicValue {
	const fieldVar = rowField.trim().replace(/^current\./, "");
	const rowValue: JsonLogicValue = { var: `current.${fieldVar}` };
	const addend: JsonLogicValue =
		options?.clampNegative !== false
			? { max: [0, rowValue] }
			: rowValue;

	return {
		reduce: [
			{ var: arrayVarPath.trim() },
			{
				"+": [{ var: "accumulator" }, addend],
			},
			0,
		],
	};
}
