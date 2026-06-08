import type { DockviewApi } from "dockview-react";
import { useEffect, type RefObject } from "react";

/** Округлённые размеры — убирает субпиксельный джиттер и цикл layout при zoom/devtools (#1219 dockview). */
export function readDockviewContainerSize(el: HTMLElement): {
	width: number;
	height: number;
} | null {
	const width = Math.floor(el.clientWidth);
	const height = Math.floor(el.clientHeight);
	if (width <= 0 || height <= 0) {
		return null;
	}
	return { width, height };
}

export function layoutDockviewToContainer(
	api: DockviewApi,
	el: HTMLElement,
	lastSize?: { width: number; height: number },
): { width: number; height: number } | undefined {
	const size = readDockviewContainerSize(el);
	if (!size) return lastSize;
	if (
		lastSize &&
		lastSize.width === size.width &&
		lastSize.height === size.height
	) {
		return lastSize;
	}
	api.layout(size.width, size.height);
	return size;
}

/** Ручной layout вместо встроенного ResizeObserver dockview — стабильнее при zoom и инспекторе. */
export function useDockviewStableLayout(
	containerRef: RefObject<HTMLElement | null>,
	apiRef: RefObject<DockviewApi | null>,
) {
	useEffect(() => {
		const el = containerRef.current;
		if (!el) return;

		let rafId = 0;
		let lastSize: { width: number; height: number } | undefined;

		const applyLayout = () => {
			rafId = 0;
			const api = apiRef.current;
			if (!api) return;
			lastSize = layoutDockviewToContainer(api, el, lastSize);
		};

		const scheduleLayout = () => {
			if (rafId) return;
			rafId = requestAnimationFrame(applyLayout);
		};

		const observer = new ResizeObserver(scheduleLayout);
		observer.observe(el);
		scheduleLayout();

		return () => {
			observer.disconnect();
			if (rafId) cancelAnimationFrame(rafId);
		};
	}, [apiRef, containerRef]);
}
