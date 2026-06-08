import type { ReactNode } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

/** Обёртка react-dnd для конструктора (HTML5Backend — как в README treeview для desktop). */
export function SchemaEditorDndProvider({ children }: { children: ReactNode }) {
	return (
		<DndProvider
			backend={HTML5Backend}
			options={{
				rootElement:
					typeof document !== "undefined" ? document.body : undefined,
			}}
		>
			{children}
		</DndProvider>
	);
}
