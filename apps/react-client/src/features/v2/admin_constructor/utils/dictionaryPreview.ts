import type { RJSFSchema, UiSchema } from "@rjsf/utils";

import { resolveSchemaNodeType } from "../schemaEditor/propertiesFieldKind";
import { pointerSegments } from "./schemaPaths";
import {
	patchUiOptionsAtPointer,
	resolveSchemaNode,
	updatePropertyAtPointer,
} from "./schemaMutators";

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

export type DictionaryFieldBinding = {
	pointer: string;
	dictionaryCode: string;
	multiple: boolean;
};

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

/** Все поля uiSchema с привязкой `dictionaryCode` и признаком multiple. */
export function collectDictionaryFieldBindings(
	uiSchema: UiSchema,
	schemaForBindings: RJSFSchema,
): DictionaryFieldBinding[] {
	const bindings: DictionaryFieldBinding[] = [];

	const walk = (node: unknown, segments: string[]) => {
		if (!node || typeof node !== "object" || Array.isArray(node)) return;
		const rec = node as Record<string, unknown>;

		const opts = rec["ui:options"];
		let dictionaryCode: string | null = null;
		let explicitMultiple = false;
		if (opts && typeof opts === "object" && !Array.isArray(opts)) {
			const opt = opts as Record<string, unknown>;
			const rawCode = opt.dictionaryCode;
			if (typeof rawCode === "string" && rawCode.trim()) {
				dictionaryCode = rawCode.trim();
			}
			explicitMultiple = opt.multiple === true;
		}

		if (dictionaryCode && segments.length > 0) {
			const pointer = `/${segments.join("/")}`;
			const schemaNode = resolveSchemaNode(schemaForBindings, segments);
			const nodeType = resolveSchemaNodeType(schemaNode);
			const itemsType = resolveSchemaNodeType(
				schemaNode?.items as RJSFSchema | undefined,
			);
			const multiple =
				explicitMultiple ||
				(nodeType === "array" && itemsType === "string");

			bindings.push({
				pointer,
				dictionaryCode,
				multiple,
			});
		}

		for (const [key, value] of Object.entries(rec)) {
			if (key.startsWith("ui:")) continue;
			walk(value, [...segments, key]);
		}
	};

	walk(uiSchema, []);
	return bindings;
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

function buildEnumOptionsPair(pair: {
	enums: string[];
	enumNames: string[];
}): Array<{ value: string; label: string }> {
	return pair.enums.map((value, index) => ({
		value,
		label: pair.enumNames[index] ?? value,
	}));
}

/** Дополняет JSON Schema enum-ами активных элементов справочников (по ui). */
export function mergeDictionaryEnumsIntoPreviewSchema(
	previewSchema: RJSFSchema,
	uiSchema: UiSchema,
	enumMapByCode: Record<string, { enums: string[]; enumNames: string[] }>,
	schemaForBindings: RJSFSchema = previewSchema,
): RJSFSchema {
	let draft = structuredClone(previewSchema) as RJSFSchema;

	for (const binding of collectDictionaryFieldBindings(
		uiSchema,
		schemaForBindings,
	)) {
		const segs = pointerSegments(binding.pointer);
		const node = resolveSchemaNode(draft, segs);
		if (!node) continue;

		const isTarget = binding.multiple
			? resolveSchemaNodeType(node) === "array" &&
				resolveSchemaNodeType(node.items as RJSFSchema | undefined) ===
					"string"
			: isStringLikeFieldForDictionary(node);
		if (!isTarget) continue;

		const pair = enumMapByCode[binding.dictionaryCode];
		if (!pair?.enums.length) continue;

		const dictionaryItemsSchema: RJSFSchema = {
			type: "string",
			enum: pair.enums,
			enumNames: pair.enumNames,
		};
		const patched = binding.multiple
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

/** Прокидывает `ui:options.enumOptions` и `multiple` в превью uiSchema для select-виджета. */
export function mergeDictionaryOptionsIntoPreviewUiSchema(
	previewUiSchema: UiSchema,
	sourceUiSchema: UiSchema,
	schemaForBindings: RJSFSchema,
	enumMapByCode: Record<string, { enums: string[]; enumNames: string[] }>,
): UiSchema {
	let draft = structuredClone(previewUiSchema) as UiSchema;

	for (const binding of collectDictionaryFieldBindings(
		sourceUiSchema,
		schemaForBindings,
	)) {
		const pair = enumMapByCode[binding.dictionaryCode];
		if (!pair?.enums.length) continue;

		draft = patchUiOptionsAtPointer(
			draft as Record<string, unknown>,
			binding.pointer,
			{
				enumOptions: buildEnumOptionsPair(pair),
				enumNames: pair.enumNames,
				multiple: binding.multiple ? true : undefined,
			},
		) as UiSchema;
	}

	return draft;
}
