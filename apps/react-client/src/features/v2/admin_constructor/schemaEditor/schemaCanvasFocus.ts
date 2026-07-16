import type { TreeMethods } from "@minoru/react-dnd-treeview";
import type { NodeModel } from "@minoru/react-dnd-treeview";
import { normalizeJsonPointer } from "../utils/schemaPaths";
import { listCanvasExpandNodeIds } from "./schemaCanvasSearch";
import type { SchemaCanvasNodeData } from "./schemaCanvasTree";

export const CANVAS_FIELD_POINTER_ATTR = "data-canvas-field-pointer";

export function focusCanvasField(pointer: string): void {
	requestAnimationFrame(() => {
		const el = document.querySelector(
			`[${CANVAS_FIELD_POINTER_ATTR}="${CSS.escape(pointer)}"]`,
		);
		el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
	});
}

/** Раскрывает предков в дереве холста и прокручивает к полю. */
export function revealCanvasFieldPointer(
	treeRef: TreeMethods | null | undefined,
	treeData: NodeModel<SchemaCanvasNodeData>[],
	pointer: string,
): void {
	const normalizedPointer = normalizeJsonPointer(pointer);
	const nodeIds = listCanvasExpandNodeIds(treeData, normalizedPointer);
	if (nodeIds.length > 0) {
		// open() с массивом — один setState; по одному id в цикле теряются предки.
		treeRef?.open(nodeIds);
	}
	requestAnimationFrame(() => {
		requestAnimationFrame(() => {
			focusCanvasField(normalizedPointer);
		});
	});
}
