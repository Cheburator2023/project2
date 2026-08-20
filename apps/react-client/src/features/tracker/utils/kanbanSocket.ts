import { io, type Socket } from "socket.io-client";
import {
	KANBAN_WS_EVENTS,
	KANBAN_WS_NAMESPACE,
	type KanbanLockChangedPayload,
	type KanbanLockJoinAck,
	type KanbanLockSnapshotPayload,
	type KanbanSyncPayload,
} from "@smart-anketa/api-contract";
import {
	isGodModeAccessToken,
	isNoRolesGodMode,
} from "@react-client/common/auth/godMode";
import { resolveFreshAccessToken } from "@react-client/common/auth/syncMfeAuth";
import { getSmartAnketaApiBaseUrl } from "@react-client/common/api/helpers/getSmartAnketaApiBaseUrl";
import { resolveV2EditLockSocketTarget } from "@react-client/features/v2/anketaCRUD/utils/v2EditLockSocketTarget";
import { useKanbanTaskLocksStore } from "../stores/kanbanTaskLocksStore";
import { bindServerStatusSocket } from "@react-client/common/serverStatus/bindServerStatusSocket";
import {
	bindSocketIoDebugLog,
	logSocketIoAction,
} from "@react-client/common/websocket/bindSocketIoDebugLog";

const JOIN_TIMEOUT_MS = 8_000;

let socket: Socket | null = null;
let socketTarget: { uri: string; path: string } | null = null;
let lockedByLabel = "Пользователь";

const syncListeners = new Set<(payload: KanbanSyncPayload) => void>();

function handshakeAuth(): { token?: string; lockedByLabel: string } {
	const token = resolveFreshAccessToken();
	const includeToken = Boolean(
		token && (!isGodModeAccessToken(token) || isNoRolesGodMode()),
	);
	return {
		lockedByLabel,
		...(includeToken && token ? { token } : {}),
	};
}

function applySnapshot(payload: KanbanLockSnapshotPayload): void {
	useKanbanTaskLocksStore.getState().setLocks(payload.locks ?? []);
}

function applyChanged(payload: KanbanLockChangedPayload): void {
	const store = useKanbanTaskLocksStore.getState();
	if (payload.type === "acquired") {
		store.upsertLock(payload.lock);
		return;
	}
	store.removeLock(payload.taskId);
}

function applySync(payload: KanbanSyncPayload): void {
	if (!payload?.boardId) return;
	for (const listener of syncListeners) listener(payload);
}

function bindSocketListeners(next: Socket): void {
	bindSocketIoDebugLog(next, "kanban");
	bindServerStatusSocket(next);
	next.on(KANBAN_WS_EVENTS.snapshot, applySnapshot);
	next.on(KANBAN_WS_EVENTS.changed, applyChanged);
	next.on(KANBAN_WS_EVENTS.sync, applySync);
}

function asJoinAck(raw: unknown): KanbanLockJoinAck {
	if (!raw || typeof raw !== "object") {
		return { ok: false, message: "Не удалось захватить блокировку" };
	}
	const rec = raw as Record<string, unknown>;
	if ("ok" in rec) return rec as KanbanLockJoinAck;
	if (rec.data && typeof rec.data === "object") return asJoinAck(rec.data);
	return { ok: false, message: "Не удалось захватить блокировку" };
}

export function connectKanbanSocket(label: string): Socket {
	lockedByLabel = label.trim() || "Пользователь";
	const pageOrigin =
		typeof window !== "undefined"
			? window.location.origin
			: "http://localhost:8004";
	const target = resolveV2EditLockSocketTarget(
		getSmartAnketaApiBaseUrl(),
		pageOrigin,
		KANBAN_WS_NAMESPACE,
	);
	if (
		socket &&
		socketTarget &&
		(socketTarget.uri !== target.uri || socketTarget.path !== target.path)
	) {
		disconnectKanbanSocket();
	}
	if (socket) {
		socket.auth = handshakeAuth();
		logSocketIoAction("kanban", "reuse", {
			id: socket.id ?? null,
			connected: socket.connected,
			label: lockedByLabel,
		});
		if (!socket.connected) socket.connect();
		return socket;
	}
	logSocketIoAction("kanban", "connect", {
		uri: target.uri,
		path: target.path,
		label: lockedByLabel,
		auth: handshakeAuth(),
	});
	socketTarget = target;
	socket = io(target.uri, {
		path: target.path,
		transports: ["polling", "websocket"],
		autoConnect: true,
		reconnection: true,
		auth: (cb) => {
			cb(handshakeAuth());
		},
	});
	bindSocketListeners(socket);
	return socket;
}

export function disconnectKanbanSocket(): void {
	if (!socket) return;
	logSocketIoAction("kanban", "disconnect", {
		id: socket.id ?? null,
		connected: socket.connected,
	});
	socket.removeAllListeners();
	socket.disconnect();
	socket = null;
	socketTarget = null;
	useKanbanTaskLocksStore.getState().setLocks([]);
}

export function getKanbanSocket(): Socket | null {
	return socket;
}

export function subscribeKanbanBoardSync(
	listener: (payload: KanbanSyncPayload) => void,
): () => void {
	syncListeners.add(listener);
	return () => {
		syncListeners.delete(listener);
	};
}

async function whenConnected(client: Socket): Promise<Socket> {
	if (client.connected) return client;
	return new Promise((resolve, reject) => {
		const timer = window.setTimeout(() => {
			client.off("connect", onConnect);
			client.off("connect_error", onError);
			reject(new Error("Не удалось подключить канал трекера"));
		}, JOIN_TIMEOUT_MS);
		const onConnect = () => {
			window.clearTimeout(timer);
			client.off("connect_error", onError);
			resolve(client);
		};
		const onError = (error: Error) => {
			window.clearTimeout(timer);
			client.off("connect", onConnect);
			reject(error);
		};
		client.once("connect", onConnect);
		client.once("connect_error", onError);
	});
}

export async function joinKanbanTaskEditLock(
	taskId: string,
	label?: string,
): Promise<KanbanLockJoinAck> {
	if (label?.trim()) lockedByLabel = label.trim();
	const client = socket ?? connectKanbanSocket(lockedByLabel);
	const live = await whenConnected(client);
	const raw = await live
		.timeout(JOIN_TIMEOUT_MS)
		.emitWithAck(KANBAN_WS_EVENTS.join, {
			taskId,
			lockedByLabel,
		});
	return asJoinAck(raw);
}

export async function leaveKanbanTaskEditLock(taskId: string): Promise<void> {
	const client = socket;
	if (!client?.connected) return;
	try {
		await client
			.timeout(JOIN_TIMEOUT_MS)
			.emitWithAck(KANBAN_WS_EVENTS.leave, { taskId });
	} catch {
		client.emit(KANBAN_WS_EVENTS.leave, { taskId });
	}
}
