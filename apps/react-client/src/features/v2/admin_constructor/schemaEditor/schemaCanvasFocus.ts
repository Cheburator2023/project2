import type { TreeMethods } from "@minoru/react-dnd-treeview";
import type { NodeModel } from "@minoru/react-dnd-treeview";
import { listCanvasAncestorNodeIds } from "./schemaCanvasSearch";
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

/** Раскрывает предков в дереве холста и прокручивает к полю (как в поиске). */
export function revealCanvasFieldPointer(
	treeRef: TreeMethods | null | undefined,
	treeData: NodeModel<SchemaCanvasNodeData>[],
	pointer: string,
): void {
	for (const nodeId of listCanvasAncestorNodeIds(treeData, pointer)) {
		treeRef?.open(nodeId);
	}
	requestAnimationFrame(() => {
		focusCanvasField(pointer);
	});
}
