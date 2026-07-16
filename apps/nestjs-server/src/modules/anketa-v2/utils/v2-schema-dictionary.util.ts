import type { V2JsonSchemaDto, V2UiSchemaDto } from "@smart-anketa/api-contract";
import { methodologyDictionaryByName } from "../constants/v2-default-dictionaries.registry";

export type V2DefaultDictionaryDef = {
	code: string;
	name: string;
	description: string | null;
	category: string;
	fieldPointer?: string;
	items: Array<{
		code: string;
		label: string;
		order: number;
		payload?: Record<string, unknown> | null;
	}>;
};

export type V2DictionaryFieldBinding = {
	fieldPointer: string;
	dictionaryCode: string;
	fieldTitle: string | null;
};

/** `/meta/status` → `v2.meta.status` */
export function jsonPointerToDictionaryCode(pointer: string): string {
	const segs = pointer.replace(/^\//, "").split("/").filter(Boolean);
	return `v2.${segs.join(".")}`;
}

function normalizePointer(raw: string): string {
	const t = raw.trim();
	if (!t || t === "/") return "/";
	return t.startsWith("/") ? t : `/${t}`;
}

function enumStrings(node: Record<string, unknown>): string[] {
	const raw = node.enum;
	if (!Array.isArray(raw)) return [];
	return raw.filter((v): v is string => typeof v === "string" && v.length > 0);
}

/** Лимит колонки v2_dictionary_item.code (varchar 100). */
export const V2_DICTIONARY_ITEM_CODE_MAX_LEN = 100;

/** Короткий стабильный code для элемента enum-справочника схемы; label остаётся полным. */
export function schemaDictionaryItemCode(
	label: string,
	index: number,
	seen: Set<string>,
): string {
	const trimmed = label.trim();
	const numbered = trimmed.match(/^(\d+)\.\s/);
	if (numbered) {
		const code = numbered[1]!;
		if (!seen.has(code)) {
			seen.add(code);
			return code;
		}
	}

	const slug = trimmed
		.toLowerCase()
		.replace(/[^a-zа-я0-9]+/gi, "_")
		.replace(/^_+|_+$/g, "")
		.slice(0, V2_DICTIONARY_ITEM_CODE_MAX_LEN - 4);

	let code = slug || `item_${index + 1}`;
	let suffix = 0;
	while (seen.has(code)) {
		suffix++;
		const base = (slug || "item").slice(
			0,
			V2_DICTIONARY_ITEM_CODE_MAX_LEN - String(suffix).length - 1,
		);
		code = `${base}_${suffix}`;
	}
	seen.add(code);
	return code;
}

/**
 * Собирает все поля JSON Schema с `enum` (включая вложенные object и items массивов).
 */
export function extractEnumFieldsFromJsonSchema(
	schema: V2JsonSchemaDto,
	basePointer = "/",
): Array<{
	pointer: string;
	title: string;
	enumValues: string[];
	dictionaryCode: string;
}> {
	const out: Array<{
		pointer: string;
		title: string;
		enumValues: string[];
		dictionaryCode: string;
	}> = [];

	const visit = (node: unknown, pointer: string) => {
		if (!node || typeof node !== "object" || Array.isArray(node)) return;
		const n = node as Record<string, unknown>;

		const enums = enumStrings(n);
		if (enums.length > 0) {
			const title =
				typeof n.title === "string" && n.title.trim()
					? n.title.trim()
					: pointer.split("/").filter(Boolean).pop() ?? pointer;
			const np = normalizePointer(pointer);
			out.push({
				pointer: np,
				title,
				enumValues: enums,
				dictionaryCode: jsonPointerToDictionaryCode(np),
			});
		}

		const props = n.properties;
		if (props && typeof props === "object" && !Array.isArray(props)) {
			for (const [key, sub] of Object.entries(props)) {
				const childPtr =
					pointer === "/" ? `/${key}` : `${normalizePointer(pointer)}/${key}`;
				visit(sub, childPtr);
			}
		}

		const items = n.items;
		if (items && typeof items === "object" && !Array.isArray(items)) {
			const itemsNode = items as Record<string, unknown>;
			const itemsProps = itemsNode.properties;
			if (itemsProps && typeof itemsProps === "object" && !Array.isArray(itemsProps)) {
				for (const [key, sub] of Object.entries(itemsProps)) {
					const childPtr = `${normalizePointer(pointer)}/items/${key}`;
					visit(sub, childPtr);
				}
			} else {
				visit(itemsNode, `${normalizePointer(pointer)}/items`);
			}
		}
	};

	visit(schema, basePointer);
	return out;
}

export function buildDefaultDictionariesFromJsonSchema(
	schema: V2JsonSchemaDto,
): V2DefaultDictionaryDef[] {
	return extractEnumFieldsFromJsonSchema(schema)
		.filter((f) => !methodologyDictionaryByName(f.title))
		.map((f) => {
			const seen = new Set<string>();
			return {
				code: f.dictionaryCode,
				name: f.title,
				description: `Заводской справочник для поля ${f.pointer}`,
				category: "Схема",
				fieldPointer: f.pointer,
				items: f.enumValues.map((label, order) => ({
					code: schemaDictionaryItemCode(label, order, seen),
					label,
					order,
					payload: { fieldPointer: f.pointer },
				})),
			};
		});
}

/** `v2.detailInfo.foo` → `/detailInfo/foo` */
export function dictionaryCodeToSchemaPointer(code: string): string {
	const trimmed = code.trim();
	if (!trimmed.startsWith("v2.")) return "/";
	return `/${trimmed.slice(3).replace(/\./g, "/")}`;
}

/**
 * Справочники, привязанные в uiSchema через dictionaryCode, с enum на фактическом
 * поле схемы (legacy-код в dictionaryCode может не совпадать с ключом property).
 */
export function collectDictionaryBindingsFromUiSchema(
	uiSchema: unknown,
	basePointer = "/",
): Array<{ dictionaryCode: string; fieldPointer: string }> {
	const out: Array<{ dictionaryCode: string; fieldPointer: string }> = [];

	const walk = (node: unknown, pointer: string) => {
		if (!node || typeof node !== "object" || Array.isArray(node)) return;
		const rec = node as Record<string, unknown>;
		const opts = rec["ui:options"];
		if (opts && typeof opts === "object" && !Array.isArray(opts)) {
			const dc = (opts as Record<string, unknown>).dictionaryCode;
			if (typeof dc === "string" && dc.trim() && pointer !== "/") {
				out.push({
					dictionaryCode: dc.trim(),
					fieldPointer: normalizePointer(pointer),
				});
			}
		}
		for (const [key, value] of Object.entries(rec)) {
			if (key.startsWith("ui:")) continue;
			const childPtr =
				pointer === "/" ? `/${key}` : `${normalizePointer(pointer)}/${key}`;
			walk(value, childPtr);
		}
	};

	walk(uiSchema, basePointer);
	return out;
}

/**
 * Справочники, привязанные в uiSchema через dictionaryCode, но не попавшие в
 * extractEnumFieldsFromJsonSchema (legacy-код ≠ jsonPointerToDictionaryCode).
 */
export function buildDictionariesFromUiSchemaReferences(
	schema: V2JsonSchemaDto,
	uiSchema: V2UiSchemaDto,
	existingCodes: ReadonlySet<string>,
	allowlist?: ReadonlySet<string>,
): V2DefaultDictionaryDef[] {
	const out: V2DefaultDictionaryDef[] = [];
	const seenCodes = new Set(existingCodes);

	for (const binding of collectDictionaryBindingsFromUiSchema(uiSchema)) {
		const { dictionaryCode, fieldPointer } = binding;
		if (seenCodes.has(dictionaryCode)) continue;
		if (allowlist && !allowlist.has(dictionaryCode)) continue;

		const node = resolveSchemaAtPointer(schema, fieldPointer);
		if (!node) continue;
		const enums = enumStrings(node);
		if (enums.length === 0) continue;

		const title =
			typeof node.title === "string" && node.title.trim()
				? node.title.trim()
				: (fieldPointer.split("/").filter(Boolean).pop() ?? dictionaryCode);
		if (methodologyDictionaryByName(title)) continue;

		const seen = new Set<string>();
		out.push({
			code: dictionaryCode,
			name: title,
			description: `Заводской справочник (uiSchema) для ${fieldPointer}`,
			category: "Схема",
			fieldPointer,
			items: enums.map((label, order) => ({
				code: schemaDictionaryItemCode(label, order, seen),
				label,
				order,
				payload: { fieldPointer },
			})),
		});
		seenCodes.add(dictionaryCode);
	}

	return out;
}

function pointerSegments(pointer: string): string[] {
	return normalizePointer(pointer).replace(/^\//, "").split("/").filter(Boolean);
}

function setUiDictionaryCodeBranch(
	ui: Record<string, unknown>,
	segments: string[],
	dictionaryCode: string,
): void {
	let cur: Record<string, unknown> = ui;
	for (let i = 0; i < segments.length; i++) {
		const s = segments[i]!;
		if (i === segments.length - 1) {
			const prev = (cur[s] as Record<string, unknown>) ?? {};
			const optBase =
				prev["ui:options"] &&
				typeof prev["ui:options"] === "object" &&
				!Array.isArray(prev["ui:options"])
					? { ...(prev["ui:options"] as Record<string, unknown>) }
					: {};
			optBase.dictionaryCode = dictionaryCode;
			cur[s] = {
				...prev,
				"ui:options": optBase,
				"ui:widget": "select",
			};
		} else {
			cur[s] = (cur[s] as Record<string, unknown>) ?? {};
			cur = cur[s] as Record<string, unknown>;
		}
	}
}

/** Проставляет `ui:options.dictionaryCode` по списку привязок. */
export function applyDictionaryBindingsToUiSchema(
	uiSchema: V2UiSchemaDto,
	bindings: V2DictionaryFieldBinding[],
): V2UiSchemaDto {
	const next = structuredClone(uiSchema) as Record<string, unknown>;
	for (const b of bindings) {
		const segs = pointerSegments(b.fieldPointer);
		if (segs.length === 0) continue;
		setUiDictionaryCodeBranch(next, segs, b.dictionaryCode);
	}
	return next as V2UiSchemaDto;
}

export function buildDictionaryBindingsFromSchema(
	schema: V2JsonSchemaDto,
): V2DictionaryFieldBinding[] {
	return extractEnumFieldsFromJsonSchema(schema).map((f) => ({
		fieldPointer: f.pointer,
		dictionaryCode:
			methodologyDictionaryByName(f.title)?.code ?? f.dictionaryCode,
		fieldTitle: f.title,
	}));
}

export type V2DictionaryUsageHit = {
	fieldPointer: string;
	fieldTitle: string | null;
};

function readUiDictionaryCodeAtPointer(
	ui: Record<string, unknown>,
	pointer: string,
): string | null {
	const segs = pointerSegments(pointer);
	let cur: unknown = ui;
	for (const s of segs) {
		if (!cur || typeof cur !== "object" || Array.isArray(cur)) return null;
		cur = (cur as Record<string, unknown>)[s];
	}
	if (!cur || typeof cur !== "object" || Array.isArray(cur)) return null;
	const opts = (cur as Record<string, unknown>)["ui:options"];
	if (!opts || typeof opts !== "object" || Array.isArray(opts)) return null;
	const dc = (opts as Record<string, unknown>).dictionaryCode;
	return typeof dc === "string" && dc.trim() ? dc.trim() : null;
}

function walkSchemaForDictionaryUsages(
	rootSchema: V2JsonSchemaDto,
	schemaNode: unknown,
	ui: Record<string, unknown>,
	basePointer: string,
	targetCode: string,
	hits: V2DictionaryUsageHit[],
): void {
	const segs = pointerSegments(basePointer);
	if (segs.length > 0) {
		const code = readUiDictionaryCodeAtPointer(ui, basePointer);
		if (code === targetCode) {
			const schemaField = resolveSchemaAtPointer(rootSchema, basePointer);
			const title =
				schemaField && typeof schemaField.title === "string"
					? schemaField.title
					: (segs[segs.length - 1] ?? null);
			hits.push({ fieldPointer: normalizePointer(basePointer), fieldTitle: title });
		}
	}

	if (!schemaNode || typeof schemaNode !== "object" || Array.isArray(schemaNode)) {
		return;
	}
	const n = schemaNode as Record<string, unknown>;

	const props = n.properties;
	if (props && typeof props === "object" && !Array.isArray(props)) {
		for (const [key, sub] of Object.entries(props)) {
			const childPtr =
				basePointer === "/" ? `/${key}` : `${normalizePointer(basePointer)}/${key}`;
			walkSchemaForDictionaryUsages(rootSchema, sub, ui, childPtr, targetCode, hits);
		}
	}

	const items = n.items;
	if (items && typeof items === "object" && !Array.isArray(items)) {
		const itemsNode = items as Record<string, unknown>;
		const itemsProps = itemsNode.properties;
		if (itemsProps && typeof itemsProps === "object" && !Array.isArray(itemsProps)) {
			for (const [key, sub] of Object.entries(itemsProps)) {
				const childPtr = `${normalizePointer(basePointer)}/items/${key}`;
				walkSchemaForDictionaryUsages(rootSchema, sub, ui, childPtr, targetCode, hits);
			}
		}
	}
}

function resolveSchemaAtPointer(
	schema: V2JsonSchemaDto,
	pointer: string,
): Record<string, unknown> | null {
	const segs = pointerSegments(pointer);
	let cur: Record<string, unknown> = schema as Record<string, unknown>;
	for (const seg of segs) {
		if (seg === "items") {
			const items = cur.items;
			if (!items || typeof items !== "object" || Array.isArray(items)) return null;
			cur = items as Record<string, unknown>;
			continue;
		}
		const props = cur.properties as Record<string, unknown> | undefined;
		if (!props || !props[seg]) return null;
		cur = props[seg] as Record<string, unknown>;
	}
	return cur;
}

/** Все поля uiSchema версии, где указан данный код справочника. */
export function findDictionaryFieldUsagesInVersion(
	jsonSchema: V2JsonSchemaDto,
	uiSchema: V2UiSchemaDto,
	dictionaryCode: string,
): V2DictionaryUsageHit[] {
	const hits: V2DictionaryUsageHit[] = [];
	const ui = uiSchema as Record<string, unknown>;
	walkSchemaForDictionaryUsages(jsonSchema, jsonSchema, ui, "/", dictionaryCode, hits);
	return hits;
}

/** Все коды справочников, упомянутые в uiSchema версий шаблонов. */
export function collectAllDictionaryCodesInUse(
	versions: Array<{ uiSchema?: unknown | null }>,
): Set<string> {
	const codes = new Set<string>();
	for (const v of versions) {
		if (!v.uiSchema) continue;
		for (const code of collectDictionaryCodesFromUiSchema(v.uiSchema)) {
			codes.add(code);
		}
	}
	return codes;
}

export function collectDictionaryCodesFromUiSchema(uiSchema: unknown): string[] {
	const out = new Set<string>();
	const walk = (node: unknown) => {
		if (!node || typeof node !== "object" || Array.isArray(node)) return;
		const rec = node as Record<string, unknown>;
		const opts = rec["ui:options"];
		if (opts && typeof opts === "object" && !Array.isArray(opts)) {
			const dc = (opts as Record<string, unknown>).dictionaryCode;
			if (typeof dc === "string" && dc.trim()) out.add(dc.trim());
		}
		for (const [k, v] of Object.entries(rec)) {
			if (k.startsWith("ui:")) continue;
			walk(v);
		}
	};
	walk(uiSchema);
	return [...out].sort();
}
