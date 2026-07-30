/**
 * Стабильная идентичность полей/блоков схемы.
 * Path — производная от текущего jsonSchema/uiSchema; SoT — uid / blockUid / role.
 */

export const V2_UI_OPTION_SCHEMA_FIELD_UID = "schemaFieldUid";
export const V2_UI_OPTION_ARCH_BLOCK_UID = "archBlockUid";
export const V2_UI_OPTION_SEMANTIC_ROLE = "semanticRole";
export const V2_UI_OPTION_ARCH_COMPONENT = "archComponent";

/** Семантические роли для legacy СФЕРА / отклонений (не JSON-path). */
export const V2_SEMANTIC_ROLES = [
	"modelsList",
	"modelsCount",
	"algorithmType",
	"autoML",
	"readyPromReports",
	"pilotNeed",
	"prePromEval",
	"deploymentChannels",
	"sourceSystems",
	"modelService",
	"assessedInitiativesCount",
	"productionAdditionalReports",
	"uncertaintyAdjustment",
	"dataSourcesCount",
] as const;

export type V2SemanticRole = (typeof V2_SEMANTIC_ROLES)[number];

/** Arch-компоненты, из которых каталог ТР читает source-строки. */
export const V2_CATALOG_SOURCE_ARCH_BY_STREAM = {
	modelStream: "modelService",
	sourceSystems: "sourceSystem",
} as const;

export type V2SchemaFieldIndexEntry = {
	pointer: string;
	dotPath: string;
	leafKey: string;
	archComponent?: string;
	semanticRole?: string;
};

export type V2SchemaBlockIndexEntry = {
	pointer: string;
	dotPath: string;
	archComponent: string;
	archBlockUid?: string;
};

export type V2SchemaFieldIndex = {
	byUid: Map<string, V2SchemaFieldIndexEntry>;
	byBlockUid: Map<string, V2SchemaBlockIndexEntry>;
	/** Первый найденный блок данного archComponent → dotPath. */
	byArchComponent: Map<string, V2SchemaBlockIndexEntry>;
	/** semanticRole → schemaFieldUid (или blockUid для массивов). */
	byRole: Map<string, string>;
};

type JsonSchemaNode = {
	type?: string | string[];
	properties?: Record<string, JsonSchemaNode>;
	items?: JsonSchemaNode | JsonSchemaNode[];
};

function readRecord(value: unknown): Record<string, unknown> | undefined {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: undefined;
}

function schemaNodeType(node: JsonSchemaNode | undefined): string | null {
	if (!node) return null;
	if (typeof node.type === "string") return node.type;
	if (Array.isArray(node.type)) {
		return node.type.find((value) => value !== "null") ?? node.type[0] ?? null;
	}
	return null;
}

function objectItemsSchema(node: JsonSchemaNode): JsonSchemaNode | null {
	if (schemaNodeType(node) !== "array") return null;
	const items = node.items;
	if (!items) return null;
	if (Array.isArray(items)) return items[0] ?? null;
	return items;
}

function readUiBranch(
	uiSchema: Record<string, unknown> | undefined,
	segments: string[],
): Record<string, unknown> | undefined {
	if (!uiSchema) return undefined;
	let cur: unknown = uiSchema;
	for (const segment of segments) {
		if (segment === "items") {
			cur = (cur as Record<string, unknown> | undefined)?.items;
			continue;
		}
		cur = (cur as Record<string, unknown> | undefined)?.[segment];
	}
	return readRecord(cur);
}

function readUiOptions(
	uiBranch: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
	return readRecord(uiBranch?.["ui:options"]);
}

function pointerFromSegments(segments: string[]): string {
	if (segments.length === 0) return "/";
	return `/${segments.join("/")}`;
}

function dotPathFromSegments(segments: string[]): string {
	return segments.filter((segment) => segment !== "items").join(".");
}

function readStringOption(
	options: Record<string, unknown> | undefined,
	key: string,
): string | null {
	const value = options?.[key];
	return typeof value === "string" && value.trim() ? value.trim() : null;
}

/**
 * Строит индекс uid/blockUid/role → актуальный pointer/dotPath.
 * Перенос поля в конструкторе меняет только этот индекс, не привязки ТР.
 */
export function buildV2SchemaFieldIndex(
	jsonSchema: unknown,
	uiSchema: unknown,
): V2SchemaFieldIndex {
	const byUid = new Map<string, V2SchemaFieldIndexEntry>();
	const byBlockUid = new Map<string, V2SchemaBlockIndexEntry>();
	const byArchComponent = new Map<string, V2SchemaBlockIndexEntry>();
	const byRole = new Map<string, string>();

	const root = readRecord(jsonSchema) as JsonSchemaNode | undefined;
	const uiRoot = readRecord(uiSchema);
	if (!root?.properties) {
		return { byUid, byBlockUid, byArchComponent, byRole };
	}

	const walk = (
		node: JsonSchemaNode,
		schemaSegments: string[],
		uiSegments: string[],
	) => {
		const uiBranch = readUiBranch(uiRoot, uiSegments);
		const options = readUiOptions(uiBranch);
		const archComponent = readStringOption(options, V2_UI_OPTION_ARCH_COMPONENT);
		const archBlockUid = readStringOption(options, V2_UI_OPTION_ARCH_BLOCK_UID);
		const fieldUid = readStringOption(options, V2_UI_OPTION_SCHEMA_FIELD_UID);
		const semanticRole = readStringOption(options, V2_UI_OPTION_SEMANTIC_ROLE);

		const pointer = pointerFromSegments(schemaSegments);
		const dotPath = dotPathFromSegments(schemaSegments);
		const leafKey = schemaSegments.filter((s) => s !== "items").at(-1) ?? "";

		if (archComponent && dotPath) {
			const blockEntry: V2SchemaBlockIndexEntry = {
				pointer,
				dotPath,
				archComponent,
				archBlockUid: archBlockUid ?? undefined,
			};
			if (archBlockUid && !byBlockUid.has(archBlockUid)) {
				byBlockUid.set(archBlockUid, blockEntry);
			}
			if (!byArchComponent.has(archComponent)) {
				byArchComponent.set(archComponent, blockEntry);
			}
			if (semanticRole && !byRole.has(semanticRole)) {
				byRole.set(semanticRole, archBlockUid ?? `arch:${archComponent}`);
			}
		}

		if (fieldUid && leafKey) {
			const entry: V2SchemaFieldIndexEntry = {
				pointer,
				dotPath,
				leafKey,
				archComponent: archComponent ?? undefined,
				semanticRole: semanticRole ?? undefined,
			};
			if (!byUid.has(fieldUid)) {
				byUid.set(fieldUid, entry);
			}
			if (semanticRole && !byRole.has(semanticRole)) {
				byRole.set(semanticRole, fieldUid);
			}
		}

		const props = node.properties;
		if (props) {
			for (const [key, child] of Object.entries(props)) {
				walk(
					child,
					[...schemaSegments, key],
					[...uiSegments, key],
				);
			}
		}

		const items = objectItemsSchema(node);
		if (items) {
			walk(items, [...schemaSegments, "items"], [...uiSegments, "items"]);
		}
	};

	for (const [key, child] of Object.entries(root.properties)) {
		walk(child, [key], [key]);
	}

	return { byUid, byBlockUid, byArchComponent, byRole };
}

export function resolveDotPathByArchComponent(
	index: V2SchemaFieldIndex,
	archComponent: string,
	fallbackDotPath?: string | null,
): string | null {
	const fromIndex = index.byArchComponent.get(archComponent)?.dotPath;
	if (fromIndex) return fromIndex;
	return fallbackDotPath?.trim() || null;
}

export function resolveDotPathByBlockUid(
	index: V2SchemaFieldIndex,
	blockUid: string,
	fallbackDotPath?: string | null,
): string | null {
	const fromIndex = index.byBlockUid.get(blockUid)?.dotPath;
	if (fromIndex) return fromIndex;
	return fallbackDotPath?.trim() || null;
}

export function resolvePointerByFieldUid(
	index: V2SchemaFieldIndex,
	schemaFieldUid: string,
): string | null {
	return index.byUid.get(schemaFieldUid.trim())?.pointer ?? null;
}

export function resolveDotPathByFieldUid(
	index: V2SchemaFieldIndex,
	schemaFieldUid: string,
): string | null {
	return index.byUid.get(schemaFieldUid.trim())?.dotPath ?? null;
}

export function resolveFieldUidBySemanticRole(
	index: V2SchemaFieldIndex,
	role: string,
): string | null {
	return index.byRole.get(role.trim()) ?? null;
}

/** Читает formData по schema pointer (`/a/b/items/c`). */
export function readFormValueAtSchemaPointer(
	root: Record<string, unknown>,
	pointer: string,
): unknown {
	if (!pointer.startsWith("/")) return undefined;
	const segments = pointer.split("/").filter(Boolean);
	let cur: unknown = root;
	for (const segment of segments) {
		if (segment === "items") {
			if (Array.isArray(cur)) cur = cur[0];
			continue;
		}
		if (cur == null || typeof cur !== "object") return undefined;
		if (Array.isArray(cur)) cur = cur[0];
		if (cur == null || typeof cur !== "object") return undefined;
		cur = (cur as Record<string, unknown>)[segment];
	}
	return cur;
}

/** Читает formData по dot-path (`a.b.c`), учитывая arch object list (массив → первый элемент). */
export function readFormValueAtDotPath(
	root: Record<string, unknown>,
	dotPath: string,
): unknown {
	const parts = dotPath.split(".").filter(Boolean);
	let cur: unknown = root;
	for (const part of parts) {
		if (cur == null || typeof cur !== "object") return undefined;
		if (Array.isArray(cur)) {
			cur = cur[0];
			if (cur == null || typeof cur !== "object") return undefined;
		}
		cur = (cur as Record<string, unknown>)[part];
	}
	return cur;
}

export function resolveFormValueByFieldUid(
	formData: Record<string, unknown>,
	index: V2SchemaFieldIndex,
	schemaFieldUid: string,
): unknown {
	const pointer = resolvePointerByFieldUid(index, schemaFieldUid);
	if (!pointer) return undefined;
	return readFormValueAtSchemaPointer(formData, pointer);
}

export function resolveFormValueBySemanticRole(
	formData: Record<string, unknown>,
	index: V2SchemaFieldIndex,
	role: string,
): unknown {
	const id = resolveFieldUidBySemanticRole(index, role);
	if (!id) return undefined;
	if (id.startsWith("arch:")) {
		const arch = id.slice("arch:".length);
		const path = resolveDotPathByArchComponent(index, arch);
		if (!path) return undefined;
		return readFormValueAtDotPath(formData, path);
	}
	const fromUid = resolveFormValueByFieldUid(formData, index, id);
	if (fromUid !== undefined) return fromUid;
	const block = index.byBlockUid.get(id);
	if (block) return readFormValueAtDotPath(formData, block.dotPath);
	return undefined;
}

/**
 * Резолвит sourceArrayPath каталога: blockUid → archComponent → fallback path.
 */
export function resolveCatalogSourceArrayPath(options: {
	uiSchema?: unknown;
	jsonSchema?: unknown;
	sourceArchComponent?: string | null;
	sourceBlockUid?: string | null;
	fallbackPath?: string | null;
}): string | null {
	const { uiSchema, jsonSchema, sourceArchComponent, sourceBlockUid, fallbackPath } =
		options;
	if (!uiSchema && !jsonSchema) {
		return fallbackPath?.trim() || null;
	}
	const index = buildV2SchemaFieldIndex(jsonSchema, uiSchema);
	if (sourceBlockUid?.trim()) {
		const byUid = resolveDotPathByBlockUid(index, sourceBlockUid.trim(), null);
		if (byUid) return byUid;
	}
	if (sourceArchComponent?.trim()) {
		const byArch = resolveDotPathByArchComponent(
			index,
			sourceArchComponent.trim(),
			null,
		);
		if (byArch) return byArch;
	}
	return fallbackPath?.trim() || null;
}

/** JSON Pointer `/a/b` → dot `a.b` (без `items`). */
export function schemaPointerToDotPath(pointer: string): string {
	return pointer
		.split("/")
		.filter(Boolean)
		.filter((segment) => segment !== "items")
		.join(".");
}

function rewriteSchemaPathString(
	value: string,
	oldPointer: string,
	newPointer: string,
	oldDot: string,
	newDot: string,
): string {
	if (value === oldDot) return newDot;
	if (oldDot && value.startsWith(`${oldDot}.`)) {
		return `${newDot}${value.slice(oldDot.length)}`;
	}
	if (value === oldPointer) return newPointer;
	if (oldPointer !== "/" && value.startsWith(`${oldPointer}/`)) {
		return `${newPointer}${value.slice(oldPointer.length)}`;
	}
	return value;
}

/**
 * Мост при moveCanvasField: переписывает path-based JsonLogic / payload
 * (старые правила ещё хранят путь; uid-привязки не трогаем).
 */
export function rewriteSchemaPathsInValue(
	value: unknown,
	oldPointer: string,
	newPointer: string,
): unknown {
	const oldDot = schemaPointerToDotPath(oldPointer);
	const newDot = schemaPointerToDotPath(newPointer);
	if (oldPointer === newPointer && oldDot === newDot) return value;
	if (value === null || value === undefined) return value;
	if (typeof value === "string") {
		return rewriteSchemaPathString(
			value,
			oldPointer,
			newPointer,
			oldDot,
			newDot,
		);
	}
	if (Array.isArray(value)) {
		return value.map((item) =>
			rewriteSchemaPathsInValue(item, oldPointer, newPointer),
		);
	}
	if (typeof value === "object") {
		const next: Record<string, unknown> = {};
		for (const [key, child] of Object.entries(value)) {
			if (key === "var") {
				if (typeof child === "string") {
					next[key] = rewriteSchemaPathString(
						child,
						oldPointer,
						newPointer,
						oldDot,
						newDot,
					);
					continue;
				}
				if (Array.isArray(child) && typeof child[0] === "string") {
					next[key] = [
						rewriteSchemaPathString(
							child[0],
							oldPointer,
							newPointer,
							oldDot,
							newDot,
						),
						...child.slice(1),
					];
					continue;
				}
			}
			next[key] = rewriteSchemaPathsInValue(child, oldPointer, newPointer);
		}
		return next;
	}
	return value;
}
