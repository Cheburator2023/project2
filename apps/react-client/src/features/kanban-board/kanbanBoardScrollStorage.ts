const storageKey = (boardRef: string) => `kanban-board-scroll:${boardRef}`;

/** Survives SPA unmount; sessionStorage alone was overwritten with 0 when the board collapsed. */
const memory = new Map<string, KanbanBoardScrollPosition>();

const COLLAPSED_PX = 8;

export type KanbanBoardScrollPosition = {
	left: number;
	top: number;
};

export function resetKanbanBoardScrollMemory(): void {
	memory.clear();
}

function horizontalOverflow(element: HTMLElement): number {
	return Math.max(0, element.scrollWidth - element.clientWidth);
}

function verticalOverflow(element: HTMLElement): number {
	return Math.max(0, element.scrollHeight - element.clientHeight);
}

function isCollapsedScroller(element: HTMLElement): boolean {
	return (
		horizontalOverflow(element) < COLLAPSED_PX &&
		verticalOverflow(element) < COLLAPSED_PX
	);
}

function persist(
	key: string,
	position: KanbanBoardScrollPosition,
): void {
	memory.set(key, position);
	try {
		sessionStorage.setItem(storageKey(key), JSON.stringify(position));
	} catch {
		/* private mode / quota */
	}
}

export function saveKanbanBoardScroll(
	boardRef: string | undefined,
	element: HTMLElement | null | undefined,
): void {
	const key = boardRef?.trim();
	if (!key || !element) return;
	const left = Math.round(element.scrollLeft);
	const top = Math.round(element.scrollTop);
	// Unmount removes columns → overflow disappears and the browser clamps to 0.
	// Writing that 0 would wipe the position we need when returning to the board.
	if (isCollapsedScroller(element) && Math.abs(left) < COLLAPSED_PX && Math.abs(top) < COLLAPSED_PX) {
		return;
	}
	persist(key, { left, top });
}

export function loadKanbanBoardScroll(
	boardRef: string | undefined,
): KanbanBoardScrollPosition | null {
	const key = boardRef?.trim();
	if (!key) return null;
	const fromMemory = memory.get(key);
	if (fromMemory) return fromMemory;
	try {
		const raw = sessionStorage.getItem(storageKey(key));
		if (!raw) return null;
		const parsed = JSON.parse(raw) as Partial<KanbanBoardScrollPosition>;
		const left = Number(parsed.left);
		const top = Number(parsed.top);
		if (!Number.isFinite(left) || !Number.isFinite(top)) return null;
		const position = { left, top };
		memory.set(key, position);
		return position;
	} catch {
		return null;
	}
}

/**
 * @returns true when the saved offset actually stuck on the scroller.
 * false means layout is not wide enough yet — caller should retry.
 */
export function restoreKanbanBoardScroll(
	boardRef: string | undefined,
	element: HTMLElement | null | undefined,
): boolean {
	const saved = loadKanbanBoardScroll(boardRef);
	if (!saved || !element) return false;
	const maxLeft = horizontalOverflow(element);
	if (saved.left >= COLLAPSED_PX && maxLeft < saved.left) {
		if (maxLeft > 0) element.scrollLeft = maxLeft;
		element.scrollTop = saved.top;
		return false;
	}
	element.scrollLeft = saved.left;
	element.scrollTop = saved.top;
	return Math.abs(element.scrollLeft - saved.left) < COLLAPSED_PX;
}
