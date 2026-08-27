import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
	restoreKanbanBoardScroll,
	saveKanbanBoardScroll,
} from "@react-client/features/kanban-board/kanbanBoardScrollStorage";

const RESTORE_FRAMES = 90;
const USER_INTENT_MS = 800;

/**
 * Horizontal overflow lives on `[data-test-id="kanban-board-page-content"]`.
 * Restore is retried until that node is actually wide enough; saves are ignored
 * when the board has collapsed (unmount), so we don't persist scrollLeft=0.
 */
export function useKanbanBoardPageScroll(
	boardRef: string | undefined,
	ready: boolean,
) {
	const [scroller, setScroller] = useState<HTMLDivElement | null>(null);
	const userMovedRef = useRef(false);
	const programmaticRef = useRef(false);
	const lastUserIntentRef = useRef(0);
	const scrollerRef = useRef<HTMLDivElement | null>(null);
	scrollerRef.current = scroller;

	useEffect(() => {
		userMovedRef.current = false;
	}, [boardRef]);

	const persistScroll = useCallback(() => {
		const element =
			scrollerRef.current ??
			document.querySelector<HTMLElement>(
				'[data-test-id="kanban-board-page-content"]',
			);
		saveKanbanBoardScroll(boardRef, element);
	}, [boardRef]);

	const applySavedScroll = useCallback(() => {
		const element =
			scrollerRef.current ??
			document.querySelector<HTMLDivElement>(
				'[data-test-id="kanban-board-page-content"]',
			);
		if (!boardRef || !element || !ready || userMovedRef.current) return false;
		programmaticRef.current = true;
		const stuck = restoreKanbanBoardScroll(boardRef, element);
		requestAnimationFrame(() => {
			programmaticRef.current = false;
		});
		return stuck;
	}, [boardRef, ready]);

	useLayoutEffect(() => {
		applySavedScroll();
	}, [applySavedScroll]);

	useEffect(() => {
		const element = scroller;
		if (!element || !boardRef) return;

		const markUserIntent = () => {
			lastUserIntentRef.current = Date.now();
		};
		const onScroll = () => {
			if (programmaticRef.current) return;
			if (Date.now() - lastUserIntentRef.current > USER_INTENT_MS) return;
			userMovedRef.current = true;
			saveKanbanBoardScroll(boardRef, element);
		};

		element.addEventListener("scroll", onScroll, { passive: true });
		element.addEventListener("wheel", markUserIntent, { passive: true });
		element.addEventListener("pointerdown", markUserIntent);
		element.addEventListener("touchstart", markUserIntent, { passive: true });

		const retry = () => {
			applySavedScroll();
		};
		const resizeObserver = new ResizeObserver(retry);
		resizeObserver.observe(element);
		const inner = element.firstElementChild;
		if (inner) resizeObserver.observe(inner);

		const mutationObserver = new MutationObserver(retry);
		mutationObserver.observe(element, { childList: true, subtree: true });

		let frames = 0;
		let raf = requestAnimationFrame(function tick() {
			frames += 1;
			if (!userMovedRef.current) applySavedScroll();
			if (frames < RESTORE_FRAMES && !userMovedRef.current) {
				raf = requestAnimationFrame(tick);
			}
		});

		return () => {
			cancelAnimationFrame(raf);
			resizeObserver.disconnect();
			mutationObserver.disconnect();
			element.removeEventListener("scroll", onScroll);
			element.removeEventListener("wheel", markUserIntent);
			element.removeEventListener("pointerdown", markUserIntent);
			element.removeEventListener("touchstart", markUserIntent);
		};
	}, [applySavedScroll, boardRef, scroller]);

	return { setScroller, persistScroll };
}
