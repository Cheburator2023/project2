import { useCallback, useRef, useState } from "react";

/** Пиксельный split — боковая панель в конструкторе схемы. */
export const DICTIONARY_LIST_PANEL_DEFAULT_WIDTH = 360;
export const DICTIONARY_LIST_PANEL_MIN_WIDTH = 280;
export const DICTIONARY_LIST_PANEL_MAX_WIDTH = 720;

/** Доля ширины под таблицу/реестр (остальное — карточка). */
export const LIST_DETAIL_SPLIT_DEFAULT_SHARE = 0.62;
export const LIST_DETAIL_SPLIT_MIN_SHARE = 0.42;
export const LIST_DETAIL_SPLIT_MAX_SHARE = 0.82;

export const TYPICAL_WORKS_LIST_DETAIL_DEFAULT_SHARE = 0.66;
export const DICTIONARIES_LIST_DETAIL_DEFAULT_SHARE = 0.58;

type ListPanelWidthOptions = {
	defaultWidth?: number;
	minWidth?: number;
	maxWidth?: number;
};

type ListDetailSplitOptions = {
	defaultShare?: number;
	minShare?: number;
	maxShare?: number;
};

function normalizePanelBounds(minWidth: number, maxWidth: number) {
	const min = Math.min(minWidth, maxWidth);
	const max = Math.max(minWidth, maxWidth);
	return { minWidth: min, maxWidth: max };
}

function clampPanelWidth(value: number, minWidth: number, maxWidth: number) {
	return Math.min(maxWidth, Math.max(minWidth, value));
}

function clampShare(value: number, minShare: number, maxShare: number) {
	return Math.min(maxShare, Math.max(minShare, value));
}

/** Фиксированная ширина в px (конструктор схемы). */
export function useDictionaryListPanelWidth(options?: ListPanelWidthOptions) {
	const { minWidth, maxWidth } = normalizePanelBounds(
		options?.minWidth ?? DICTIONARY_LIST_PANEL_MIN_WIDTH,
		options?.maxWidth ?? DICTIONARY_LIST_PANEL_MAX_WIDTH,
	);
	const defaultWidth = clampPanelWidth(
		options?.defaultWidth ?? DICTIONARY_LIST_PANEL_DEFAULT_WIDTH,
		minWidth,
		maxWidth,
	);

	const [width, setWidth] = useState(defaultWidth);
	const [isResizing, setIsResizing] = useState(false);
	const widthRef = useRef(width);
	widthRef.current = width;

	const onResizeStart = useCallback(
		(event: React.MouseEvent) => {
			event.preventDefault();
			const startX = event.clientX;
			const startWidth = clampPanelWidth(widthRef.current, minWidth, maxWidth);

			setIsResizing(true);
			document.body.style.cursor = "col-resize";
			document.body.style.userSelect = "none";

			const onMouseMove = (moveEvent: MouseEvent) => {
				const next = startWidth + (moveEvent.clientX - startX);
				setWidth(clampPanelWidth(next, minWidth, maxWidth));
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
		},
		[maxWidth, minWidth],
	);

	return { width, isResizing, onResizeStart };
}

/** Пропорциональный split: таблица шире карточки на любом экране. */
export function useListDetailSplitRatio(options?: ListDetailSplitOptions) {
	const minShare = options?.minShare ?? LIST_DETAIL_SPLIT_MIN_SHARE;
	const maxShare = options?.maxShare ?? LIST_DETAIL_SPLIT_MAX_SHARE;
	const defaultShare = clampShare(
		options?.defaultShare ?? LIST_DETAIL_SPLIT_DEFAULT_SHARE,
		minShare,
		maxShare,
	);

	const containerRef = useRef<HTMLDivElement>(null);
	const [listShare, setListShare] = useState(defaultShare);
	const [isResizing, setIsResizing] = useState(false);
	const listShareRef = useRef(listShare);
	listShareRef.current = listShare;

	const onResizeStart = useCallback(
		(event: React.MouseEvent) => {
			event.preventDefault();
			const container = containerRef.current;
			if (!container) return;

			const startX = event.clientX;
			const startShare = listShareRef.current;

			setIsResizing(true);
			document.body.style.cursor = "col-resize";
			document.body.style.userSelect = "none";

			const onMouseMove = (moveEvent: MouseEvent) => {
				const width = container.getBoundingClientRect().width;
				if (width <= 0) return;
				const deltaShare = (moveEvent.clientX - startX) / width;
				setListShare(
					clampShare(startShare + deltaShare, minShare, maxShare),
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
		},
		[minShare, maxShare],
	);

	const listWidth = `${listShare * 100}%`;

	return { containerRef, listShare, listWidth, isResizing, onResizeStart };
}

export function useTypicalWorksListDetailSplit() {
	return useListDetailSplitRatio({
		defaultShare: TYPICAL_WORKS_LIST_DETAIL_DEFAULT_SHARE,
	});
}

export function useDictionariesListDetailSplit() {
	return useListDetailSplitRatio({
		defaultShare: DICTIONARIES_LIST_DETAIL_DEFAULT_SHARE,
	});
}
