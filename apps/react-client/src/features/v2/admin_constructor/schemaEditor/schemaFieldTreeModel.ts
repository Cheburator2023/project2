import type { RJSFSchema, UiSchema } from "@rjsf/utils";
import {
	buildSchemaCanvasTree,
	SCHEMA_CANVAS_ROOT_ID,
	type SchemaCanvasTreeOptions,
} from "./schemaCanvasTree";

export type SchemaFieldTreeNode = {
	id: string;
	label: string;
	fieldKey: string;
	parentPointer: string;
	children?: SchemaFieldTreeNode[];
};

export function buildSchemaFieldTreeModel(
	jsonSchema: RJSFSchema,
	uiSchema?: UiSchema | Record<string, unknown>,
	options?: SchemaCanvasTreeOptions,
): SchemaFieldTreeNode[] {
	const flat = buildSchemaCanvasTree(jsonSchema, uiSchema, options);
	const fieldNodes = flat.filter((node) => node.data?.kind === "field");

	const nodeById = new Map<string, SchemaFieldTreeNode>();
	for (const node of fieldNodes) {
		nodeById.set(String(node.id), {
			id: String(node.id),
			label: node.text,
			fieldKey: node.data!.fieldKey,
			parentPointer: node.data!.parentPointer,
		});
	}

	const roots: SchemaFieldTreeNode[] = [];
	for (const node of fieldNodes) {
		const treeNode = nodeById.get(String(node.id))!;
		const parentId = String(node.parent);
		if (parentId === SCHEMA_CANVAS_ROOT_ID) {
			roots.push(treeNode);
			continue;
		}

		const parent = nodeById.get(parentId);
		if (parent) {
			parent.children = parent.children ?? [];
			parent.children.push(treeNode);
		} else {
			roots.push(treeNode);
		}
	}

	return roots;
}

export function collectSchemaFieldTreeNodeIds(
	nodes: SchemaFieldTreeNode[],
): string[] {
	const ids: string[] = [];
	const walk = (items: SchemaFieldTreeNode[]) => {
		for (const item of items) {
			ids.push(item.id);
			if (item.children?.length) walk(item.children);
		}
	};
	walk(nodes);
	return ids;
}

export function collectSchemaFieldPointerIds(
	jsonSchema: RJSFSchema,
	uiSchema?: UiSchema | Record<string, unknown>,
	options?: SchemaCanvasTreeOptions,
): string[] {
	return buildSchemaCanvasTree(jsonSchema, uiSchema, options)
		.filter((node) => node.data?.kind === "field")
		.map((node) => String(node.id));
}
