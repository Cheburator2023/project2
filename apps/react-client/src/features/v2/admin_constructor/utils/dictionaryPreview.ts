import type { RJSFSchema, UiSchema } from "@rjsf/utils";

import {
	listSchemaFields,
	resolveSchemaNode,
	updatePropertyAtPointer,
} from "./schemaMutators";
import { resolveSchemaNodeType } from "../schemaEditor/propertiesFieldKind";
import { pointerSegments } from "./schemaPaths";

/** Ответ `/v2/dictionaries/json/:code` — извлекаем коды под enum в схеме. */
export function parseDictionaryJsonToEnumPair(data: unknown): {
	enums: string[];
	enumNames: string[];
} | null {
	if (!data || typeof data !== "object") return null;
	const raw = data as Record<string, unknown>;
	const items = raw.items;
	if (!Array.isArray(items)) return null;
	const enums: string[] = [];
	const enumNames: string[] = [];
	for (const it of items) {
		if (!it || typeof it !== "object") continue;
		const row = it as Record<string, unknown>;
		const code = row.code;
		if (typeof code !== "string" || !code.trim()) continue;
		enums.push(code);
		const label = row.label;
		enumNames.push(typeof label === "string" && label.trim() ? label : code);
	}
	if (!enums.length) return null;
	return { enums, enumNames };
}

function walkUiForDictionaryCodes(node: unknown, out: Set<string>): void {
	if (!node || typeof node !== "object" || Array.isArray(node)) return;
	const rec = node as Record<string, unknown>;

	const opts = rec["ui:options"];
	if (opts && typeof opts === "object" && !Array.isArray(opts)) {
		const dc = (opts as Record<string, unknown>).dictionaryCode;
		if (typeof dc === "string" && dc.trim()) out.add(dc.trim());
	}

	const nestedItems = rec.items;
	if (
		nestedItems &&
		typeof nestedItems === "object" &&
		!Array.isArray(nestedItems)
	) {
		walkUiForDictionaryCodes(nestedItems, out);
	}

	for (const [k, v] of Object.entries(rec)) {
		if (k === "ui:options" || k === "ui:order") continue;
		if (k.startsWith("ui:")) continue;
		walkUiForDictionaryCodes(v, out);
	}
}

/** Все коды словарников, упомянутые в uiSchema через `ui:options.dictionaryCode`. */
export function collectDictionaryCodesFromUiSchema(ui: unknown): string[] {
	const out = new Set<string>();
	walkUiForDictionaryCodes(ui, out);
	return [...out].sort();
}

function readUiBranch(
	uiSchema: Record<string, unknown>,
	segments: string[],
): Record<string, unknown> | undefined {
	let cur: unknown = uiSchema;
	for (const s of segments) {
		if (!cur || typeof cur !== "object" || Array.isArray(cur)) {
			return undefined;
		}
		cur = (cur as Record<string, unknown>)[s];
	}
	if (!cur || typeof cur !== "object" || Array.isArray(cur)) return undefined;
	return cur as Record<string, unknown>;
}

function isStringLikeFieldForDictionary(field: RJSFSchema): boolean {
	if (
		field.properties &&
		typeof field.properties === "object" &&
		Object.keys(field.properties).length > 0
	) {
		return false;
	}
	const t = field.type;
	if (t === "object") return false;
	if (Array.isArray(t)) {
		if ((t as string[]).includes("object")) return false;
		return (t as string[]).includes("string");
	}
	return t === "string" || t === undefined;
}

/** Дополняет снимок JSON Schema enum-ами активных элементов словарников (по ui). */
export function mergeDictionaryEnumsIntoPreviewSchema(
	jsonSchema: RJSFSchema,
	uiSchema: UiSchema,
	enumMapByCode: Record<string, { enums: string[]; enumNames: string[] }>,
): RJSFSchema {
	const ui = uiSchema as Record<string, unknown>;
	let draft = structuredClone(jsonSchema) as RJSFSchema;
	const rows = listSchemaFields(jsonSchema);

	for (const row of rows) {
		const segs = pointerSegments(row.pointer);
		const node = resolveSchemaNode(draft, segs);
		if (!node) continue;

		const leafUi = readUiBranch(ui, segs);
		const opt =
			leafUi?.["ui:options"] &&
			typeof leafUi["ui:options"] === "object" &&
			!Array.isArray(leafUi["ui:options"])
				? (leafUi["ui:options"] as Record<string, unknown>)
				: undefined;

		const multi = opt?.multiple === true;
		const isTarget = multi
			? resolveSchemaNodeType(node) === "array" &&
				resolveSchemaNodeType(node.items as RJSFSchema | undefined) === "string"
			: isStringLikeFieldForDictionary(node);
		if (!isTarget) continue;

		let code: string | null = null;
		if (opt) {
			const raw = opt.dictionaryCode;
			code = typeof raw === "string" && raw.trim() ? raw.trim() : null;
		}
		if (!code) continue;

		const pair = enumMapByCode[code];
		if (!pair?.enums.length) continue;

		const dictionaryItemsSchema: RJSFSchema = {
			type: "string",
			enum: pair.enums,
			enumNames: pair.enumNames,
		};
		const patched = multi
			? updatePropertyAtPointer(draft, segs, {
					items: dictionaryItemsSchema,
					uniqueItems: true,
				})
			: updatePropertyAtPointer(draft, segs, {
					enum: pair.enums,
					enumNames: pair.enumNames,
				});
		if (patched) draft = patched;
	}

	return draft;
}
