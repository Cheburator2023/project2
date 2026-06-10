import {
	listOrderedChildKeys,
	resolveSchemaNode,
} from "@react-client/features/v2/admin_constructor/utils/schemaMutators";
import { isV2AnketaHiddenUiNode } from "@smart-anketa/api-contract";
import type { RJSFSchema, UiSchema } from "@rjsf/utils";

function dotPathToSegments(path: string): string[] {
	return path.split(".").filter(Boolean);
}

function readUiAtPath(
	uiSchema: UiSchema,
	path: string,
): UiSchema | undefined {
	const parts = dotPathToSegments(path);
	let current: unknown = uiSchema;
	for (const part of parts) {
		if (!current || typeof current !== "object" || Array.isArray(current)) {
			return undefined;
		}
		current = (current as Record<string, unknown>)[part];
	}
	if (!current || typeof current !== "object" || Array.isArray(current)) {
		return undefined;
	}
	return current as UiSchema;
}

function listVisibleOrderedChildKeys(
	properties: RJSFSchema["properties"] | undefined,
	uiSlice: UiSchema,
): string[] {
	if (!properties || typeof properties !== "object") return [];
	const props = properties as Record<string, RJSFSchema>;
	const wrapper: RJSFSchema = { type: "object", properties: props };
	return listOrderedChildKeys(wrapper, "/", uiSlice).filter(
		(key) => !isV2AnketaHiddenUiNode(uiSlice[key]),
	);
}

function buildFilteredObjectSlice(
	node: RJSFSchema,
	uiSlice: UiSchema,
	options?: { omitTitle?: boolean },
): RJSFSchema | null {
	const props = node.properties as Record<string, RJSFSchema> | undefined;
	if (!props) return null;
	const visibleKeys = listVisibleOrderedChildKeys(props, uiSlice);
	if (visibleKeys.length === 0) return null;
	const properties = Object.fromEntries(
		visibleKeys.map((key) => [key, props[key]!]),
	);
	const required = node.required?.filter((key) => visibleKeys.includes(key));
	return {
		type: "object",
		...(options?.omitTitle ? {} : { title: node.title }),
		properties,
		...(required?.length ? { required } : {}),
	};
}

function buildFilteredUiSlice(
	uiSlice: UiSchema,
	visibleKeys: string[],
): UiSchema {
	const uiRecord = uiSlice as Record<string, unknown>;
	const visibleSet = new Set(visibleKeys);
	const filtered: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(uiRecord)) {
		if (key.startsWith("ui:")) {
			if (key === "ui:order" && Array.isArray(value)) {
				const ordered = (value as string[]).filter((k) => visibleSet.has(k));
				const rest = visibleKeys.filter((k) => !ordered.includes(k));
				filtered[key] = [...ordered, ...rest];
			} else {
				filtered[key] = value;
			}
		} else if (visibleSet.has(key)) {
			filtered[key] = value;
		}
	}
	if (!filtered["ui:order"]) {
		filtered["ui:order"] = visibleKeys;
	}
	return filtered as UiSchema;
}

export function getObjectSchemaSlice(
	rootSchema: RJSFSchema,
	path: string,
	options?: { omitTitle?: boolean },
): RJSFSchema | null {
	const node = resolveSchemaNode(rootSchema, dotPathToSegments(path));
	if (!node || node.type !== "object") return null;
	return {
		type: "object",
		...(options?.omitTitle ? {} : { title: node.title }),
		properties: node.properties,
		required: node.required,
	};
}

export function getObjectUiSlice(
	rootUi: UiSchema,
	path: string,
): UiSchema {
	return readUiAtPath(rootUi, path) ?? {};
}

export function getArrayItemSchemaSlice(
	rootSchema: RJSFSchema,
	arrayPath: string,
	options?: { omitTitle?: boolean },
): RJSFSchema | null {
	const node = resolveSchemaNode(rootSchema, [
		...dotPathToSegments(arrayPath),
		"items",
	]);
	if (!node || node.type !== "object") return null;
	return {
		type: "object",
		...(options?.omitTitle ? {} : { title: node.title }),
		properties: node.properties,
		required: node.required,
	};
}

export function getArrayItemUiSlice(
	rootUi: UiSchema,
	arrayPath: string,
): UiSchema {
	const branch = readUiAtPath(rootUi, arrayPath);
	const itemsBranch = branch?.items as UiSchema | undefined;
	if (!itemsBranch || typeof itemsBranch !== "object") return {};
	return itemsBranch;
}

/** Схема объекта для модалки: без полей с ui:hidden. */
export function getObjectSchemaSliceForModal(
	rootSchema: RJSFSchema,
	rootUi: UiSchema,
	path: string,
	options?: { omitTitle?: boolean },
): { schema: RJSFSchema; uiSchema: UiSchema } | null {
	const node = resolveSchemaNode(rootSchema, dotPathToSegments(path));
	if (!node || node.type !== "object") return null;
	const uiSlice = getObjectUiSlice(rootUi, path);
	const props = node.properties as Record<string, RJSFSchema> | undefined;
	if (!props) return null;
	const visibleKeys = listVisibleOrderedChildKeys(props, uiSlice);
	if (visibleKeys.length === 0) return null;
	const schema = buildFilteredObjectSlice(node, uiSlice, options);
	if (!schema?.properties) return null;
	return {
		schema,
		uiSchema: buildFilteredUiSlice(uiSlice, visibleKeys),
	};
}

/** Схема элемента массива для модалки: без скрытых полей. */
export function getArrayItemSchemaSliceForModal(
	rootSchema: RJSFSchema,
	rootUi: UiSchema,
	arrayPath: string,
	options?: { omitTitle?: boolean },
): { schema: RJSFSchema; uiSchema: UiSchema } | null {
	const node = resolveSchemaNode(rootSchema, [
		...dotPathToSegments(arrayPath),
		"items",
	]);
	if (!node || node.type !== "object") return null;
	const uiSlice = getArrayItemUiSlice(rootUi, arrayPath);
	const props = node.properties as Record<string, RJSFSchema> | undefined;
	if (!props) return null;
	const visibleKeys = listVisibleOrderedChildKeys(props, uiSlice);
	if (visibleKeys.length === 0) return null;
	const schema = buildFilteredObjectSlice(node, uiSlice, options);
	if (!schema?.properties) return null;
	return {
		schema,
		uiSchema: buildFilteredUiSlice(uiSlice, visibleKeys),
	};
}
