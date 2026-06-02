import type { RJSFSchema } from "@rjsf/utils";
import { parentOfPointer, pointerSegments } from "./schemaPaths";

export function resolveSchemaNode(
	root: RJSFSchema,
	segments: string[],
): RJSFSchema | undefined {
	let cur: RJSFSchema = root;
	for (const seg of segments) {
		const next = cur.properties?.[seg] as RJSFSchema | undefined;
		if (!next) return undefined;
		cur = next;
	}
	return cur;
}

export function updatePropertyAtPointer(
	root: RJSFSchema,
	fullSegments: string[],
	patch: Partial<RJSFSchema>,
): RJSFSchema | null {
	if (fullSegments.length === 0) {
		const draft = structuredClone(root);
		return { ...draft, ...patch };
	}

	const draft = structuredClone(root);
	let cur = draft;

	for (let i = 0; i < fullSegments.length - 1; i++) {
		const seg = fullSegments[i]!;
		const next = cur.properties?.[seg] as RJSFSchema | undefined;
		if (!next) return null;
		cur = next as RJSFSchema;
	}

	const leaf = fullSegments[fullSegments.length - 1]!;
	if (!cur.properties?.[leaf]) return null;

	cur.properties[leaf] = {
		...(cur.properties[leaf] as RJSFSchema),
		...patch,
	};

	return draft;
}

export function toggleRequiredAtPointer(
	root: RJSFSchema,
	targetPointer: string,
	required: boolean,
): RJSFSchema | null {
	const pk = parentOfPointer(targetPointer);
	if (!pk) return null;

	const draft = structuredClone(root);
	const parentSchema = resolveSchemaNode(draft, pk.parentSegments);

	if (!parentSchema || !parentSchema.properties?.[pk.key]) {
		return null;
	}

	parentSchema.required = [...(parentSchema.required ?? [])].filter(
		(k) => k !== pk.key,
	);

	if (required && !parentSchema.required.includes(pk.key)) {
		parentSchema.required.push(pk.key);
	}

	if (parentSchema.required.length === 0) {
		delete parentSchema.required;
	}

	return draft;
}

export function reorderRootProperties(
	root: RJSFSchema,
	orderedKeys: string[],
): RJSFSchema | null {
	return reorderChildProperties(root, [], orderedKeys);
}

export function reorderChildProperties(
	root: RJSFSchema,
	parentSegments: string[],
	orderedKeys: string[],
): RJSFSchema | null {
	const draft = structuredClone(root);
	const parent =
		parentSegments.length === 0 ? draft : resolveSchemaNode(draft, parentSegments);

	if (!parent?.properties) return null;

	const props = parent.properties as Record<string, RJSFSchema>;
	const newProps: Record<string, RJSFSchema> = {};

	for (const key of orderedKeys) {
		const node = props[key];
		if (node) newProps[key] = node;
	}

	if (Object.keys(newProps).length !== Object.keys(props).length) {
		return null;
	}

	parent.properties = newProps;
	return draft;
}

export function addRootProperty(
	root: RJSFSchema,
	key: string,
	def: RJSFSchema,
): RJSFSchema | null {
	if ((root.properties as Record<string, unknown>)?.[key] !== undefined) {
		return null;
	}

	const draft = structuredClone(root);
	draft.properties = { ...draft.properties, [key]: def };
	return draft;
}

export function insertRootPropertyAt(
	root: RJSFSchema,
	key: string,
	def: RJSFSchema,
	index: number,
): RJSFSchema | null {
	return insertChildPropertyAt(root, [], key, def, index);
}

export function insertChildPropertyAt(
	root: RJSFSchema,
	parentSegments: string[],
	key: string,
	def: RJSFSchema,
	index: number,
): RJSFSchema | null {
	const draft = structuredClone(root);
	const parent =
		parentSegments.length === 0 ? draft : resolveSchemaNode(draft, parentSegments);

	if (!parent) return null;

	if (parent.type !== "object") {
		parent.type = "object";
	}

	const props = (parent.properties ?? {}) as Record<string, RJSFSchema>;
	if (props[key] !== undefined) return null;

	parent.properties = { ...props, [key]: def };

	const keys = Object.keys(parent.properties);
	const fromIndex = keys.indexOf(key);
	if (fromIndex < 0) return draft;

	const ordered = keys.filter((k) => k !== key);
	const safeIndex = Math.max(0, Math.min(index, ordered.length));
	ordered.splice(safeIndex, 0, key);

	return reorderChildProperties(draft, parentSegments, ordered);
}

export function listChildKeys(
	root: RJSFSchema,
	parentPointer: string,
): string[] {
	const segs = pointerSegments(parentPointer);
	const parent =
		segs.length === 0 ? root : resolveSchemaNode(root, segs);
	return Object.keys((parent?.properties ?? {}) as Record<string, unknown>);
}

export function isObjectFieldGroup(node: RJSFSchema | undefined): boolean {
	if (!node) return false;
	return node.type === "object" || Boolean(node.properties);
}

export function findPropertyInTree(
	root: RJSFSchema,
	key: string,
): { parentSegments: string[]; node: RJSFSchema } | null {
	function walk(
		schema: RJSFSchema,
		parentSegments: string[],
	): { parentSegments: string[]; node: RJSFSchema } | null {
		const props = (schema.properties ?? {}) as Record<string, RJSFSchema>;
		if (props[key]) {
			return { parentSegments, node: props[key]! };
		}

		for (const childKey of Object.keys(props)) {
			const found = walk(props[childKey]!, [...parentSegments, childKey]);
			if (found) return found;
		}

		return null;
	}

	return walk(root, []);
}

export function applyGroupFieldOrdersToSchema(
	root: RJSFSchema,
	orders: Record<string, string[]>,
): RJSFSchema | null {
	const draft = structuredClone(root);

	for (const [groupId, keys] of Object.entries(orders)) {
		const parentPointer =
			groupId === "schema-root" ? "/" : groupId.replace("schema-group:", "");
		const parentSegments = pointerSegments(parentPointer);
		const parent =
			parentSegments.length === 0
				? draft
				: resolveSchemaNode(draft, parentSegments);

		if (!parent) continue;

		const newProps: Record<string, RJSFSchema> = {};

		for (const key of keys) {
			const found = findPropertyInTree(draft, key);
			if (!found) continue;

			const oldParent =
				found.parentSegments.length === 0
					? draft
					: resolveSchemaNode(draft, found.parentSegments);

			if (oldParent?.properties?.[key]) {
				delete (oldParent.properties as Record<string, RJSFSchema>)[key];
			}

			newProps[key] = found.node;
		}

		parent.type = parent.type ?? "object";
		parent.properties = newProps;
	}

	return draft;
}

export function removePropertyAtPointer(
	root: RJSFSchema,
	fullSegments: string[],
): RJSFSchema | null {
	if (fullSegments.length === 0) return null;

	const pk = parentOfPointer(`/${fullSegments.join("/")}`);
	if (!pk) return null;

	const draft = structuredClone(root);
	const parent = resolveSchemaNode(draft, pk.parentSegments);

	if (!parent?.properties?.[pk.key]) return null;

	delete parent.properties[pk.key];

	if (Array.isArray(parent.required)) {
		parent.required = parent.required.filter((k) => k !== pk.key);
		if (parent.required.length === 0) {
			delete parent.required;
		}
	}

	return draft;
}

export function listSchemaFields(
	schema: RJSFSchema,
	basePointer = "/",
	depth = 0,
): Array<{ pointer: string; depth: number; key: string; typeLabel: string }> {
	const rows: Array<{
		pointer: string;
		depth: number;
		key: string;
		typeLabel: string;
	}> = [];

	const props = (schema.properties ?? {}) as Record<string, RJSFSchema>;

	for (const key of Object.keys(props)) {
		const sub = props[key] as RJSFSchema;
		const pointer =
			basePointer === "/" ? `/${key}` : `${basePointer.replace(/\/$/, "")}/${key}`;
		const typeLabel =
			typeof sub.type === "string"
				? sub.type
				: Array.isArray(sub.type)
					? sub.type.join(" | ")
					: "?";

		rows.push({ pointer, depth, key, typeLabel });

		if (sub.type === "object" && sub.properties && Object.keys(sub.properties).length) {
			rows.push(...listSchemaFields(sub, pointer, depth + 1));
		}
	}

	return rows;
}

export function setUiWidgetAtPointer(
	ui: Record<string, unknown>,
	fieldPointer: string,
	widget: string | null,
): Record<string, unknown> {
	const segs = pointerSegments(fieldPointer);
	const next = structuredClone(ui) as Record<string, unknown>;

	if (segs.length === 0) return next;

	let cur: Record<string, unknown> = next;

	for (let i = 0; i < segs.length; i++) {
		const s = segs[i]!;

		if (i === segs.length - 1) {
			const prev = (cur[s] as Record<string, unknown>) ?? {};
			const merged = { ...prev };

			if (widget && widget.length > 0) {
				merged["ui:widget"] = widget;
			} else {
				delete merged["ui:widget"];
			}

			if (Object.keys(merged).length === 0) {
				delete cur[s];
			} else {
				cur[s] = merged;
			}
		} else {
			const child = (cur[s] as Record<string, unknown>) ?? {};
			cur[s] = child;
			cur = child;
		}
	}

	return next;
}

export function setUiObjectFieldTemplateAtPointer(
	ui: Record<string, unknown>,
	fieldPointer: string,
	template: string | null,
): Record<string, unknown> {
	const segs = pointerSegments(fieldPointer);
	const next = structuredClone(ui) as Record<string, unknown>;

	if (segs.length === 0) return next;

	let cur: Record<string, unknown> = next;

	for (let i = 0; i < segs.length; i++) {
		const s = segs[i]!;

		if (i === segs.length - 1) {
			const prev = (cur[s] as Record<string, unknown>) ?? {};
			const merged = { ...prev };

			if (template && template.length > 0) {
				merged["ui:ObjectFieldTemplate"] = template;
			} else {
				delete merged["ui:ObjectFieldTemplate"];
			}

			if (Object.keys(merged).length === 0) {
				delete cur[s];
			} else {
				cur[s] = merged;
			}
		} else {
			const child = (cur[s] as Record<string, unknown>) ?? {};
			cur[s] = child;
			cur = child;
		}
	}

	return next;
}

/**
 * Сохраняет привязку к V2-словарнику в `ui:options.dictionaryCode` (код справочника на бэкенде).
 * Для превью конструктора enum подставляются из API отдельным шагом.
 */
export function setUiDictionaryCodeAtPointer(
	ui: Record<string, unknown>,
	fieldPointer: string,
	dictionaryCode: string | null,
): Record<string, unknown> {
	const segs = pointerSegments(fieldPointer);
	const next = structuredClone(ui) as Record<string, unknown>;

	if (segs.length === 0) return next;

	let cur: Record<string, unknown> = next;

	for (let i = 0; i < segs.length; i++) {
		const s = segs[i]!;

		if (i === segs.length - 1) {
			const prev = (cur[s] as Record<string, unknown>) ?? {};
			const merged = { ...prev };

			const prevOpt = merged["ui:options"];
			const optBase =
				prevOpt && typeof prevOpt === "object" && !Array.isArray(prevOpt)
					? { ...(prevOpt as Record<string, unknown>) }
					: {};

			const code = dictionaryCode?.trim() ?? "";

			if (code) {
				optBase.dictionaryCode = code;
				merged["ui:options"] = optBase;
				if (merged["ui:widget"] === undefined || merged["ui:widget"] === "") {
					merged["ui:widget"] = "select";
				}
			} else {
				delete optBase.dictionaryCode;
				if (Object.keys(optBase).length === 0) {
					delete merged["ui:options"];
				} else {
					merged["ui:options"] = optBase;
				}
			}

			if (Object.keys(merged).length === 0) {
				delete cur[s];
			} else {
				cur[s] = merged;
			}
		} else {
			const child = (cur[s] as Record<string, unknown>) ?? {};
			cur[s] = child;
			cur = child;
		}
	}

	return next;
}

/** Частичное обновление `ui:options` узла uiSchema по JSON Pointer. */
export function patchUiOptionsAtPointer(
	ui: Record<string, unknown>,
	fieldPointer: string,
	patch: Record<string, unknown>,
): Record<string, unknown> {
	const segs = pointerSegments(fieldPointer);
	const next = structuredClone(ui) as Record<string, unknown>;
	if (segs.length === 0) return next;

	let cur: Record<string, unknown> = next;
	for (let i = 0; i < segs.length; i++) {
		const s = segs[i]!;
		if (i === segs.length - 1) {
			const prev = (cur[s] as Record<string, unknown>) ?? {};
			const merged = { ...prev };
			const prevOpt = merged["ui:options"];
			const optBase =
				prevOpt && typeof prevOpt === "object" && !Array.isArray(prevOpt)
					? { ...(prevOpt as Record<string, unknown>) }
					: {};
			merged["ui:options"] = { ...optBase, ...patch };
			cur[s] = merged;
		} else {
			const child = (cur[s] as Record<string, unknown>) ?? {};
			cur[s] = child;
			cur = child;
		}
	}
	return next;
}
