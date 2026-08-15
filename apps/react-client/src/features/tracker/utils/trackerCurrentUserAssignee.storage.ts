const TRACKER_CURRENT_USER_ASSIGNEE_KEY =
	"smart-anketa:tracker:defaultCurrentUserAssigneeName";

/** Локальный профиль «кто я в трекере» — только localStorage, не API settings. */
export function getTrackerCurrentUserAssigneeName(): string {
	try {
		return localStorage.getItem(TRACKER_CURRENT_USER_ASSIGNEE_KEY)?.trim() ?? "";
	} catch {
		return "";
	}
}

export function setTrackerCurrentUserAssigneeName(name: string): void {
	const trimmed = name.trim();
	try {
		if (trimmed) {
			localStorage.setItem(TRACKER_CURRENT_USER_ASSIGNEE_KEY, trimmed);
		} else {
			localStorage.removeItem(TRACKER_CURRENT_USER_ASSIGNEE_KEY);
		}
	} catch {
		/* ignore quota / private mode */
	}
	window.dispatchEvent(
		new CustomEvent("smart-anketa:tracker-identity-changed", {
			detail: { name: trimmed },
		}),
	);
}
