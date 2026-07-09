import { createDragDropManager } from "dnd-core";
import type { ReactNode } from "react";
import { useLayoutEffect, useRef, useState } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

/**
 * HTML5-backend только внутри конструктора (palette + canvas).
 * На document.body react-dnd перехватывает dragstart вкладок dockview и блокирует их DnD.
 */
export function SchemaEditorDndProvider({ children }: { children: ReactNode }) {
	const containerRef = useRef<HTMLDivElement | null>(null);
	const [manager, setManager] = useState<ReturnType<
		typeof createDragDropManager
	> | null>(null);

	useLayoutEffect(() => {
		const root = containerRef.current;
		if (!root) return;

		const nextManager = createDragDropManager(HTML5Backend, root, {
			rootElement: root,
		});
		setManager(nextManager);

		return () => {
			nextManager.getBackend().teardown();
			setManager(null);
		};
	}, []);

	if (!manager) {
		return (
			<div
				ref={containerRef}
				style={{
					display: "flex",
					flexDirection: "column",
					flex: 1,
					minHeight: 0,
					height: "100%",
					width: "100%",
				}}
			/>
		);
	}

	return (
		<div
			ref={containerRef}
			style={{
				display: "flex",
				flexDirection: "column",
				flex: 1,
				minHeight: 0,
				height: "100%",
				width: "100%",
			}}
		>
			<DndProvider manager={manager}>{children}</DndProvider>
		</div>
	);
}
