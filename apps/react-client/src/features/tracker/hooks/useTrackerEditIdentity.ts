import { useEffect, useState } from "react";
import {
	getTrackerCurrentUserAssigneeName,
	setTrackerCurrentUserAssigneeName,
} from "../utils/trackerCurrentUserAssignee.storage";

/** Текущий пользователь трекера — только localStorage (не kanban-board/settings). */
export function useTrackerEditIdentity(): string {
	const [name, setName] = useState(() => getTrackerCurrentUserAssigneeName());

	useEffect(() => {
		const sync = () => setName(getTrackerCurrentUserAssigneeName());
		const onStorage = (event: StorageEvent) => {
			if (
				event.key === null ||
				event.key === "smart-anketa:tracker:defaultCurrentUserAssigneeName"
			) {
				sync();
			}
		};
		window.addEventListener("storage", onStorage);
		window.addEventListener(
			"smart-anketa:tracker-identity-changed",
			sync as EventListener,
		);
		return () => {
			window.removeEventListener("storage", onStorage);
			window.removeEventListener(
				"smart-anketa:tracker-identity-changed",
				sync as EventListener,
			);
		};
	}, []);

	return name;
}

export function saveTrackerEditIdentity(name: string): void {
	setTrackerCurrentUserAssigneeName(name);
}
