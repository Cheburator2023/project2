import { resolveSchemaNode } from "@react-client/features/v2/admin_constructor/utils/schemaMutators";
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

function filterVisibleObjectKeys(
	properties: RJSFSchema["properties"] | undefined,
	uiSlice: UiSchema,
): string[] {
	if (!properties || typeof properties !== "object") return [];
	return Object.keys(properties).filter(
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
	const visibleKeys = filterVisibleObjectKeys(props, uiSlice);
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
	const filtered: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(uiRecord)) {
		if (key.startsWith("ui:") || visibleKeys.includes(key)) {
			filtered[key] = value;
		}
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
	const branch = readUiAtPath(rootUi, path);
	if (!branch) return {};
	const { ["ui:order"]: _order, ["ui:options"]: _options, ...rest } =
		branch as Record<string, unknown>;
	return rest as UiSchema;
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
	const { ["ui:order"]: _order, ["ui:options"]: _options, ...rest } =
		itemsBranch as Record<string, unknown>;
	return rest as UiSchema;
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
	const schema = buildFilteredObjectSlice(node, uiSlice, options);
	if (!schema?.properties) return null;
	const visibleKeys = Object.keys(schema.properties);
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
	const schema = buildFilteredObjectSlice(node, uiSlice, options);
	if (!schema?.properties) return null;
	const visibleKeys = Object.keys(schema.properties);
	return {
		schema,
		uiSchema: buildFilteredUiSlice(uiSlice, visibleKeys),
	};
}
