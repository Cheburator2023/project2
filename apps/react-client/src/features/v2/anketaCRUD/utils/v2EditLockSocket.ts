import { io, type Socket } from "socket.io-client";
import {
	V2_EDIT_LOCK_WS_EVENTS,
	type V2EditLockChangedPayload,
	type V2EditLockJoinAck,
	type V2EditLockSnapshotPayload,
	type V2QuestionnaireExportJobStatusDto,
	type V2QuestionnaireRegistrySyncPayload,
	type V2TemplateReadyPayload,
} from "@smart-anketa/api-contract";
import {
	isGodModeAccessToken,
	isNoRolesGodMode,
} from "@react-client/common/auth/godMode";
import { resolveFreshAccessToken } from "@react-client/common/auth/syncMfeAuth";
import { apiClient, API_REGISTRY_EXPORT_TIMEOUT_MS } from "@react-client/common/api/helpers/apiClient";
import { useGlobalSettingsStore } from "@react-client/common/store/globalSettingsStore";
import { useUserStore } from "@react-client/common/store/userStore";
import { useQuestionnaireEditLocksStore } from "../stores/questionnaireEditLocksStore";
import { resolveV2EditLockSocketTarget } from "./v2EditLockSocketTarget";
import { bindServerStatusSocket } from "@react-client/common/serverStatus/bindServerStatusSocket";
import {
	bindSocketIoDebugLog,
	logSocketIoAction,
} from "@react-client/common/websocket/bindSocketIoDebugLog";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:3000";
const IS_DEV = process.env.NODE_ENV === "development";
const JOIN_TIMEOUT_MS = 8_000;

let socket: Socket | null = null;
let lockedByLabel = "Пользователь";

const exportJobsById = new Map<string, V2QuestionnaireExportJobStatusDto>();
const exportJobListeners = new Set<
	(job: V2QuestionnaireExportJobStatusDto) => void
>();
const templateReadyListeners = new Set<
	(payload: V2TemplateReadyPayload) => void
>();
const registrySyncListeners = new Set<
	(payload: V2QuestionnaireRegistrySyncPayload) => void
>();

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

function applyExportJob(job: V2QuestionnaireExportJobStatusDto): void {
	if (!job?.jobId) return;
	exportJobsById.set(job.jobId, job);
	for (const listener of exportJobListeners) listener(job);
}

function applyTemplateReady(payload: V2TemplateReadyPayload): void {
	if (!payload?.templateId) return;
	for (const listener of templateReadyListeners) listener(payload);
}

function applyRegistrySync(payload: V2QuestionnaireRegistrySyncPayload): void {
	for (const listener of registrySyncListeners) listener(payload);
}

function applySnapshot(payload: V2EditLockSnapshotPayload): void {
	const store = useQuestionnaireEditLocksStore.getState();
	store.setLocks(payload.locks ?? []);
	store.setExportBusy(Boolean(payload.exportLock?.busy));
	for (const job of payload.exportJobs ?? []) applyExportJob(job);
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
	bindSocketIoDebugLog(next, "v2-edit-locks");
	bindServerStatusSocket(next);
	next.on(V2_EDIT_LOCK_WS_EVENTS.snapshot, applySnapshot);
	next.on(V2_EDIT_LOCK_WS_EVENTS.changed, applyChanged);
	next.on(V2_EDIT_LOCK_WS_EVENTS.exportJob, applyExportJob);
	next.on(V2_EDIT_LOCK_WS_EVENTS.templateReady, applyTemplateReady);
	next.on(V2_EDIT_LOCK_WS_EVENTS.registrySync, applyRegistrySync);
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

function defaultLockLabel(): string {
	return useUserStore.getState().username?.trim() || "Пользователь";
}

export function connectV2EditLockSocket(label: string): Socket {
	lockedByLabel = label.trim() || "Пользователь";
	if (socket) {
		socket.auth = handshakeAuth();
		logSocketIoAction("v2-edit-locks", "reuse", {
			id: socket.id ?? null,
			connected: socket.connected,
			label: lockedByLabel,
		});
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
	logSocketIoAction("v2-edit-locks", "connect", {
		uri,
		path,
		label: lockedByLabel,
		auth: handshakeAuth(),
	});
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

function requireSocket(): Socket {
	return socket ?? connectV2EditLockSocket(defaultLockLabel());
}

export function disconnectV2EditLockSocket(): void {
	if (!socket) return;
	logSocketIoAction("v2-edit-locks", "disconnect", {
		id: socket.id ?? null,
		connected: socket.connected,
	});
	socket.removeAllListeners();
	socket.disconnect();
	socket = null;
	exportJobsById.clear();
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

function isTerminalExportJob(
	job: V2QuestionnaireExportJobStatusDto,
): boolean {
	return job.status === "done" || job.status === "failed";
}

async function fetchExportJobStatus(
	jobId: string,
	signal?: AbortSignal,
): Promise<V2QuestionnaireExportJobStatusDto> {
	return apiClient<V2QuestionnaireExportJobStatusDto>({
		url: `/v2/questionnaires/export/${jobId}/status`,
		method: "GET",
		signal,
	});
}

/** Один HTTP-status на старте/reconnect, дальше только `export:job`. */
export async function waitForV2ExportJob(
	jobId: string,
	options?: {
		signal?: AbortSignal;
		timeoutMs?: number;
		onStatus?: (status: V2QuestionnaireExportJobStatusDto) => void;
	},
): Promise<V2QuestionnaireExportJobStatusDto> {
	const timeoutMs = options?.timeoutMs ?? API_REGISTRY_EXPORT_TIMEOUT_MS;
	const client = requireSocket();

	return new Promise((resolve, reject) => {
		let settled = false;
		const timer = window.setTimeout(() => {
			if (settled) return;
			settled = true;
			cleanup();
			reject(new Error("Экспорт не завершился вовремя"));
		}, timeoutMs);

		const onJob = (job: V2QuestionnaireExportJobStatusDto) => {
			if (settled || job.jobId !== jobId) return;
			options?.onStatus?.(job);
			if (!isTerminalExportJob(job)) return;
			settled = true;
			cleanup();
			if (job.status === "failed") {
				reject(new Error(job.error || "Экспорт завершился с ошибкой"));
				return;
			}
			resolve(job);
		};

		const onReconnect = () => {
			if (settled) return;
			void fetchExportJobStatus(jobId, options?.signal)
				.then(onJob)
				.catch(() => undefined);
		};

		const onAbort = () => {
			if (settled) return;
			settled = true;
			cleanup();
			reject(new DOMException("Aborted", "AbortError"));
		};

		function cleanup() {
			window.clearTimeout(timer);
			exportJobListeners.delete(onJob);
			client.io.off("reconnect", onReconnect);
			options?.signal?.removeEventListener("abort", onAbort);
		}

		if (options?.signal?.aborted) {
			cleanup();
			reject(new DOMException("Aborted", "AbortError"));
			return;
		}

		exportJobListeners.add(onJob);
		client.io.on("reconnect", onReconnect);
		options?.signal?.addEventListener("abort", onAbort);

		const cached = exportJobsById.get(jobId);
		if (cached) {
			onJob(cached);
			if (isTerminalExportJob(cached)) return;
		}

		void whenConnected(client)
			.then(() => fetchExportJobStatus(jobId, options?.signal))
			.then(onJob)
			.catch((error) => {
				if (settled) return;
				if (options?.signal?.aborted) {
					onAbort();
					return;
				}
				if (cached) return;
				if (error instanceof Error && error.name === "AbortError") {
					onAbort();
				}
			});
	});
}

/** Ждёт `template:ready` с typicalWorksReady=true или error. Стартовый false игнорируется. */
export async function waitForV2TemplateReady(
	templateId: string,
	options?: { signal?: AbortSignal; timeoutMs?: number },
): Promise<V2TemplateReadyPayload> {
	const timeoutMs = options?.timeoutMs ?? 600_000;
	requireSocket();

	return new Promise((resolve, reject) => {
		let settled = false;
		const timer = window.setTimeout(() => {
			if (settled) return;
			settled = true;
			cleanup();
			reject(new Error("Не удалось дождаться загрузки типовых работ"));
		}, timeoutMs);

		const onReady = (payload: V2TemplateReadyPayload) => {
			if (settled || payload.templateId !== templateId) return;
			if (payload.error) {
				settled = true;
				cleanup();
				reject(new Error(payload.error));
				return;
			}
			if (!payload.typicalWorksReady) return;
			settled = true;
			cleanup();
			resolve(payload);
		};

		const onAbort = () => {
			if (settled) return;
			settled = true;
			cleanup();
			reject(new DOMException("Aborted", "AbortError"));
		};

		function cleanup() {
			window.clearTimeout(timer);
			templateReadyListeners.delete(onReady);
			options?.signal?.removeEventListener("abort", onAbort);
		}

		if (options?.signal?.aborted) {
			cleanup();
			reject(new DOMException("Aborted", "AbortError"));
			return;
		}

		templateReadyListeners.add(onReady);
		options?.signal?.addEventListener("abort", onAbort);
		void whenConnected(requireSocket()).catch((error) => {
			if (settled) return;
			settled = true;
			cleanup();
			reject(error);
		});
	});
}

export function subscribeV2QuestionnaireRegistrySync(
	listener: (payload: V2QuestionnaireRegistrySyncPayload) => void,
): () => void {
	registrySyncListeners.add(listener);
	return () => {
		registrySyncListeners.delete(listener);
	};
}
