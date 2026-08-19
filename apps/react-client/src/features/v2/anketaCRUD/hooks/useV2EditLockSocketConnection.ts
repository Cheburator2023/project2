import { useEffect } from "react";
import { useUserStore } from "@react-client/common/store/userStore";
import {
	connectV2EditLockSocket,
	disconnectV2EditLockSocket,
} from "../utils/v2EditLockSocket";

/** Держит Socket.IO канал occupancy, пока пользователь в разделе v2. */
export function useV2EditLockSocketConnection() {
	const username = useUserStore((s) => s.username);
	useEffect(() => {
		connectV2EditLockSocket(username?.trim() || "Пользователь");
	}, [username]);
	useEffect(() => {
		return () => {
			disconnectV2EditLockSocket();
		};
	}, []);
}
