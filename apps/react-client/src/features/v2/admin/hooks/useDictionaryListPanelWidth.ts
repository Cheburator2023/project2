import { useCallback, useRef, useState } from "react";

export const DICTIONARY_LIST_PANEL_DEFAULT_WIDTH = 360;
export const DICTIONARY_LIST_PANEL_MIN_WIDTH = 280;
export const DICTIONARY_LIST_PANEL_MAX_WIDTH = 720;

export function useDictionaryListPanelWidth() {
	const [width, setWidth] = useState(DICTIONARY_LIST_PANEL_DEFAULT_WIDTH);
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
			const next = startWidth + (moveEvent.clientX - startX);
			setWidth(
				Math.min(
					DICTIONARY_LIST_PANEL_MAX_WIDTH,
					Math.max(DICTIONARY_LIST_PANEL_MIN_WIDTH, next),
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
