import type { RJSFSchema, UiSchema } from "@rjsf/utils";
import { normalizeJsonPointer, parentOfPointer, pointerSegments } from "./schemaPaths";

/** UiSchema-ветка для родительского JSON Pointer (корень — `parentPointer` `/`). */
export function readUiSchemaBranchAtPointer(
	uiSchema: Record<string, unknown> | UiSchema | undefined,
	parentPointer: string,
): Record<string, unknown> | undefined {
	if (!uiSchema || typeof uiSchema !== "object") return undefined;
	const segs = pointerSegments(parentPointer);
	if (segs.length === 0) {
		return uiSchema as Record<string, unknown>;
	}
	let cur: unknown = uiSchema;
	for (const s of segs) {
		if (!cur || typeof cur !== "object" || Array.isArray(cur)) {
			return undefined;
		}
		cur = (cur as Record<string, unknown>)[s];
	}
	if (!cur || typeof cur !== "object" || Array.isArray(cur)) return undefined;
	return cur as Record<string, unknown>;
}

/** Порядок дочерних ключей: `ui:order` (как в RJSF), затем остальные из `properties`. */
export function listOrderedChildKeys(
	root: RJSFSchema,
	parentPointer: string,
	uiSchema?: UiSchema | Record<string, unknown>,
): string[] {
	const keys = listChildKeys(root, parentPointer);
	if (!uiSchema) return keys;

	const branch = readUiSchemaBranchAtPointer(uiSchema, parentPointer);
	const order = branch?.["ui:order"];
	if (!Array.isArray(order)) return keys;

	const ordered = (order as string[]).filter((k) => keys.includes(k));
	const rest = keys.filter((k) => !ordered.includes(k));
	return [...ordered, ...rest];
}

function groupIdToParentPointer(groupId: string): string {
	if (groupId === "schema-root") return "/";
	return groupId.replace("schema-group:", "");
}

function getMutableUiParent(
	ui: Record<string, unknown>,
	parentPointer: string,
): Record<string, unknown> {
	if (parentPointer === "/" || parentPointer === "") {
		return ui;
	}
	const segs = pointerSegments(parentPointer);
	let cur: Record<string, unknown> = ui;
	for (const seg of segs) {
		const child = (cur[seg] as Record<string, unknown>) ?? {};
		cur[seg] = child;
		cur = child;
	}
	return cur;
}

function walkSchemaParentPointers(
	schema: RJSFSchema,
	parentPointer: string,
	visit: (pointer: string) => void,
): void {
	visit(parentPointer);
	const segs = pointerSegments(parentPointer);
	const parent =
		segs.length === 0 ? schema : resolveSchemaNode(schema, segs);
	if (!parent) return;

	for (const key of listChildKeys(schema, parentPointer)) {
		const childPointer =
			parentPointer === "/" ? `/${key}` : `${parentPointer.replace(/\/$/, "")}/${key}`;
		const node = resolveSchemaNode(schema, pointerSegments(childPointer));
		if (isObjectFieldGroup(node)) {
			walkSchemaParentPointers(schema, childPointer, visit);
		}
		const itemsObj = getObjectItemsSchema(node);
		if (itemsObj && Object.keys(itemsObj.properties ?? {}).length > 0) {
			walkSchemaParentPointers(schema, `${childPointer}/items`, visit);
		}
	}
}

/** Ищет первое вхождение ключа свойства в дереве схемы. */
export function findPropertyPointerByKey(
	schema: RJSFSchema,
	key: string,
): string | null {
	let result: string | null = null;

	function walk(node: RJSFSchema, segs: string[]): void {
		if (result) return;
		const props = (node.properties ?? {}) as Record<string, RJSFSchema>;
		for (const childKey of Object.keys(props)) {
			const nextSegs = [...segs, childKey];
			if (childKey === key) {
				result = `/${nextSegs.join("/")}`;
				return;
			}
			walk(props[childKey]!, nextSegs);
			const itemsObj = getObjectItemsSchema(props[childKey]);
			if (itemsObj) {
				walk(itemsObj, [...nextSegs, "items"]);
			}
		}
	}

	walk(schema, []);
	return result;
}

function filterDominatedNestedKeys(
	schema: RJSFSchema,
	keys: Set<string>,
): Set<string> {
	const nodeByKey = collectPropertyNodes(schema);
	const result = new Set<string>();

	for (const key of keys) {
		const loc = nodeByKey.get(key);
		if (!loc) continue;

		let dominated = false;
		for (const ancestorKey of keys) {
			if (ancestorKey === key) continue;
			const ancestorLoc = nodeByKey.get(ancestorKey);
			if (!ancestorLoc) continue;

			const ancestorPath = [...ancestorLoc.parentSegments, ancestorKey];
			const keyPath = [...loc.parentSegments, key];
			if (
				keyPath.length > ancestorPath.length &&
				ancestorPath.every((seg, i) => keyPath[i] === seg)
			) {
				dominated = true;
				break;
			}
		}

		if (!dominated) result.add(key);
	}

	return result;
}

/** Ключи, реально изменившие родителя или порядок между initial и final orders. */
export function resolveChangedDirectMoveKeys(
	schema: RJSFSchema,
	initialOrders: Record<string, string[]>,
	finalOrders: Record<string, string[]>,
): Set<string> {
	const changed = new Set<string>();
	const groupIds = new Set([
		...Object.keys(initialOrders),
		...Object.keys(finalOrders),
	]);

	for (const groupId of groupIds) {
		const before = initialOrders[groupId] ?? [];
		const after = finalOrders[groupId] ?? [];
		const beforeSet = new Set(before);

		for (const key of before) {
			if (!after.includes(key)) changed.add(key);
		}
		for (const key of after) {
			if (!beforeSet.has(key)) changed.add(key);
		}
		if (before.join("|") !== after.join("|")) {
			for (const key of after) {
				if (before.indexOf(key) !== after.indexOf(key)) changed.add(key);
			}
		}
	}

	return filterDominatedNestedKeys(schema, changed);
}

function shouldApplyUiOrderGroup(
	groupId: string,
	keys: string[],
	directMoveKeys: Set<string>,
	sourceParentByKey: Map<string, string>,
): boolean {
	const parentPointer = groupIdToParentPointer(groupId);
	for (const key of directMoveKeys) {
		if (keys.includes(key)) return true;
		if (sourceParentByKey.get(key) === parentPointer) return true;
	}
	return false;
}

/** Путь поля для списка на холсте: прямой или фактический в схеме (при DnD между группами). */
export function resolveFieldPointerForListKey(
	key: string,
	listParentPointer: string,
	schema: RJSFSchema,
): string {
	const direct =
		listParentPointer === "/"
			? `/${key}`
			: `${listParentPointer.replace(/\/$/, "")}/${key}`;
	if (resolveSchemaNode(schema, pointerSegments(direct))) {
		return direct;
	}
	return findPropertyPointerByKey(schema, key) ?? direct;
}

export function applyGroupFieldOrdersToUiSchema(
	ui: UiSchema,
	schema: RJSFSchema,
	initialOrders: Record<string, string[]>,
	finalOrders: Record<string, string[]>,
): UiSchema {
	const sourceUi = ui as Record<string, unknown>;
	const directMoveKeys = resolveChangedDirectMoveKeys(
		schema,
		initialOrders,
		finalOrders,
	);
	if (!directMoveKeys.size) return structuredClone(ui);

	const branchByKey = new Map<string, Record<string, unknown>>();
	const sourceParentByKey = new Map<string, string>();

	walkSchemaParentPointers(schema, "/", (parentPointer) => {
		for (const key of listChildKeys(schema, parentPointer)) {
			if (!directMoveKeys.has(key) || branchByKey.has(key)) continue;
			const pointer =
				parentPointer === "/"
					? `/${key}`
					: `${parentPointer.replace(/\/$/, "")}/${key}`;
			const branch = readUiSchemaBranchAtPointer(sourceUi, pointer);
			if (branch) {
				branchByKey.set(key, structuredClone(branch));
				sourceParentByKey.set(key, parentPointer);
			}
		}
	});

	const next = structuredClone(sourceUi) as Record<string, unknown>;

	for (const [key, sourceParent] of sourceParentByKey) {
		const parentNode = getMutableUiParent(next, sourceParent);
		delete parentNode[key];
		if (Array.isArray(parentNode["ui:order"])) {
			parentNode["ui:order"] = (parentNode["ui:order"] as string[]).filter(
				(k) => k !== key,
			);
			if ((parentNode["ui:order"] as string[]).length === 0) {
				delete parentNode["ui:order"];
			}
		}
	}

	for (const [groupId, keys] of Object.entries(finalOrders)) {
		if (!shouldApplyUiOrderGroup(groupId, keys, directMoveKeys, sourceParentByKey)) {
			continue;
		}

		const parentPointer = groupIdToParentPointer(groupId);
		const parentNode = getMutableUiParent(next, parentPointer);
		parentNode["ui:order"] = [...keys];

		for (const key of keys) {
			if (!directMoveKeys.has(key)) continue;
			const branch = branchByKey.get(key);
			if (branch) {
				parentNode[key] = branch;
			}
		}

		for (const propKey of Object.keys(parentNode)) {
			if (propKey.startsWith("ui:")) continue;
			if (directMoveKeys.has(propKey) && !keys.includes(propKey)) {
				delete parentNode[propKey];
			}
		}
	}

	return next as UiSchema;
}

/**
 * Разрешает узел схемы по JSON Pointer сегментам.
 * Поддерживает сегмент `items` для входа в элементы массива
 * (`/sourceSystems/items/name` → schema.sourceSystems.items.properties.name).
 */
export function resolveSchemaNode(
	root: RJSFSchema,
	segments: string[],
): RJSFSchema | undefined {
	let cur: RJSFSchema = root;
	for (const seg of segments) {
		const fromProps = cur.properties?.[seg] as RJSFSchema | undefined;
		if (fromProps) {
			cur = fromProps;
			continue;
		}
		if (seg === "items" && isPlainObject(cur.items)) {
			cur = cur.items as RJSFSchema;
			continue;
		}
		return undefined;
	}
	return cur;
}

function isPlainObject(value: unknown): value is RJSFSchema {
	return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/** Объектная схема элементов массива (для массивов объектов), либо undefined. */
export function getObjectItemsSchema(
	node: RJSFSchema | undefined,
): RJSFSchema | undefined {
	if (!node || node.type !== "array") return undefined;
	const items = node.items;
	if (!isPlainObject(items)) return undefined;
	const itemsSchema = items as RJSFSchema;
	return itemsSchema.type === "object" || itemsSchema.properties
		? itemsSchema
		: undefined;
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
		const fromProps = cur.properties?.[seg] as RJSFSchema | undefined;
		if (fromProps) {
			cur = fromProps;
			continue;
		}
		if (seg === "items" && isPlainObject(cur.items)) {
			cur = cur.items as RJSFSchema;
			continue;
		}
		return null;
	}

	const leaf = fullSegments[fullSegments.length - 1]!;
	if (!cur.properties?.[leaf]) return null;

	const merged = { ...(cur.properties[leaf] as RJSFSchema) };
	for (const [key, value] of Object.entries(patch)) {
		if (value === undefined) {
			delete merged[key as keyof RJSFSchema];
		} else {
			(merged as Record<string, unknown>)[key] = value;
		}
	}
	cur.properties[leaf] = merged;

	return draft;
}

const OBJECT_ONLY_KEYS = [
	"properties",
	"required",
	"additionalProperties",
	"minProperties",
	"maxProperties",
] as const;

const ARRAY_ONLY_KEYS = ["items", "minItems", "maxItems", "uniqueItems"] as const;

const STRING_ONLY_KEYS = [
	"minLength",
	"maxLength",
	"pattern",
	"format",
] as const;

const NUMBER_ONLY_KEYS = [
	"minimum",
	"maximum",
	"exclusiveMinimum",
	"exclusiveMaximum",
	"multipleOf",
] as const;

/** Патч смены типа поля: убирает несовместимые ключи JSON Schema и задаёт дефолты. */
export function buildFieldTypeTransitionPatch(
	current: RJSFSchema | undefined,
	nextType: string,
): Partial<RJSFSchema> {
	const patch: Partial<RJSFSchema> = {
		type: nextType as RJSFSchema["type"],
	};

	const strip = (...keys: readonly string[]) => {
		for (const key of keys) {
			if (current && key in current) {
				(patch as Record<string, undefined>)[key] = undefined;
			}
		}
	};

	switch (nextType) {
		case "string":
			strip(...OBJECT_ONLY_KEYS, ...ARRAY_ONLY_KEYS, ...NUMBER_ONLY_KEYS);
			break;
		case "number":
		case "integer":
			strip(
				...OBJECT_ONLY_KEYS,
				...ARRAY_ONLY_KEYS,
				...STRING_ONLY_KEYS,
				"enum",
				"enumNames",
			);
			break;
		case "boolean":
			strip(
				...OBJECT_ONLY_KEYS,
				...ARRAY_ONLY_KEYS,
				...STRING_ONLY_KEYS,
				...NUMBER_ONLY_KEYS,
				"enum",
				"enumNames",
			);
			break;
		case "object":
			strip(...ARRAY_ONLY_KEYS, "enum", "enumNames");
			if (!current?.properties) {
				patch.properties = {};
			}
			break;
		case "array":
			strip(...OBJECT_ONLY_KEYS, "enum", "enumNames", ...STRING_ONLY_KEYS);
			if (!current?.items) {
				patch.items = {
					type: "object",
					title: "Элемент",
					properties: {},
				};
			}
			break;
		default:
			break;
	}

	return patch;
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
	if (parent.type !== "object") return null;

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
	return node.type === "object";
}

function collectPropertyNodes(
	root: RJSFSchema,
): Map<string, { parentSegments: string[]; node: RJSFSchema }> {
	const nodes = new Map<string, { parentSegments: string[]; node: RJSFSchema }>();

	function walk(
		schema: RJSFSchema,
		parentSegments: string[],
	): void {
		const props = (schema.properties ?? {}) as Record<string, RJSFSchema>;
		for (const childKey of Object.keys(props)) {
			if (!nodes.has(childKey)) {
				nodes.set(childKey, { parentSegments, node: props[childKey]! });
			}
			walk(props[childKey]!, [...parentSegments, childKey]);
		}

		const itemsObj = getObjectItemsSchema(schema);
		if (itemsObj?.properties) {
			const itemProps = itemsObj.properties as Record<string, RJSFSchema>;
			for (const itemKey of Object.keys(itemProps)) {
				if (!nodes.has(itemKey)) {
					nodes.set(itemKey, {
						parentSegments: [...parentSegments, "items"],
						node: itemProps[itemKey]!,
					});
				}
				walk(itemProps[itemKey]!, [...parentSegments, "items", itemKey]);
			}
		}
	}

	walk(root, []);
	return nodes;
}

export function findPropertyInTree(
	root: RJSFSchema,
	key: string,
): { parentSegments: string[]; node: RJSFSchema } | null {
	return collectPropertyNodes(root).get(key) ?? null;
}

function removeFirstPropertyKeyFromTree(
	root: RJSFSchema,
	key: string,
): boolean {
	function walk(node: RJSFSchema): boolean {
		const props = (node.properties ?? {}) as Record<string, RJSFSchema>;
		if (props[key]) {
			delete props[key];
			if (Array.isArray(node.required)) {
				node.required = node.required.filter((k) => k !== key);
				if (node.required.length === 0) delete node.required;
			}
			return true;
		}
		for (const child of Object.values(props)) {
			if (walk(child)) return true;
			const itemsObj = getObjectItemsSchema(child);
			if (itemsObj && walk(itemsObj)) return true;
		}
		return false;
	}

	return walk(root);
}

export function applyGroupFieldOrdersToSchema(
	root: RJSFSchema,
	initialOrders: Record<string, string[]>,
	finalOrders: Record<string, string[]>,
): RJSFSchema | null {
	const directMoveKeys = resolveChangedDirectMoveKeys(
		root,
		initialOrders,
		finalOrders,
	);
	if (!directMoveKeys.size) return structuredClone(root);

	const nodeByKey = collectPropertyNodes(root);
	const nodesByKey = new Map<string, RJSFSchema>();
	for (const key of directMoveKeys) {
		const found = nodeByKey.get(key);
		if (found) nodesByKey.set(key, structuredClone(found.node));
	}

	const draft = structuredClone(root);
	for (const key of directMoveKeys) {
		removeFirstPropertyKeyFromTree(draft, key);
	}

	for (const [groupId, keys] of Object.entries(finalOrders)) {
		const parentPointer = groupIdToParentPointer(groupId);
		const parentSegments = pointerSegments(parentPointer);
		const parent =
			parentSegments.length === 0
				? draft
				: resolveSchemaNode(draft, parentSegments);

		if (!parent || parent.type !== "object") continue;

		const touchesGroup = keys.some((key) => directMoveKeys.has(key));
		const before = initialOrders[groupId] ?? [];
		if (!touchesGroup && before.join("|") === keys.join("|")) continue;

		const existingProps = (parent.properties ?? {}) as Record<string, RJSFSchema>;
		const newProps: Record<string, RJSFSchema> = {};
		for (const key of keys) {
			const moved = nodesByKey.get(key);
			if (moved) {
				newProps[key] = moved;
			} else if (existingProps[key]) {
				newProps[key] = existingProps[key];
			}
		}
		parent.properties = newProps;
	}

	return draft;
}

function remapNestedGroupOrderKeys(
	orders: Record<string, string[]>,
	movedKey: string,
	sourceGroupId: string,
	targetGroupId: string,
): void {
	if (sourceGroupId === targetGroupId) return;

	const sourceParent = groupIdToParentPointer(sourceGroupId);
	const targetParent = groupIdToParentPointer(targetGroupId);
	const oldPrefix =
		sourceParent === "/"
			? `schema-group:/${movedKey}`
			: `schema-group:${sourceParent}/${movedKey}`;
	const newPrefix =
		targetParent === "/"
			? `schema-group:/${movedKey}`
			: `schema-group:${targetParent}/${movedKey}`;

	const remapped: Record<string, string[]> = {};
	for (const [groupId, groupKeys] of Object.entries(orders)) {
		if (groupId === oldPrefix || groupId.startsWith(`${oldPrefix}/`)) {
			const suffix = groupId.slice(oldPrefix.length);
			remapped[`${newPrefix}${suffix}`] = groupKeys;
			delete orders[groupId];
		}
	}
	Object.assign(orders, remapped);
}

/** Перенос одного поля между списками (источник → цель) с полными массивами ключей. */
export function buildOrdersForFieldMove(
	initialOrders: Record<string, string[]>,
	key: string,
	sourceGroupId: string,
	targetGroupId: string,
	targetIndex: number,
): Record<string, string[]> {
	const next = structuredClone(initialOrders) as Record<string, string[]>;
	const sourceKeys = [...(next[sourceGroupId] ?? [])];
	const sourcePos = sourceKeys.indexOf(key);
	if (sourcePos >= 0) {
		sourceKeys.splice(sourcePos, 1);
	}
	next[sourceGroupId] = sourceKeys;

	const targetKeys = [...(next[targetGroupId] ?? [])].filter((k) => k !== key);
	let insertIndex = targetIndex;
	if (
		sourceGroupId === targetGroupId &&
		sourcePos >= 0 &&
		sourcePos < targetIndex
	) {
		insertIndex = targetIndex - 1;
	}
	const safeIndex = Math.max(0, Math.min(insertIndex, targetKeys.length));
	targetKeys.splice(safeIndex, 0, key);
	next[targetGroupId] = targetKeys;

	remapNestedGroupOrderKeys(next, key, sourceGroupId, targetGroupId);

	return next;
}

function readUiParentAtSegments(
	ui: Record<string, unknown>,
	segments: string[],
): Record<string, unknown> | null {
	let cur: Record<string, unknown> = ui;
	for (const seg of segments) {
		const child = cur[seg];
		if (!child || typeof child !== "object" || Array.isArray(child)) return null;
		cur = child as Record<string, unknown>;
	}
	return cur;
}

export function removeUiSchemaAtPointer(
	ui: Record<string, unknown>,
	fieldPointer: string,
): Record<string, unknown> {
	const pk = parentOfPointer(fieldPointer);
	if (!pk) return ui;

	const next = structuredClone(ui) as Record<string, unknown>;
	const parent = readUiParentAtSegments(next, pk.parentSegments);
	if (!parent) return next;

	delete parent[pk.key];

	const order = parent["ui:order"];
	if (Array.isArray(order)) {
		parent["ui:order"] = order.filter((k) => k !== pk.key);
	}

	return next;
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

function isSameOrDescendantPointer(pointer: string, maybeAncestor: string): boolean {
	const normalizedPointer = normalizeJsonPointer(pointer);
	const normalizedAncestor = normalizeJsonPointer(maybeAncestor);
	return (
		normalizedPointer === normalizedAncestor ||
		normalizedPointer.startsWith(`${normalizedAncestor.replace(/\/$/, "")}/`)
	);
}

function pointerFromSegments(segments: string[]): string {
	return segments.length === 0 ? "/" : `/${segments.join("/")}`;
}

function orderedSchemaKeysForInsert(
	parent: RJSFSchema,
	key: string,
	index: number,
): string[] {
	const keys = Object.keys((parent.properties ?? {}) as Record<string, unknown>);
	const withoutKey = keys.filter((k) => k !== key);
	const safeIndex = Math.max(0, Math.min(index, withoutKey.length));
	withoutKey.splice(safeIndex, 0, key);
	return withoutKey;
}

/** Точный перенос поля по JSON Pointer. Не использует fieldKey глобально, чтобы не трогать одноимённые поля в других группах. */
export function movePropertyAtPointer(
	root: RJSFSchema,
	sourcePointer: string,
	targetParentPointer: string,
	targetIndex: number,
): RJSFSchema | null {
	const sourcePk = parentOfPointer(sourcePointer);
	if (!sourcePk) return null;
	if (isSameOrDescendantPointer(targetParentPointer, sourcePointer)) return null;

	const sourceNode = resolveSchemaNode(root, pointerSegments(sourcePointer));
	if (!sourceNode) return null;

	const sourceParent = resolveSchemaNode(root, sourcePk.parentSegments);
	const sourceKeys = Object.keys(
		(sourceParent?.properties ?? {}) as Record<string, unknown>,
	);
	const sourceIndex = sourceKeys.indexOf(sourcePk.key);
	const sameParent =
		pointerFromSegments(sourcePk.parentSegments) ===
		normalizeJsonPointer(targetParentPointer);
	const effectiveIndex =
		sameParent && sourceIndex >= 0 && sourceIndex < targetIndex
			? targetIndex - 1
			: targetIndex;

	const draft = structuredClone(root);
	const draftSourceParent = resolveSchemaNode(draft, sourcePk.parentSegments);
	if (!draftSourceParent?.properties?.[sourcePk.key]) return null;

	delete draftSourceParent.properties[sourcePk.key];
	if (Array.isArray(draftSourceParent.required)) {
		draftSourceParent.required = draftSourceParent.required.filter(
			(k) => k !== sourcePk.key,
		);
		if (draftSourceParent.required.length === 0) {
			delete draftSourceParent.required;
		}
	}

	const targetParent = resolveSchemaNode(
		draft,
		pointerSegments(targetParentPointer),
	);
	if (!targetParent || targetParent.type !== "object") return null;
	if (targetParent.properties?.[sourcePk.key]) return null;

	targetParent.properties = {
		...((targetParent.properties ?? {}) as Record<string, RJSFSchema>),
		[sourcePk.key]: structuredClone(sourceNode),
	};

	return reorderChildProperties(
		draft,
		pointerSegments(targetParentPointer),
		orderedSchemaKeysForInsert(targetParent, sourcePk.key, effectiveIndex),
	);
}

/** Точный перенос ветки uiSchema вместе с ui:order. */
export function moveUiSchemaBranchAtPointer(
	ui: Record<string, unknown>,
	sourcePointer: string,
	targetParentPointer: string,
	targetIndex: number,
): Record<string, unknown> {
	const sourcePk = parentOfPointer(sourcePointer);
	if (!sourcePk) return ui;
	if (isSameOrDescendantPointer(targetParentPointer, sourcePointer)) return ui;

	const next = structuredClone(ui) as Record<string, unknown>;
	const sourceParent = readUiParentAtSegments(next, sourcePk.parentSegments);
	const sourceBranch = sourceParent?.[sourcePk.key];
	const sourceOrder = Array.isArray(sourceParent?.["ui:order"])
		? ([...(sourceParent!["ui:order"] as string[])] as string[])
		: [];
	const sourceIndex = sourceOrder.indexOf(sourcePk.key);
	const sameParent =
		pointerFromSegments(sourcePk.parentSegments) ===
		normalizeJsonPointer(targetParentPointer);
	const effectiveIndex =
		sameParent && sourceIndex >= 0 && sourceIndex < targetIndex
			? targetIndex - 1
			: targetIndex;

	if (sourceParent) {
		delete sourceParent[sourcePk.key];
		if (Array.isArray(sourceParent["ui:order"])) {
			sourceParent["ui:order"] = (sourceParent["ui:order"] as string[]).filter(
				(k) => k !== sourcePk.key,
			);
		}
	}

	const targetParent = getMutableUiParent(next, targetParentPointer);
	if (
		sourceBranch &&
		typeof sourceBranch === "object" &&
		!Array.isArray(sourceBranch) &&
		!targetParent[sourcePk.key]
	) {
		targetParent[sourcePk.key] = sourceBranch;
	}

	const currentOrder = Array.isArray(targetParent["ui:order"])
		? [...(targetParent["ui:order"] as string[])]
		: Object.keys(targetParent).filter((key) => !key.startsWith("ui:"));
	const withoutKey = currentOrder.filter((key) => key !== sourcePk.key);
	const safeIndex = Math.max(0, Math.min(effectiveIndex, withoutKey.length));
	withoutKey.splice(safeIndex, 0, sourcePk.key);
	targetParent["ui:order"] = withoutKey;

	return next;
}

export type DuplicateFieldResult = {
	schema: RJSFSchema;
	ui: Record<string, unknown>;
	newPointer: string;
};

/** Копирует поле (включая вложенные schema/ui) и вставляет сразу после оригинала. */
export function duplicateFieldAtPointer(
	root: RJSFSchema,
	ui: Record<string, unknown>,
	sourcePointer: string,
	newKey: string,
): DuplicateFieldResult | null {
	const sourcePk = parentOfPointer(sourcePointer);
	if (!sourcePk) return null;

	const sourceNode = resolveSchemaNode(root, pointerSegments(sourcePointer));
	if (!sourceNode) return null;

	const parentPointer = pointerFromSegments(sourcePk.parentSegments);
	const siblings = listOrderedChildKeys(root, parentPointer, ui);
	const sourceIndex = siblings.indexOf(sourcePk.key);
	const insertIndex = sourceIndex >= 0 ? sourceIndex + 1 : siblings.length;

	const nextSchema = insertChildPropertyAt(
		root,
		sourcePk.parentSegments,
		newKey,
		structuredClone(sourceNode) as RJSFSchema,
		insertIndex,
	);
	if (!nextSchema) return null;

	const newPointer =
		parentPointer === "/"
			? `/${newKey}`
			: `${normalizeJsonPointer(parentPointer)}/${newKey}`;

	let nextUi = insertKeyToUiOrderAtPointer(
		ui,
		parentPointer,
		newKey,
		insertIndex,
	);

	const sourceUiBranch = readUiSchemaBranchAtPointer(ui, sourcePointer);
	if (sourceUiBranch) {
		nextUi = mergeUiBranchAtPointer(nextUi, newPointer, sourceUiBranch);
	}

	const parentNode = resolveSchemaNode(nextSchema, sourcePk.parentSegments);
	if (
		parentNode &&
		Array.isArray(parentNode.required) &&
		parentNode.required.includes(sourcePk.key)
	) {
		parentNode.required = [...parentNode.required, newKey];
	}

	return { schema: nextSchema, ui: nextUi, newPointer };
}

export function listSchemaFields(
	schema: RJSFSchema,
	basePointer = "/",
	depth = 0,
	uiSchema?: UiSchema | Record<string, unknown>,
): Array<{ pointer: string; depth: number; key: string; typeLabel: string }> {
	const rows: Array<{
		pointer: string;
		depth: number;
		key: string;
		typeLabel: string;
	}> = [];

	const keys = listOrderedChildKeys(schema, basePointer, uiSchema);

	for (const key of keys) {
		const segs = pointerSegments(basePointer);
		const parent =
			segs.length === 0 ? schema : resolveSchemaNode(schema, segs);
		const sub = (parent?.properties?.[key] ?? {}) as RJSFSchema;
		const pointer =
			basePointer === "/" ? `/${key}` : `${basePointer.replace(/\/$/, "")}/${key}`;
		const typeLabel =
			typeof sub.type === "string"
				? sub.type
				: Array.isArray(sub.type)
					? sub.type.join(" | ")
					: "?";

		rows.push({ pointer, depth, key, typeLabel });

		if (isObjectFieldGroup(sub) && Object.keys(sub.properties ?? {}).length > 0) {
			rows.push(...listSchemaFields(sub, pointer, depth + 1, uiSchema));
		}

		const itemsObj = getObjectItemsSchema(sub);
		if (itemsObj && Object.keys(itemsObj.properties ?? {}).length > 0) {
			rows.push(
				...listSchemaFields(itemsObj, `${pointer}/items`, depth + 1, uiSchema),
			);
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

/** Удаляет per-field `ui:ObjectFieldTemplate` — в превью всегда глобальный V2-шаблон. */
export function stripUiObjectFieldTemplatesFromUi(
	ui: Record<string, unknown>,
): Record<string, unknown> {
	function walk(node: Record<string, unknown>): Record<string, unknown> {
		const next: Record<string, unknown> = { ...node };
		delete next["ui:ObjectFieldTemplate"];

		for (const [key, value] of Object.entries(next)) {
			if (key.startsWith("ui:")) continue;
			if (value && typeof value === "object" && !Array.isArray(value)) {
				next[key] = walk(value as Record<string, unknown>);
			}
		}
		return next;
	}

	return walk(ui);
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
				merged["ui:widget"] = "select";
			} else {
				delete optBase.dictionaryCode;
				delete optBase.multiple;
				if (
					merged["ui:widget"] === "select" ||
					merged["ui:widget"] === "SelectWidget"
				) {
					delete merged["ui:widget"];
				}
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

/** Синхронизирует ui:widget при привязке справочника и переключении multiple. */
export function syncDictionaryFieldUiAtPointer(
	ui: Record<string, unknown>,
	fieldPointer: string,
	patch: { dictionaryCode?: string | null; multiple?: boolean },
): Record<string, unknown> {
	const segs = pointerSegments(fieldPointer);
	if (segs.length === 0) return ui;

	let withOptions = ui;
	if (patch.dictionaryCode !== undefined || patch.multiple !== undefined) {
		const optionsPatch: Record<string, unknown> = {};
		if (patch.dictionaryCode !== undefined) {
			const code = patch.dictionaryCode?.trim() ?? "";
			if (code) optionsPatch.dictionaryCode = code;
			else optionsPatch.dictionaryCode = undefined;
		}
		if (patch.multiple !== undefined) {
			optionsPatch.multiple = patch.multiple ? true : undefined;
		}
		withOptions = patchUiOptionsAtPointer(ui, fieldPointer, optionsPatch);
	}

	const leaf = readUiSchemaBranchAtPointer(withOptions, fieldPointer);
	const opt =
		leaf?.["ui:options"] &&
		typeof leaf["ui:options"] === "object" &&
		!Array.isArray(leaf["ui:options"])
			? (leaf["ui:options"] as Record<string, unknown>)
			: undefined;
	const dictionaryCode =
		typeof opt?.dictionaryCode === "string" ? opt.dictionaryCode.trim() : "";

	return dictionaryCode
		? setUiWidgetAtPointer(withOptions, fieldPointer, "select")
		: withOptions;
}

/** Переключение справочника между одиночным (string) и множественным (array of string). */
export function buildDictionaryMultiSchemaPatch(
	enable: boolean,
): Partial<RJSFSchema> {
	if (enable) {
		return {
			type: "array",
			items: { type: "string" },
			uniqueItems: true,
			enum: undefined,
			enumNames: undefined,
		};
	}
	return {
		type: "string",
		items: undefined,
		uniqueItems: undefined,
		minItems: undefined,
		maxItems: undefined,
	};
}

/** Частичное обновление `ui:options` узла uiSchema по JSON Pointer. */
/** Скрытие поля/группы в форме анкеты (`ui:options.hidden` + `ui:widget: hidden`). */
export function setUiHiddenAtPointer(
	ui: Record<string, unknown>,
	fieldPointer: string,
	hidden: boolean,
): Record<string, unknown> {
	if (hidden) {
		return setUiWidgetAtPointer(
			patchUiOptionsAtPointer(ui, fieldPointer, { hidden: true }),
			fieldPointer,
			"hidden",
		);
	}

	const segs = pointerSegments(fieldPointer);
	const next = structuredClone(ui) as Record<string, unknown>;
	if (segs.length === 0) return next;

	let cur: Record<string, unknown> = next;
	for (let i = 0; i < segs.length; i++) {
		const s = segs[i]!;
		if (i === segs.length - 1) {
			const prev = (cur[s] as Record<string, unknown>) ?? {};
			const merged = { ...prev };
			delete merged["ui:widget"];
			const prevOpt = merged["ui:options"];
			if (
				prevOpt &&
				typeof prevOpt === "object" &&
				!Array.isArray(prevOpt)
			) {
				const opt = { ...(prevOpt as Record<string, unknown>) };
				delete opt.hidden;
				if (Object.keys(opt).length === 0) {
					delete merged["ui:options"];
				} else {
					merged["ui:options"] = opt;
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

/** Сливает ветку uiSchema на узле (дочерние ключи properties, ui:order, …). */
/** Добавляет ключ в ui:order родительской ветки (корень или вложенный object). */
export function appendKeyToUiOrderAtPointer(
	ui: Record<string, unknown>,
	parentPointer: string,
	key: string,
): Record<string, unknown> {
	const next = structuredClone(ui) as Record<string, unknown>;
	const normalizedParent =
		parentPointer === "/" || parentPointer === "" ? "/" : parentPointer;

	let parentNode: Record<string, unknown>;
	if (normalizedParent === "/") {
		parentNode = next;
	} else {
		const segs = pointerSegments(normalizedParent);
		let cur: Record<string, unknown> = next;
		for (const seg of segs) {
			const child = (cur[seg] as Record<string, unknown>) ?? {};
			cur[seg] = child;
			cur = child;
		}
		parentNode = cur;
	}

	const order = Array.isArray(parentNode["ui:order"])
		? [...(parentNode["ui:order"] as string[])]
		: [];
	if (!order.includes(key)) {
		parentNode["ui:order"] = [...order, key];
	}
	return next;
}

/** Вставляет ключ в ui:order родительской ветки в указанную позицию. */
export function insertKeyToUiOrderAtPointer(
	ui: Record<string, unknown>,
	parentPointer: string,
	key: string,
	index: number,
): Record<string, unknown> {
	const next = structuredClone(ui) as Record<string, unknown>;
	const parentNode = getMutableUiParent(next, parentPointer);
	const order = Array.isArray(parentNode["ui:order"])
		? [...(parentNode["ui:order"] as string[])]
		: Object.keys(parentNode).filter((k) => !k.startsWith("ui:"));
	const withoutKey = order.filter((k) => k !== key);
	const safeIndex = Math.max(0, Math.min(index, withoutKey.length));
	withoutKey.splice(safeIndex, 0, key);
	parentNode["ui:order"] = withoutKey;
	return next;
}

export function mergeUiBranchAtPointer(
	ui: Record<string, unknown>,
	fieldPointer: string,
	branch: Record<string, unknown>,
): Record<string, unknown> {
	const segs = pointerSegments(fieldPointer);
	const next = structuredClone(ui) as Record<string, unknown>;
	if (segs.length === 0) return next;

	let cur: Record<string, unknown> = next;
	for (let i = 0; i < segs.length; i++) {
		const s = segs[i]!;
		if (i === segs.length - 1) {
			const prev = (cur[s] as Record<string, unknown>) ?? {};
			cur[s] = { ...prev, ...structuredClone(branch) };
		} else {
			const child = (cur[s] as Record<string, unknown>) ?? {};
			cur[s] = child;
			cur = child;
		}
	}
	return next;
}

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
