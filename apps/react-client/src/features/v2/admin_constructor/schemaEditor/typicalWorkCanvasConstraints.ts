import type { RJSFSchema, UiSchema } from "@rjsf/utils";
import type { NodeModel } from "@minoru/react-dnd-treeview";
import { resolveV2AnketaArchComponent } from "@smart-anketa/api-contract";
import {
	getObjectItemsSchema,
	isObjectFieldGroup,
	listOrderedChildKeys,
	readUiSchemaBranchAtPointer,
	resolveSchemaNode,
} from "../utils/schemaMutators";
import { normalizeJsonPointer, pointerSegments } from "../utils/schemaPaths";
import {
	getPresetIdFromPaletteDragSource,
	isPaletteDragSource,
	PALETTE_DRAG_TYPE,
	type SchemaCanvasNodeData,
} from "./schemaCanvasTree";

export const TYPICAL_WORK_PRESET_ID = "work:typicalWork";

export const TYPICAL_WORK_ALREADY_IN_SUBTREE_MESSAGE =
	"В этой области уже есть блок типовой работы";

export function isTypicalWorkUiBranch(branch: unknown): boolean {
	return resolveV2AnketaArchComponent(branch) === "typicalWork";
}

export function isTypicalWorkFieldAtPointer(
	uiSchema: UiSchema | Record<string, unknown>,
	pointer: string,
): boolean {
	const branch = readUiSchemaBranchAtPointer(
		uiSchema as Record<string, unknown>,
		pointer,
	);
	return isTypicalWorkUiBranch(branch);
}

export function isTypicalWorkPaletteUiOptions(
	uiOptions?: Record<string, unknown>,
): boolean {
	return uiOptions?.archComponent === "typicalWork";
}

export function isTypicalWorkPaletteDragSource(dragSource: unknown): boolean {
	return getPresetIdFromPaletteDragSource(dragSource) === TYPICAL_WORK_PRESET_ID;
}

/** Рекурсивный поиск блока typicalWork в поддереве объекта/стрима (включая вложенные группы). */
export function findTypicalWorkPointerInSubtree(
	jsonSchema: RJSFSchema,
	uiSchema: UiSchema | Record<string, unknown>,
	parentPointer: string,
	excludePointer?: string | null,
): string | null {
	const parent = normalizeJsonPointer(parentPointer);
	const keys = listOrderedChildKeys(jsonSchema, parent, uiSchema as UiSchema);

	const walk = (keysToWalk: string[], currentParent: string): string | null => {
		for (const key of keysToWalk) {
			const pointer =
				currentParent === "/" ? `/${key}` : `${currentParent}/${key}`;
			const normalizedPointer = normalizeJsonPointer(pointer);
			const excluded =
				excludePointer != null &&
				normalizedPointer === normalizeJsonPointer(excludePointer);

			if (!excluded) {
				const branch = readUiSchemaBranchAtPointer(
					uiSchema as Record<string, unknown>,
					pointer,
				);
				if (isTypicalWorkUiBranch(branch)) {
					return pointer;
				}
			}

			const node = resolveSchemaNode(jsonSchema, pointerSegments(pointer));
			if (isObjectFieldGroup(node)) {
				const childKeys = listOrderedChildKeys(
					jsonSchema,
					pointer,
					uiSchema as UiSchema,
				);
				const found = walk(childKeys, pointer);
				if (found) return found;
			}

			const itemsObj = getObjectItemsSchema(node);
			if (itemsObj) {
				const itemKeys = listOrderedChildKeys(
					jsonSchema,
					`${pointer}/items`,
					uiSchema as UiSchema,
				);
				const found = walk(itemKeys, `${pointer}/items`);
				if (found) return found;
			}
		}
		return null;
	};

	return walk(keys, parent);
}

export function canAddTypicalWorkUnderParent(
	jsonSchema: RJSFSchema,
	uiSchema: UiSchema | Record<string, unknown>,
	parentPointer: string,
	excludePointer?: string | null,
): boolean {
	return (
		findTypicalWorkPointerInSubtree(
			jsonSchema,
			uiSchema,
			parentPointer,
			excludePointer,
		) === null
	);
}

export function resolveTypicalWorkDropParentPointer(
	node: NodeModel<SchemaCanvasNodeData>,
	jsonSchema: RJSFSchema,
): string | null {
	if (node.data?.kind !== "field") return null;

	if (node.droppable) {
		const fieldPointer = node.data.fieldPointer;
		const schemaNode = resolveSchemaNode(jsonSchema, pointerSegments(fieldPointer));
		if (getObjectItemsSchema(schemaNode)) {
			return `${fieldPointer}/items`;
		}
		return fieldPointer;
	}

	return node.data.parentPointer;
}

export function resolveTypicalWorkDragContext(
	dragSource: unknown,
	itemType: unknown,
	uiSchema: UiSchema | Record<string, unknown>,
): { isTypicalWorkDrag: boolean; excludePointer: string | null } {
	if (itemType === PALETTE_DRAG_TYPE && isTypicalWorkPaletteDragSource(dragSource)) {
		return { isTypicalWorkDrag: true, excludePointer: null };
	}

	if (isPaletteDragSource(dragSource) && isTypicalWorkPaletteDragSource(dragSource)) {
		return { isTypicalWorkDrag: true, excludePointer: null };
	}

	const fieldDrag = dragSource as NodeModel<SchemaCanvasNodeData> | undefined;
	if (fieldDrag?.data?.kind === "field") {
		const pointer = fieldDrag.data.fieldPointer;
		if (isTypicalWorkFieldAtPointer(uiSchema, pointer)) {
			return { isTypicalWorkDrag: true, excludePointer: pointer };
		}
	}

	return { isTypicalWorkDrag: false, excludePointer: null };
}
