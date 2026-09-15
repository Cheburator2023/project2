import type { Socket } from "socket.io-client";
import { isServerNoticesEnabled } from "./serverNoticesFeatureFlag";
import {
	reportServerReachable,
	reportServerUnreachable,
} from "./serverNoticesStore";

/** Обрыв канала Socket.IO — процесс API скорее мёртв, чем «упал один REST-метод». */
export function bindServerStatusSocket(client: Socket): void {
	if (!isServerNoticesEnabled()) return;
	client.on("connect", () => {
		reportServerReachable();
	});
	client.on("connect_error", (error: Error) => {
		reportServerUnreachable(
			error?.message?.trim() || "WebSocket: нет соединения",
		);
	});
	client.on("disconnect", (reason: string) => {
		if (reason === "io client disconnect") return;
		reportServerUnreachable(`WebSocket: ${reason}`);
	});
}
