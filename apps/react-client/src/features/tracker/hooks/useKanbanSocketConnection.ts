import { useEffect } from "react";
import { useTrackerEditIdentity } from "./useTrackerEditIdentity";
import {
	connectKanbanSocket,
	disconnectKanbanSocket,
} from "../utils/kanbanSocket";

/** Держит Socket.IO канал трекера, пока пользователь в `/tracker`. */
export function useKanbanSocketConnection() {
	const label = useTrackerEditIdentity();
	useEffect(() => {
		connectKanbanSocket(label.trim() || "Пользователь");
	}, [label]);
	useEffect(() => {
		return () => {
			disconnectKanbanSocket();
		};
	}, []);
}
