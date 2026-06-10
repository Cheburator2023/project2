import { useCallback, useRef, useState } from "react";

export const PROPERTIES_PANEL_DEFAULT_WIDTH = 300;
export const PROPERTIES_PANEL_MIN_WIDTH = 240;
export const PROPERTIES_PANEL_MAX_WIDTH = 560;

export function usePropertiesPanelWidth() {
	const [width, setWidth] = useState(PROPERTIES_PANEL_DEFAULT_WIDTH);
	const [isResizing, setIsResizing] = useState(false);
	const widthRef = useRef(width);
	widthRef.current = width;

	const onResizeStart = useCallback((event: React.MouseEvent) => {
		event.preventDefault();
		const startX = event.clientX;
		const startWidth = widthRef.current;

		setIsResizing(true);
		document.body.style.cursor = "col-resize";
		document.body.style.userSelect = "none";

		const onMouseMove = (moveEvent: MouseEvent) => {
			const next = startWidth + (startX - moveEvent.clientX);
			setWidth(
				Math.min(
					PROPERTIES_PANEL_MAX_WIDTH,
					Math.max(PROPERTIES_PANEL_MIN_WIDTH, next),
				),
			);
		};

		const onMouseUp = () => {
			setIsResizing(false);
			document.body.style.cursor = "";
			document.body.style.userSelect = "";
			document.removeEventListener("mousemove", onMouseMove);
			document.removeEventListener("mouseup", onMouseUp);
		};

		document.addEventListener("mousemove", onMouseMove);
		document.addEventListener("mouseup", onMouseUp);
	}, []);

	return { width, isResizing, onResizeStart };
}
