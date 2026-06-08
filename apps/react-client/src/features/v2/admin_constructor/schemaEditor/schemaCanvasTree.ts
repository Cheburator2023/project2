import type { RJSFSchema, UiSchema } from "@rjsf/utils";
import type { DropOptions, NodeModel } from "@minoru/react-dnd-treeview";
import {
	getObjectItemsSchema,
	isObjectFieldGroup,
	listOrderedChildKeys,
	resolveSchemaNode,
} from "../utils/schemaMutators";
import { pointerSegments } from "../utils/schemaPaths";

export const SCHEMA_CANVAS_ROOT_ID = "schema-root";
export const PALETTE_DRAG_TYPE = "schema-editor-palette-preset";
export const ARRAY_ITEMS_NODE_SUFFIX = "/@items";

export type SchemaCanvasNodeKind = "field" | "array-items-section";

export type SchemaCanvasNodeData = {
	kind: SchemaCanvasNodeKind;
	fieldPointer: string;
	fieldKey: string;
	/** Путь родителя в JSON Schema для ui:order (/, /group, /arr/items). */
	parentPointer: string;
};

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

export function getPresetIdFromPaletteDragSource(value: unknown): string | null {
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
	if (parentPointer === "/" || parentPointer === "") return SCHEMA_CANVAS_ROOT_ID;
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
): Record<string, string[]> {
	const groupId = groupIdFromParentPointer(parentPointer);
	const keys = listOrderedChildKeys(schema, parentPointer, uiSchema);
	const result: Record<string, string[]> = { [groupId]: keys };

	for (const key of keys) {
		const childPointer =
			parentPointer === "/" ? `/${key}` : `${parentPointer.replace(/\/$/, "")}/${key}`;
		const node = resolveSchemaNode(schema, pointerSegments(childPointer));
		if (isObjectFieldGroup(node)) {
			Object.assign(result, collectGroupOrders(schema, uiSchema, childPointer));
		}
		const itemsObj = getObjectItemsSchema(node);
		if (itemsObj && Object.keys(itemsObj.properties ?? {}).length > 0) {
			Object.assign(
				result,
				collectGroupOrders(schema, uiSchema, `${childPointer}/items`),
			);
		}
	}

	return result;
}

function fieldTitle(node: RJSFSchema | undefined, key: string): string {
	return typeof node?.title === "string" && node.title.trim()
		? node.title.trim()
		: key;
}

function appendFieldNodes(
	nodes: NodeModel<SchemaCanvasNodeData>[],
	jsonSchema: RJSFSchema,
	uiSchema: UiSchema | undefined,
	parentPointer: string,
	parentNodeId: string,
): void {
	const keys = listOrderedChildKeys(jsonSchema, parentPointer, uiSchema);

	for (const key of keys) {
		const fieldPointer =
			parentPointer === "/" ? `/${key}` : `${parentPointer}/${key}`;
		const node = resolveSchemaNode(jsonSchema, pointerSegments(fieldPointer));
		const isGroup = isObjectFieldGroup(node);
		const arrayItems = isGroup ? undefined : getObjectItemsSchema(node);

		nodes.push({
			id: fieldPointer,
			parent: parentNodeId,
			text: fieldTitle(node, key),
			droppable: isGroup,
			data: {
				kind: "field",
				fieldPointer,
				fieldKey: key,
				parentPointer,
			},
		});

		if (isGroup) {
			appendFieldNodes(nodes, jsonSchema, uiSchema, fieldPointer, fieldPointer);
		}

		if (arrayItems) {
			const sectionId = arrayItemsSectionId(fieldPointer);
			const itemsParentPointer = `${fieldPointer}/items`;
			nodes.push({
				id: sectionId,
				parent: fieldPointer,
				text: "Поля элемента массива",
				droppable: true,
				data: {
					kind: "array-items-section",
					fieldPointer: sectionId,
					fieldKey: "",
					parentPointer: itemsParentPointer,
				},
			});
			appendFieldNodes(
				nodes,
				jsonSchema,
				uiSchema,
				itemsParentPointer,
				sectionId,
			);
		}
	}
}

export function buildSchemaCanvasTree(
	jsonSchema: RJSFSchema,
	uiSchema?: UiSchema,
): NodeModel<SchemaCanvasNodeData>[] {
	const nodes: NodeModel<SchemaCanvasNodeData>[] = [];
	appendFieldNodes(nodes, jsonSchema, uiSchema, "/", SCHEMA_CANVAS_ROOT_ID);
	return nodes;
}

function siblingFieldKeys(
	tree: NodeModel<SchemaCanvasNodeData>[],
	parentId: string | number,
): string[] {
	return tree
		.filter(
			(node) =>
				String(node.parent) === String(parentId) &&
				node.data?.kind === "field",
		)
		.map((node) => node.data!.fieldKey);
}

export function treeToGroupOrders(
	tree: NodeModel<SchemaCanvasNodeData>[],
	rootId: string = SCHEMA_CANVAS_ROOT_ID,
): Record<string, string[]> {
	const orders: Record<string, string[]> = {
		[rootId]: siblingFieldKeys(tree, rootId),
	};

	for (const node of tree) {
		if (node.data?.kind === "array-items-section") {
			const groupId = groupIdFromParentPointer(node.data.parentPointer);
			orders[groupId] = siblingFieldKeys(tree, node.id);
			continue;
		}
		if (node.data?.kind === "field" && node.droppable) {
			const groupId = groupIdFromParentPointer(node.data.fieldPointer);
			orders[groupId] = siblingFieldKeys(tree, node.id);
		}
	}

	return orders;
}

export function resolvePaletteDropTarget(
	options: DropOptions<SchemaCanvasNodeData>,
	rootId: string = SCHEMA_CANVAS_ROOT_ID,
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
		return { parentPointer: dropTarget.data.fieldPointer, index };
	}

	if (dropTarget?.data?.kind === "field") {
		return { parentPointer: dropTarget.data.parentPointer, index };
	}

	return { parentPointer: "/", index };
}
