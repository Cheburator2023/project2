import type { RJSFSchema, UiSchema } from "@rjsf/utils";
import type { DropOptions, NodeModel } from "@minoru/react-dnd-treeview";
import {
	isV2AnketaSystemRootPointer,
	resolveV2AnketaCanvasUiKind,
	resolveV2AnketaSectionDisplayTitle,
	schemaHasUncertaintyModalWidget,
} from "@smart-anketa/api-contract";
import {
	getObjectItemsSchema,
	isObjectFieldGroup,
	listOrderedChildKeys,
	readUiSchemaBranchAtPointer,
	resolveSchemaNode,
} from "../utils/schemaMutators";
import { pointerSegments } from "../utils/schemaPaths";

export const UNCERTAINTY_CALCULATION_ROOT_POINTER = "/uncertaintyCalculation";

export const SCHEMA_CANVAS_ROOT_ID = "schema-root";
export const SCHEMA_CANVAS_SYSTEM_DIVIDER_ID = "schema-canvas-system-divider";
export const PALETTE_DRAG_TYPE = "schema-editor-palette-preset";
export const ARRAY_ITEMS_NODE_SUFFIX = "/@items";

export type SchemaCanvasNodeKind =
	| "field"
	| "array-items-section"
	| "system-divider";

export type SchemaCanvasNodeData = {
	kind: SchemaCanvasNodeKind;
	fieldPointer: string;
	fieldKey: string;
	/** Путь родителя в JSON Schema для ui:order (/, /group, /arr/items). */
	parentPointer: string;
};

export type SchemaCanvasTreeOptions = {
	/** Не показывать поля с `ui:options.system` на холсте DnD. */
	hideSystemFields?: boolean;
};

/** Порядок на холсте: системные узлы (`ui:options.system`) — в конце списка. */
export function listCanvasOrderedChildKeys(
	jsonSchema: RJSFSchema,
	parentPointer: string,
	uiSchema?: UiSchema | Record<string, unknown>,
	options?: SchemaCanvasTreeOptions,
): string[] {
	const keys = listOrderedChildKeys(jsonSchema, parentPointer, uiSchema);
	if (!uiSchema) return keys;

	const hasUncertaintyModal = schemaHasUncertaintyModalWidget(
		uiSchema as Record<string, unknown>,
	);
	const primary: string[] = [];
	const system: string[] = [];

	for (const key of keys) {
		const fieldPointer =
			parentPointer === "/" ? `/${key}` : `${parentPointer}/${key}`;
		const branch = readUiSchemaBranchAtPointer(uiSchema, fieldPointer);
		const isSystem =
			resolveV2AnketaCanvasUiKind(branch, { fieldPointer }) === "system";
		/** Без модалки корневой блок параметров должен оставаться на холсте. */
		const keepUncertaintyRootVisible =
			!hasUncertaintyModal &&
			fieldPointer === UNCERTAINTY_CALCULATION_ROOT_POINTER;

		if (isSystem && !keepUncertaintyRootVisible) {
			system.push(key);
		} else {
			primary.push(key);
		}
	}

	if (options?.hideSystemFields) return primary;
	return [...primary, ...system];
}

export function isCanvasSystemField(
	uiSchema: UiSchema | Record<string, unknown> | undefined,
	fieldPointer: string,
): boolean {
	if (isV2AnketaSystemRootPointer(fieldPointer)) return true;
	const branch = readUiSchemaBranchAtPointer(uiSchema, fieldPointer);
	return resolveV2AnketaCanvasUiKind(branch, { fieldPointer }) === "system";
}

/** Редактируемые дочерние ключи (без `ui:options.system`). */
export function listCanvasEditableChildKeys(
	jsonSchema: RJSFSchema,
	parentPointer: string,
	uiSchema?: UiSchema | Record<string, unknown>,
	options?: SchemaCanvasTreeOptions,
): string[] {
	return listCanvasOrderedChildKeys(
		jsonSchema,
		parentPointer,
		uiSchema,
		options,
	).filter((key) => {
		const fieldPointer =
			parentPointer === "/" ? `/${key}` : `${parentPointer}/${key}`;
		return !isCanvasSystemField(uiSchema, fieldPointer);
	});
}

/** Ограничивает индекс вставки зоной редактируемых полей (до системных). */
export function clampCanvasInsertIndex(
	jsonSchema: RJSFSchema,
	parentPointer: string,
	uiSchema: UiSchema | Record<string, unknown> | undefined,
	index: number,
): number {
	const editableCount = listCanvasEditableChildKeys(
		jsonSchema,
		parentPointer,
		uiSchema,
	).length;
	return Math.max(0, Math.min(index, editableCount));
}

export type PaletteDragItem = {
	type: typeof PALETTE_DRAG_TYPE;
	presetId: string;
	text: string;
};

export type PaletteDragNodeData = {
	kind: "palette-preset";
	presetId: string;
};

export const PALETTE_PRESET_ID_PREFIX = "palette-preset:";

/** Drag item как NodeModel — как в ExternalElementInsideReactDnd. */
export function buildPaletteDragNode(
	presetId: string,
	title: string,
): NodeModel<PaletteDragNodeData> {
	return {
		id: `${PALETTE_PRESET_ID_PREFIX}${presetId}`,
		parent: SCHEMA_CANVAS_ROOT_ID,
		text: title,
		droppable: false,
		data: { kind: "palette-preset", presetId },
	};
}

export function getPresetIdFromPaletteDragSource(
	value: unknown,
): string | null {
	if (typeof value !== "object" || value === null) return null;

	if (
		"type" in value &&
		(value as PaletteDragItem).type === PALETTE_DRAG_TYPE &&
		typeof (value as PaletteDragItem).presetId === "string"
	) {
		return (value as PaletteDragItem).presetId;
	}

	if ("data" in value) {
		const data = (value as NodeModel<PaletteDragNodeData>).data;
		if (data?.kind === "palette-preset" && data.presetId) {
			return data.presetId;
		}
	}

	if ("id" in value) {
		const id = String((value as { id: unknown }).id);
		if (id.startsWith(PALETTE_PRESET_ID_PREFIX)) {
			return id.slice(PALETTE_PRESET_ID_PREFIX.length);
		}
	}

	return null;
}

export function isPaletteDragSource(value: unknown): boolean {
	return getPresetIdFromPaletteDragSource(value) !== null;
}

export function arrayItemsSectionId(fieldPointer: string): string {
	return `${fieldPointer}${ARRAY_ITEMS_NODE_SUFFIX}`;
}

export function groupIdFromParentPointer(parentPointer: string): string {
	if (parentPointer === "/" || parentPointer === "")
		return SCHEMA_CANVAS_ROOT_ID;
	return `schema-group:${parentPointer}`;
}

export function parentPointerFromGroupId(groupId: string): string {
	if (groupId === SCHEMA_CANVAS_ROOT_ID) return "/";
	return groupId.slice("schema-group:".length);
}

export function collectGroupOrders(
	schema: RJSFSchema,
	uiSchema?: UiSchema,
	parentPointer = "/",
	options?: SchemaCanvasTreeOptions,
): Record<string, string[]> {
	const groupId = groupIdFromParentPointer(parentPointer);
	const keys = listCanvasOrderedChildKeys(
		schema,
		parentPointer,
		uiSchema,
		options,
	);
	const result: Record<string, string[]> = { [groupId]: keys };

	for (const key of keys) {
		const childPointer =
			parentPointer === "/"
				? `/${key}`
				: `${parentPointer.replace(/\/$/, "")}/${key}`;
		const node = resolveSchemaNode(schema, pointerSegments(childPointer));
		if (isObjectFieldGroup(node)) {
			Object.assign(
				result,
				collectGroupOrders(schema, uiSchema, childPointer, options),
			);
		}
		const itemsObj = getObjectItemsSchema(node);
		if (itemsObj && Object.keys(itemsObj.properties ?? {}).length > 0) {
			Object.assign(
				result,
				collectGroupOrders(schema, uiSchema, `${childPointer}/items`, options),
			);
		}
	}

	return result;
}

function fieldTitle(
	node: RJSFSchema | undefined,
	key: string,
	uiSchema: UiSchema | undefined,
	fieldPointer: string,
): string {
	const base =
		typeof node?.title === "string" && node.title.trim()
			? node.title.trim()
			: key;
	const uiBranch = readUiSchemaBranchAtPointer(
		uiSchema as Record<string, unknown> | undefined,
		fieldPointer,
	);
	return resolveV2AnketaSectionDisplayTitle(base, uiBranch, key);
}

function isUncertaintyModalTriggerAtPointer(
	uiSchema: UiSchema | undefined,
	fieldPointer: string,
): boolean {
	const branch = readUiSchemaBranchAtPointer(
		uiSchema as Record<string, unknown> | undefined,
		fieldPointer,
	);
	return branch?.["ui:widget"] === "V2UncertaintyModalWidget";
}

function appendUncertaintyCalculationFieldNodes(
	nodes: NodeModel<SchemaCanvasNodeData>[],
	jsonSchema: RJSFSchema,
	uiSchema: UiSchema | undefined,
	schemaParentPointer: string,
	treeParentId: string,
): void {
	const keys = listOrderedChildKeys(jsonSchema, schemaParentPointer, uiSchema);

	for (const key of keys) {
		const fieldPointer =
			schemaParentPointer === "/"
				? `/${key}`
				: `${schemaParentPointer}/${key}`;
		const node = resolveSchemaNode(jsonSchema, pointerSegments(fieldPointer));
		const isGroup = isObjectFieldGroup(node);

		nodes.push({
			id: fieldPointer,
			parent: treeParentId,
			text: fieldTitle(node, key, uiSchema, fieldPointer),
			droppable: isGroup,
			data: {
				kind: "field",
				fieldPointer,
				fieldKey: key,
				parentPointer: schemaParentPointer,
			},
		});

		if (isGroup) {
			appendUncertaintyCalculationFieldNodes(
				nodes,
				jsonSchema,
				uiSchema,
				fieldPointer,
				fieldPointer,
			);
		}
	}
}

function appendFieldNodes(
	nodes: NodeModel<SchemaCanvasNodeData>[],
	jsonSchema: RJSFSchema,
	uiSchema: UiSchema | undefined,
	parentPointer: string,
	parentNodeId: string,
	options?: SchemaCanvasTreeOptions,
): void {
	const keys = listCanvasOrderedChildKeys(
		jsonSchema,
		parentPointer,
		uiSchema,
		options,
	);
	const hideSystemFields = options?.hideSystemFields === true;
	const hasUncertaintyModal = schemaHasUncertaintyModalWidget(
		(uiSchema ?? {}) as Record<string, unknown>,
	);
	let systemDividerInserted = false;

	for (const key of keys) {
		const fieldPointer =
			parentPointer === "/" ? `/${key}` : `${parentPointer}/${key}`;

		const keepUncertaintyRootVisible =
			!hasUncertaintyModal &&
			fieldPointer === UNCERTAINTY_CALCULATION_ROOT_POINTER;

		if (
			hideSystemFields &&
			isCanvasSystemField(uiSchema, fieldPointer) &&
			!keepUncertaintyRootVisible
		) {
			continue;
		}

		if (
			!hideSystemFields &&
			parentPointer === "/" &&
			!systemDividerInserted &&
			isCanvasSystemField(uiSchema, fieldPointer)
		) {
			systemDividerInserted = true;
			nodes.push({
				id: SCHEMA_CANVAS_SYSTEM_DIVIDER_ID,
				parent: parentNodeId,
				text: "Системные данные — не редактируются в конструкторе",
				droppable: false,
				data: {
					kind: "system-divider",
					fieldPointer: "",
					fieldKey: "",
					parentPointer: "/",
				},
			});
		}

		const node = resolveSchemaNode(jsonSchema, pointerSegments(fieldPointer));
		const isGroup = isObjectFieldGroup(node);
		const arrayItems = isGroup ? undefined : getObjectItemsSchema(node);
		const isUncertaintyModalTrigger = isUncertaintyModalTriggerAtPointer(
			uiSchema,
			fieldPointer,
		);

		nodes.push({
			id: fieldPointer,
			parent: parentNodeId,
			text: fieldTitle(node, key, uiSchema, fieldPointer),
			droppable: isGroup || Boolean(arrayItems) || isUncertaintyModalTrigger,
			data: {
				kind: "field",
				fieldPointer,
				fieldKey: key,
				parentPointer,
			},
		});

		if (isUncertaintyModalTrigger) {
			appendUncertaintyCalculationFieldNodes(
				nodes,
				jsonSchema,
				uiSchema,
				UNCERTAINTY_CALCULATION_ROOT_POINTER,
				fieldPointer,
			);
		}

		if (isGroup) {
			appendFieldNodes(
				nodes,
				jsonSchema,
				uiSchema,
				fieldPointer,
				fieldPointer,
				options,
			);
		}

		if (arrayItems) {
			const itemsParentPointer = `${fieldPointer}/items`;
			appendFieldNodes(
				nodes,
				jsonSchema,
				uiSchema,
				itemsParentPointer,
				fieldPointer,
				options,
			);
		}
	}
}

export function buildSchemaCanvasTree(
	jsonSchema: RJSFSchema,
	uiSchema?: UiSchema,
	options?: SchemaCanvasTreeOptions,
): NodeModel<SchemaCanvasNodeData>[] {
	const nodes: NodeModel<SchemaCanvasNodeData>[] = [];
	appendFieldNodes(
		nodes,
		jsonSchema,
		uiSchema,
		"/",
		SCHEMA_CANVAS_ROOT_ID,
		options,
	);
	return nodes;
}

function siblingFieldKeys(
	tree: NodeModel<SchemaCanvasNodeData>[],
	parentId: string | number,
): string[] {
	return tree
		.filter(
			(node) =>
				String(node.parent) === String(parentId) && node.data?.kind === "field",
		)
		.map((node) => node.data!.fieldKey);
}

export function treeToGroupOrders(
	tree: NodeModel<SchemaCanvasNodeData>[],
	jsonSchema?: RJSFSchema,
	rootId: string = SCHEMA_CANVAS_ROOT_ID,
): Record<string, string[]> {
	const orders: Record<string, string[]> = {
		[rootId]: siblingFieldKeys(tree, rootId),
	};

	for (const node of tree) {
		if (node.data?.kind === "field" && node.droppable) {
			const fieldPointer = node.data.fieldPointer;
			let groupParentPointer = fieldPointer;
			if (jsonSchema) {
				const schemaNode = resolveSchemaNode(
					jsonSchema,
					pointerSegments(fieldPointer),
				);
				if (getObjectItemsSchema(schemaNode)) {
					groupParentPointer = `${fieldPointer}/items`;
				}
			}
			const groupId = groupIdFromParentPointer(groupParentPointer);
			orders[groupId] = siblingFieldKeys(tree, node.id);
		}
	}

	return orders;
}

/** Целевой родитель и индекс вставки по placeholder DnD (палитра и холст). */
export function resolveCanvasDropTarget(
	options: DropOptions<SchemaCanvasNodeData>,
	rootId: string = SCHEMA_CANVAS_ROOT_ID,
	jsonSchema?: RJSFSchema,
): { parentPointer: string; index: number } {
	const { dropTargetId, dropTarget, relativeIndex } = options;
	const index = relativeIndex ?? 0;

	if (!dropTargetId || dropTargetId === rootId) {
		return { parentPointer: "/", index };
	}

	if (dropTarget?.data?.kind === "array-items-section") {
		return { parentPointer: dropTarget.data.parentPointer, index };
	}

	if (dropTarget?.droppable && dropTarget.data?.kind === "field") {
		const fieldPointer = dropTarget.data.fieldPointer;
		if (jsonSchema) {
			const node = resolveSchemaNode(jsonSchema, pointerSegments(fieldPointer));
			if (getObjectItemsSchema(node)) {
				return { parentPointer: `${fieldPointer}/items`, index };
			}
		}
		return { parentPointer: fieldPointer, index };
	}

	if (dropTarget?.data?.kind === "field") {
		return { parentPointer: dropTarget.data.parentPointer, index };
	}

	return { parentPointer: "/", index };
}

/** @deprecated Используйте {@link resolveCanvasDropTarget}. */
export const resolvePaletteDropTarget = resolveCanvasDropTarget;
