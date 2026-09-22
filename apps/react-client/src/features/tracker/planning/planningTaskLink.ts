import type { MouseEvent } from "react";

const TASK_PATH = /^\/tracker\/task\/([^/]+)$/;

export function trackerTaskKeyFromClickTarget(
	target: EventTarget | null,
): string | null {
	if (!(target instanceof Element)) return null;
	const anchor = target.closest("a");
	const href = anchor?.getAttribute("href");
	if (!href) return null;
	let pathname = href;
	try {
		pathname = new URL(href, window.location.origin).pathname;
	} catch {
		return null;
	}
	const match = pathname.match(TASK_PATH);
	if (!match) return null;
	let taskKey = match[1];
	try {
		taskKey = decodeURIComponent(taskKey);
	} catch {
		return null;
	}
	if (!taskKey || taskKey === "new") return null;
	return taskKey;
}

export function openPlanningTaskFromClick(
	event: MouseEvent,
	openTask: (taskKey: string) => void,
) {
	if (
		event.defaultPrevented ||
		event.button !== 0 ||
		event.metaKey ||
		event.ctrlKey ||
		event.shiftKey ||
		event.altKey
	) {
		return;
	}
	const taskKey = trackerTaskKeyFromClickTarget(event.target);
	if (!taskKey) return;
	event.preventDefault();
	event.stopPropagation();
	openTask(taskKey);
}
