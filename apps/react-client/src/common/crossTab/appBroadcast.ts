const APP_SYNC_CHANNEL = "smart-anketa:app-sync:v1";
const TAB_ID_KEY = "smart-anketa:tab-id";

export type AppQueryScope =
	| "v2-templates"
	| "v2-dictionaries"
	| "v2-questionnaires"
	| "v2-all"
	| "tracker"
	| "tracker-lock";

export type AppSyncEvent =
	| {
			type: "auth:logout";
			reason: "user" | "session-expired" | "refresh-failed";
		}
	| { type: "auth:session-changed" }
	| { type: "query:invalidate"; scope: AppQueryScope; entityId?: string }
	| { type: "settings:theme"; mode: "light" | "dark" }
	| {
			type: "tracker:lock-changed";
			taskId: string;
			action: "acquired" | "released" | "blocked";
		}
	| {
			type: "schema:server-version-changed";
			templateId: string;
			versionId: string;
			action: "save" | "publish" | "activate";
		};

export type AppSyncEnvelope = {
	sourceTabId: string;
	sentAt: number;
	event: AppSyncEvent;
};

type AppSyncListener = (event: AppSyncEvent) => void;

let channel: BroadcastChannel | null = null;
let channelUnavailable = false;
const listeners = new Set<AppSyncListener>();

function getTabId(): string {
	if (typeof sessionStorage === "undefined") return "server";
	const current = sessionStorage.getItem(TAB_ID_KEY);
	if (current) return current;
	const next =
		typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
			? crypto.randomUUID()
			: `${Date.now()}-${Math.random()}`;
	sessionStorage.setItem(TAB_ID_KEY, next);
	return next;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function isAppSyncEnvelope(value: unknown): value is AppSyncEnvelope {
	if (!isRecord(value) || !isRecord(value.event)) return false;
	if (
		typeof value.sourceTabId !== "string" ||
		typeof value.sentAt !== "number" ||
		typeof value.event.type !== "string"
	) {
		return false;
	}

	switch (value.event.type) {
		case "auth:logout":
			return ["user", "session-expired", "refresh-failed"].includes(
				String(value.event.reason),
			);
		case "auth:session-changed":
			return true;
		case "query:invalidate":
			return [
				"v2-templates",
				"v2-dictionaries",
				"v2-questionnaires",
				"v2-all",
				"tracker",
				"tracker-lock",
			].includes(String(value.event.scope));
		case "settings:theme":
			return value.event.mode === "light" || value.event.mode === "dark";
		case "tracker:lock-changed":
			return (
				typeof value.event.taskId === "string" &&
				["acquired", "released", "blocked"].includes(
					String(value.event.action),
				)
			);
		case "schema:server-version-changed":
			return (
				typeof value.event.templateId === "string" &&
				typeof value.event.versionId === "string" &&
				["save", "publish", "activate"].includes(String(value.event.action))
			);
		default:
			return false;
	}
}

function ensureChannel(): BroadcastChannel | null {
	if (channel || channelUnavailable || typeof BroadcastChannel === "undefined") {
		return channel;
	}
	try {
		channel = new BroadcastChannel(APP_SYNC_CHANNEL);
		channel.addEventListener("message", (message: MessageEvent<unknown>) => {
			if (!isAppSyncEnvelope(message.data)) return;
			if (message.data.sourceTabId === getTabId()) return;
			for (const listener of listeners) {
				listener(message.data.event);
			}
		});
	} catch {
		channelUnavailable = true;
	}
	return channel;
}

export function publishAppSync(event: AppSyncEvent): void {
	ensureChannel()?.postMessage({
		sourceTabId: getTabId(),
		sentAt: Date.now(),
		event,
	} satisfies AppSyncEnvelope);
}

export function subscribeAppSync(listener: AppSyncListener): () => void {
	listeners.add(listener);
	ensureChannel();
	return () => {
		listeners.delete(listener);
	};
}
