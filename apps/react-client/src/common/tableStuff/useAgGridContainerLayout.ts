import { useLayoutEffect, type RefObject } from "react";
import type { AgGridReact } from "ag-grid-react";

/** Пересчитывает высоту header rows после смены размера контейнера (SPA-навигация, drawer). */
export function useAgGridContainerLayout<TData>(
	gridRef: RefObject<AgGridReact<TData> | null>,
	hostRef: RefObject<HTMLElement | null>,
) {
	useLayoutEffect(() => {
		const host = hostRef.current;
		if (!host) return;

		const syncLayout = () => {
			const api = gridRef.current?.api;
			if (!api) return;
			api.refreshHeader();
		};

		syncLayout();
		const observer = new ResizeObserver(() => {
			requestAnimationFrame(syncLayout);
		});
		observer.observe(host);

		return () => observer.disconnect();
	}, [gridRef, hostRef]);
}
