import { io, type Socket } from "socket.io-client";
import {
	V2_EDIT_LOCK_WS_EVENTS,
	type V2EditLockChangedPayload,
	type V2EditLockJoinAck,
	type V2EditLockSnapshotPayload,
} from "@smart-anketa/api-contract";
import {
	isGodModeAccessToken,
	isNoRolesGodMode,
} from "@react-client/common/auth/godMode";
import { resolveFreshAccessToken } from "@react-client/common/auth/syncMfeAuth";
import { useGlobalSettingsStore } from "@react-client/common/store/globalSettingsStore";
import { useQuestionnaireEditLocksStore } from "../stores/questionnaireEditLocksStore";
import { resolveV2EditLockSocketTarget } from "./v2EditLockSocketTarget";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:3000";
const IS_DEV = process.env.NODE_ENV === "development";
const JOIN_TIMEOUT_MS = 8_000;

let socket: Socket | null = null;
let lockedByLabel = "Пользователь";

function resolveApiBaseUrl(): string {
	const fromConfig =
		useGlobalSettingsStore.getState().configMap?.SMART_ANKETA_API;
	return (IS_DEV ? API_BASE_URL : fromConfig || API_BASE_URL).replace(
		/\/$/,
		"",
	);
}

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

function applySnapshot(payload: V2EditLockSnapshotPayload): void {
	const store = useQuestionnaireEditLocksStore.getState();
	store.setLocks(payload.locks ?? []);
	store.setExportBusy(Boolean(payload.exportLock?.busy));
}

function applyChanged(payload: V2EditLockChangedPayload): void {
	const store = useQuestionnaireEditLocksStore.getState();
	if (payload.type === "export") {
		store.setExportBusy(payload.lock.busy);
		return;
	}
	if (payload.type === "acquired") {
		store.upsertLock(payload.lock);
		return;
	}
	store.removeLock(payload.questionnaireId);
}

function bindSocketListeners(next: Socket): void {
	next.on(V2_EDIT_LOCK_WS_EVENTS.snapshot, applySnapshot);
	next.on(V2_EDIT_LOCK_WS_EVENTS.changed, applyChanged);
}

function asJoinAck(raw: unknown): V2EditLockJoinAck {
	if (!raw || typeof raw !== "object") {
		return { ok: false, message: "Не удалось захватить блокировку" };
	}
	const rec = raw as Record<string, unknown>;
	if ("ok" in rec) return rec as V2EditLockJoinAck;
	if (rec.data && typeof rec.data === "object") return asJoinAck(rec.data);
	return { ok: false, message: "Не удалось захватить блокировку" };
}

export function connectV2EditLockSocket(label: string): Socket {
	lockedByLabel = label.trim() || "Пользователь";
	if (socket) {
		socket.auth = handshakeAuth();
		if (!socket.connected) socket.connect();
		return socket;
	}
	const pageOrigin =
		typeof window !== "undefined"
			? window.location.origin
			: "http://localhost:8004";
	const { uri, path } = resolveV2EditLockSocketTarget(
		resolveApiBaseUrl(),
		pageOrigin,
	);
	socket = io(uri, {
		path,
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

export function disconnectV2EditLockSocket(): void {
	if (!socket) return;
	socket.removeAllListeners();
	socket.disconnect();
	socket = null;
	const store = useQuestionnaireEditLocksStore.getState();
	store.setLocks([]);
	store.setExportBusy(false);
}

export function getV2EditLockSocket(): Socket | null {
	return socket;
}

async function whenConnected(client: Socket): Promise<Socket> {
	if (client.connected) return client;
	return new Promise((resolve, reject) => {
		const timer = window.setTimeout(() => {
			client.off("connect", onConnect);
			client.off("connect_error", onError);
			reject(new Error("Не удалось подключить канал блокировок"));
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

export async function joinV2QuestionnaireEditLock(
	questionnaireId: string,
	label?: string,
): Promise<V2EditLockJoinAck> {
	if (label?.trim()) lockedByLabel = label.trim();
	const client = socket ?? connectV2EditLockSocket(lockedByLabel);
	const live = await whenConnected(client);
	const raw = await live
		.timeout(JOIN_TIMEOUT_MS)
		.emitWithAck(V2_EDIT_LOCK_WS_EVENTS.join, {
			questionnaireId,
			lockedByLabel,
		});
	return asJoinAck(raw);
}

export async function leaveV2QuestionnaireEditLock(
	questionnaireId: string,
): Promise<void> {
	const client = socket;
	if (!client?.connected) return;
	try {
		await client
			.timeout(JOIN_TIMEOUT_MS)
			.emitWithAck(V2_EDIT_LOCK_WS_EVENTS.leave, { questionnaireId });
	} catch {
		client.emit(V2_EDIT_LOCK_WS_EVENTS.leave, { questionnaireId });
	}
}
