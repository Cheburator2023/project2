import { createDragDropManager } from "dnd-core";
import type { ReactNode } from "react";
import { useMemo } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

let schemaEditorDndManager: ReturnType<typeof createDragDropManager> | null = null;

function getSchemaEditorDndManager() {
	if (typeof document === "undefined") return null;
	if (!schemaEditorDndManager) {
		schemaEditorDndManager = createDragDropManager(HTML5Backend, document.body, {
			rootElement: document.body,
		});
	}
	return schemaEditorDndManager;
}

/**
 * Один HTML5-backend на весь dock конструктора.
 * Иначе при split-панели «Конструктор» или remount dockview — «two HTML5 backends».
 */
export function SchemaEditorDndProvider({ children }: { children: ReactNode }) {
	const manager = useMemo(() => getSchemaEditorDndManager(), []);
	if (!manager) return <>{children}</>;
	return <DndProvider manager={manager}>{children}</DndProvider>;
}
