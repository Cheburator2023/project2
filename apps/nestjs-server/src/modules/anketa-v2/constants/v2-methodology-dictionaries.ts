import { V2_FACTORY_TYPICAL_WORKS_SNAPSHOT } from "../constants/v2-factory-typical-works-catalog";
import type { V2DefaultDictionaryDef } from "../utils/v2-schema-dictionary.util";

/**
 * Методологические справочники (веса, классы, виды контроля и т.д.)
 * из заводского снимка `v2-factory-typical-works.snapshot.json`.
 */

function dictCode(id: string, name: string): string {
	const slug = name
		.toLowerCase()
		.replace(/["»«]/g, "")
		.replace(/[^a-zа-я0-9]+/gi, "_")
		.replace(/^_+|_+$/g, "")
		.slice(0, 48);
	return `v2.method.${id}.${slug}`;
}

function itemCode(label: string, index: number): string {
	const slug = label
		.toLowerCase()
		.replace(/[^a-zа-я0-9]+/gi, "_")
		.replace(/^_+|_+$/g, "")
		.slice(0, 40);
	return slug || `item_${index + 1}`;
}

/** Справочники методолога с непустым списком значений. */
export const V2_METHODOLOGY_DICTIONARIES: V2DefaultDictionaryDef[] =
	V2_FACTORY_TYPICAL_WORKS_SNAPSHOT.dictionaries
		.filter((d) => d.values.length > 0)
		.map((d) => {
			const seen = new Set<string>();
			return {
				code: dictCode(d.id, d.name),
				name: d.name,
				category: d.category?.trim() || "Методология",
				description: d.comments?.trim() || null,
				items: d.values.map((v, i) => {
					let code = itemCode(v.label, i);
					while (seen.has(code)) code = `${code}_${i}`;
					seen.add(code);
					return {
						code,
						label: v.label,
						order: i,
						payload: { coeff: v.coeff, coeffRaw: v.coeffRaw, raw: v.raw },
					};
				}),
			};
		});
